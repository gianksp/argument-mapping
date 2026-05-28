import { useState, useEffect, useRef, useCallback } from 'react'
import { makeDefaultGraph } from './store.js'
import { screenToWorld } from './utils/utils.js'
import { useAuth } from './AuthContext.jsx'
import { supabase } from './supabase.js'
import { useHistory } from './hooks/useHistory.js'
import { usePersist } from './hooks/usePersist.js'
import { useCanvasInteractions } from './hooks/useCanvasInteractions.js'
import { useGraphMutations } from './hooks/useGraphMutations.js'
import { useNodeRects } from './hooks/useNodeRects.js'
import { useFitToScreen } from './hooks/useFitToScreen.js'
import MapHeader from './components/MapHeader.jsx'
import MapCanvas from './components/MapCanvas.jsx'

export default function App({ mapId }) {
  const { user, signOut } = useAuth()

  const [graph, setGraph] = useState(null)
  const [ownerId, setOwnerId] = useState(null)
  const [status, setStatus] = useState('loading')
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [contextMenu, setContextMenu] = useState(null)
  const [ready, setReady] = useState(false)
  const [, forceRender] = useState(0)

  const isNew = !graph?.id
  const isOwner = (user && ownerId && user.id === ownerId) || (isNew && !!user)

  const viewportRef = useRef(null)
  const fileInputRef = useRef(null)
  const nodeElsRef = useRef({})
  const drag = useRef(null)
  const resize = useRef(null)
  const pan = useRef(null)

  const { push, undo: _undo, redo: _redo, canUndo, canRedo } = useHistory()

  const undo = useCallback(() => {
    _undo(graph, setGraph)
    forceRender(n => n + 1)
  }, [graph, _undo])

  const redo = useCallback(() => {
    _redo(graph, setGraph)
    forceRender(n => n + 1)
  }, [graph, _redo])

  const fitToScreen = useFitToScreen(viewportRef, setView)
  const nodeRects = useNodeRects(graph?.nodes, nodeElsRef)

  const { deleteNode, spawnNode, addThesisAt, changeNodeText, handleTextCommit, autoLayout } =
    useGraphMutations({ graph, setGraph, push })

  usePersist({ graph, setGraph, setOwnerId, setStatus, user })

  const { handleViewportMouseDown, handleResizeStart, handleWheel } =
    useCanvasInteractions({ viewportRef, view, setView, setGraph, graph, drag, resize, pan })

  // ── session ────────────────────────────────────────────────────────────────
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

  // ── keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = e => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [undo, redo])

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

  // ── guards ─────────────────────────────────────────────────────────────────
  if (!ready || status === 'loading') {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading…</div>
  }
  if (status === 'error' && !graph) {
    return <div className="flex h-screen items-center justify-center text-red-500">Map not found.</div>
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <MapHeader
        user={user}
        graph={graph}
        status={status}
        isOwner={isOwner}
        onTitleChange={title => setGraph(g => ({ ...g, title }))}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo()}
        canRedo={canRedo()}
        onAutoLayout={autoLayout}
        onImport={() => fileInputRef.current.click()}
        onExport={exportJSON}
        onFit={() => fitToScreen(graph.nodes)}
        onCopyURL={() => navigator.clipboard.writeText(location.href)}
        onSignOut={signOut}
        fileInputRef={fileInputRef}
        onFileChange={importJSON}
      />

      <MapCanvas
        graph={graph}
        view={view}
        nodeRects={nodeRects}
        isOwner={isOwner}
        onMouseDown={handleViewportMouseDown}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onDelete={deleteNode}
        onSpawn={spawnNode}
        onTextChange={changeNodeText}
        onTextCommit={handleTextCommit}
        onResizeStart={handleResizeStart}
        nodeElsRef={nodeElsRef}
        drag={drag}
        viewportRef={viewportRef}
      />

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
    </div>
  )
}