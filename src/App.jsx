import { useState, useEffect, useRef, useCallback } from 'react'
import { saveMap, createMap, makeDefaultGraph } from './store.js'
import { screenToWorld, getDescendants, computeAutoLayout } from './utils/utils.js'
import { useAuth } from './AuthContext.jsx'
import { supabase } from './supabase.js'
import Edges from './components/Edges.jsx'
import Node from './components/Node.jsx'

export default function App({ mapId }) {
  const { user, signOut } = useAuth()

  const [graph, setGraph] = useState(null)
  const [ownerId, setOwnerId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [contextMenu, setContextMenu] = useState(null)
  const [nodeRects, setNodeRects] = useState({})
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [ready, setReady] = useState(false)

  const isNew = !graph?.id
  const isOwner = (user && ownerId && user.id === ownerId) || (isNew && !!user)

  const viewportRef = useRef(null)
  const fileInputRef = useRef(null)
  const nodeElsRef = useRef({})
  const layoutPending = useRef(false)
  const drag = useRef(null)
  const resize = useRef(null)
  const pan = useRef(null)
  const persistRef = useRef(null)
  const saveTimer = useRef(null)
  const graphRef = useRef(null)

  // ── fit to screen ──────────────────────────────────────────────────────────
  const fitToScreen = useCallback((nodes) => {
    if (!nodes?.length || !viewportRef.current) return
    const vp = viewportRef.current.getBoundingClientRect()

    const minX = Math.min(...nodes.map(n => n.x))
    const minY = Math.min(...nodes.map(n => n.y))
    const maxX = Math.max(...nodes.map(n => n.x + (n.w || 288)))
    const maxY = Math.max(...nodes.map(n => n.y + (n.h || 58)))

    const contentW = maxX - minX
    const contentH = maxY - minY
    const padding = 80

    const scaleX = (vp.width - padding * 2) / contentW
    const scaleY = (vp.height - padding * 2) / contentH
    const scale = Math.min(scaleX, scaleY, 1.5)

    const x = (vp.width - contentW * scale) / 2 - minX * scale
    const y = (vp.height - contentH * scale) / 2 - minY * scale

    setView({ x, y, scale })
  }, [])

  // ── wait for session ───────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(() => setReady(true))
  }, [])

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return
    if (mapId) {
      supabase.from('maps').select('data, user_id').eq('id', mapId).single()
        .then(({ data, error }) => {
          if (error) { setStatus('error'); return }
          setGraph(data.data)
          setOwnerId(data.user_id)
          setStatus('ready')
          setTimeout(() => fitToScreen(data.data.nodes), 50)
        })
    } else {
      const g = makeDefaultGraph()
      setGraph(g)
      setOwnerId(user?.id ?? null)
      setStatus('ready')
      setTimeout(() => fitToScreen(g.nodes), 50)
    }
  }, [ready, mapId])

  // ── persist ───────────────────────────────────────────────────────────────
  const persist = useCallback(async (g) => {
    if (!g) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setStatus('saving')
    try {
      if (!g.id) {
        const id = await createMap(g, session.user.id)
        setGraph(prev => ({ ...prev, id }))
        setOwnerId(session.user.id)
        history.replaceState(null, '', `/map/${id}`)
      } else {
        await saveMap(g)
      }
      setStatus('ready')
    } catch (e) {
      console.error('save error', e)
      setStatus('error')
    }
  }, [user])

  useEffect(() => { persistRef.current = persist }, [persist])

  const scheduleSave = useCallback((g) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persistRef.current?.(g), 1500)
  }, [])

  useEffect(() => {
    if (!graph || status === 'loading') return
    if (graphRef.current === graph) return
    graphRef.current = graph
    scheduleSave(graph)
  }, [graph])

  // ── node rect measurement ──────────────────────────────────────────────────
  useEffect(() => {
    if (!graph) return
    const rects = {}
    const observers = []
    graph.nodes.forEach(n => {
      const el = nodeElsRef.current[n.id]
      if (!el) return
      rects[n.id] = { w: el.offsetWidth, h: el.offsetHeight }
      const ro = new ResizeObserver(() => {
        setNodeRects(prev => ({ ...prev, [n.id]: { w: el.offsetWidth, h: el.offsetHeight } }))
      })
      ro.observe(el)
      observers.push(ro)
    })
    setNodeRects(rects)
    return () => observers.forEach(ro => ro.disconnect())
  }, [graph?.nodes])

  // ── mutations ──────────────────────────────────────────────────────────────
  const mutate = useCallback(fn => {
    setGraph(g => {
      const next = { ...g, nodes: [...g.nodes], edges: [...g.edges] }
      fn(next)
      return next
    })
  }, [])

  const deleteNode = useCallback(id => {
    layoutPending.current = true
    mutate(g => {
      const ids = new Set([id, ...getDescendants(id, g.edges)])
      g.nodes = g.nodes.filter(n => !ids.has(n.id))
      g.edges = g.edges.filter(e => !ids.has(e.from) && !ids.has(e.to))
    })
  }, [mutate])

  const spawnNode = useCallback((parentId, requestedType) => {
    layoutPending.current = true
    mutate(g => {
      const parent = g.nodes.find(n => n.id === parentId)
      if (!parent) return
      const type = parent.type === 'objection' && requestedType === 'reason' ? 'rebuttal' : requestedType
      const siblings = g.edges.filter(e => e.to === parentId).length
      const child = {
        id: crypto.randomUUID(), type,
        text: type === 'rebuttal' ? 'New rebuttal' : type === 'reason' ? 'New reason' : 'New objection',
        x: parent.x + (type === 'objection' ? 260 : -260) + siblings * 30,
        y: parent.y + 190, w: 288, h: 58,
      }
      g.nodes.push(child)
      g.edges.push({ from: child.id, to: parentId, type })
    })
  }, [mutate])

  const addThesisAt = useCallback((x, y) => {
    layoutPending.current = true
    mutate(g => {
      g.nodes.push({ id: crypto.randomUUID(), type: 'thesis', text: 'New thesis / conclusion', x, y, w: 288, h: 58 })
    })
  }, [mutate])

  const changeNodeText = useCallback((id, text) => {
    setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, text } : n) }))
  }, [])

  const autoLayout = useCallback(() => {
    mutate(g => computeAutoLayout(g.nodes, g.edges))
  }, [mutate])

  useEffect(() => {
    if (layoutPending.current) {
      layoutPending.current = false
      autoLayout()
    }
  }, [graph?.nodes.length, graph?.edges.length, autoLayout])

  // ── export / import ────────────────────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${graph.title || 'argument-map'}.json`
    a.click()
  }

  const importJSON = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const imported = JSON.parse(ev.target.result)
      imported.id = null
      imported.title = imported.title || 'Untitled Argument Map'
      imported.nodes = imported.nodes || []
      imported.edges = imported.edges || []
      setGraph(imported)
      setTimeout(() => fitToScreen(imported.nodes), 50)
    }
    reader.readAsText(file)
  }

  const copyShareURL = () => navigator.clipboard.writeText(location.href)

  // ── pointer events ─────────────────────────────────────────────────────────
  const handleViewportMouseDown = useCallback(e => {
    if (e.button !== 0) return
    if (e.target.closest('[data-resize]')) return
    const nodeEl = e.target.closest('[data-nodeid]')
    if (nodeEl && !e.target.closest('button') && !e.target.isContentEditable) {
      const id = nodeEl.dataset.nodeid
      const node = graph.nodes.find(n => n.id === id); if (!node) return
      const vp = viewportRef.current.getBoundingClientRect()
      const pt = screenToWorld(e.clientX, e.clientY, vp, view)
      drag.current = { nodeId: id, offsetX: pt.x - node.x, offsetY: pt.y - node.y }
      return
    }
    if (!e.target.closest('button') && !e.target.isContentEditable) {
      pan.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
    }
  }, [graph?.nodes, view])

  const handleResizeStart = useCallback((e, node) => {
    e.preventDefault()
    resize.current = { nodeId: node.id, startX: e.clientX, startY: e.clientY, startW: node.w || 288, startH: node.h || 58 }
  }, [])

  useEffect(() => {
    const onMove = e => {
      if (resize.current) {
        const { nodeId, startX, startY, startW, startH } = resize.current
        const dx = (e.clientX - startX) / view.scale
        const dy = (e.clientY - startY) / view.scale
        setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, w: Math.max(180, startW + dx), h: Math.max(70, startH + dy) } : n) }))
        return
      }
      if (drag.current) {
        const { nodeId, offsetX, offsetY } = drag.current
        const vp = viewportRef.current?.getBoundingClientRect(); if (!vp) return
        const pt = screenToWorld(e.clientX, e.clientY, vp, view)
        setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === nodeId ? { ...n, x: pt.x - offsetX, y: pt.y - offsetY } : n) }))
        return
      }
      if (pan.current) {
        const { startX, startY, viewX, viewY } = pan.current
        setView(v => ({ ...v, x: viewX + e.clientX - startX, y: viewY + e.clientY - startY }))
      }
    }
    const onUp = () => { drag.current = null; resize.current = null; pan.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [view])

  // ── wheel zoom — attached directly, no stale closure ──────────────────────
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()
      const vp = el.getBoundingClientRect()
      const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
      setView(v => {
        const oldScale = v.scale
        const nextScale = Math.min(3, Math.max(0.05, oldScale * (1 - delta * 0.001)))
        const mx = e.clientX - vp.left
        const my = e.clientY - vp.top
        const wx = (mx - v.x) / oldScale
        const wy = (my - v.y) / oldScale
        return { scale: nextScale, x: mx - wx * nextScale, y: my - wy * nextScale }
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ready]) // only re-attach when ready, not on every view change

  // ── context menu ───────────────────────────────────────────────────────────
  const handleContextMenu = useCallback(e => {
    e.preventDefault()
    const vp = viewportRef.current.getBoundingClientRect()
    const world = screenToWorld(e.clientX, e.clientY, vp, view)
    setContextMenu({ screenX: e.clientX, screenY: e.clientY - 64, worldX: world.x, worldY: world.y })
  }, [view])

  useEffect(() => {
    const onClick = e => { if (!e.target.closest('#ctx-menu')) setContextMenu(null) }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // ── status ─────────────────────────────────────────────────────────────────
  const statusLabel = { ready: 'Saved', saving: 'Saving…', error: 'Error saving', loading: '' }
  const statusColor = { ready: 'text-green-500', saving: 'text-slate-400', error: 'text-red-500', loading: '' }

  if (!ready || status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
  }
  if (status === 'error' && !graph) {
    return <div className="flex h-screen items-center justify-center text-red-500">Map not found.</div>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0">
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={() => location.href = '/'} className="text-slate-400 hover:text-slate-700 text-lg">←</button>
          )}
          <input
            className="text-xl font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-300 px-1 disabled:cursor-default"
            value={graph.title}
            disabled={!isOwner}
            onChange={e => setGraph(g => ({ ...g, title: e.target.value }))}
          />
          <span className={`text-sm ${statusColor[status]}`}>{statusLabel[status]}</span>
          {!isOwner && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">View only</span>
          )}
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <>
              <button onClick={autoLayout} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Auto layout</button>
              <button onClick={() => fileInputRef.current.click()} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Import</button>
              <button onClick={exportJSON} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Export</button>
            </>
          )}
          <button onClick={() => fitToScreen(graph.nodes)} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Fit</button>
          <button onClick={copyShareURL} className="px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-700">Copy share URL</button>
          {user && <button onClick={signOut} className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-100">Sign out</button>}
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={importJSON} />
        </div>
      </header>

      <main
        ref={viewportRef}
        className="relative flex-1 overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]"
        onMouseDown={handleViewportMouseDown}
        onContextMenu={isOwner ? handleContextMenu : undefined}
        onWheel={e => {
          const vp = viewportRef.current.getBoundingClientRect()
          const delta = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaY
          setView(v => {
            const oldScale = v.scale
            const nextScale = Math.min(3, Math.max(0.05, oldScale * (1 - delta * 0.001)))
            const mx = e.clientX - vp.left
            const my = e.clientY - vp.top
            const wx = (mx - v.x) / oldScale
            const wy = (my - v.y) / oldScale
            return { scale: nextScale, x: mx - wx * nextScale, y: my - wy * nextScale }
          })
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          <Edges edges={graph.edges} nodes={graph.nodes} nodeRects={nodeRects} />
          <div className="absolute left-0 top-0">
            {graph.nodes.map(node => (
              <Node
                key={node.id}
                node={node}
                edges={graph.edges}
                nodes={graph.nodes}
                nodeRef={el => { if (el) nodeElsRef.current[node.id] = el }}
                onDelete={isOwner ? deleteNode : () => { }}
                onSpawn={isOwner ? spawnNode : () => { }}
                onTextChange={isOwner ? changeNodeText : () => { }}
                onDragStart={e => {
                  if (!isOwner) return
                  if (e.target.closest('button') || e.target.isContentEditable) return
                  e.stopPropagation()
                  const vp = viewportRef.current.getBoundingClientRect()
                  const pt = screenToWorld(e.clientX, e.clientY, vp, view)
                  drag.current = { nodeId: node.id, offsetX: pt.x - node.x, offsetY: pt.y - node.y }
                }}
                onResizeStart={isOwner ? handleResizeStart : () => { }}
                readOnly={!isOwner}
              />
            ))}
          </div>
        </div>

        {contextMenu && isOwner && (
          <div
            id="ctx-menu"
            className="absolute z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-52"
            style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
          >
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100"
              onClick={() => { addThesisAt(contextMenu.worldX, contextMenu.worldY); setContextMenu(null) }}
            >
              Add thesis here
            </button>
          </div>
        )}
      </main>
    </div>
  )
}