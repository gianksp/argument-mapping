import { useEffect, useCallback } from 'react'
import { screenToWorld } from '../utils/utils.js'

export function useCanvasInteractions({ viewportRef, view, setView, setGraph, graph, drag, resize, pan }) {

    const handleViewportMouseDown = useCallback(e => {
        if (e.button !== 0) return
        if (e.target.closest('[data-resize]')) return
        const nodeEl = e.target.closest('[data-nodeid]')
        if (nodeEl && !e.target.closest('button') && !e.target.isContentEditable) {
            const id = nodeEl.dataset.nodeid
            const node = graph?.nodes.find(n => n.id === id); if (!node) return
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
        resize.current = {
            nodeId: node.id,
            startX: e.clientX, startY: e.clientY,
            startW: node.w || 288, startH: node.h || 58,
        }
    }, [])

    const handleWheel = useCallback(e => {
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
    }, [])

    useEffect(() => {
        const onMove = e => {
            if (resize.current) {
                const { nodeId, startX, startY, startW, startH } = resize.current
                const dx = (e.clientX - startX) / view.scale
                const dy = (e.clientY - startY) / view.scale
                setGraph(g => ({
                    ...g,
                    nodes: g.nodes.map(n => n.id === nodeId
                        ? { ...n, w: Math.max(180, startW + dx), h: Math.max(70, startH + dy) }
                        : n)
                }), false)
                return
            }
            if (drag.current) {
                const { nodeId, offsetX, offsetY } = drag.current
                const vp = viewportRef.current?.getBoundingClientRect(); if (!vp) return
                const pt = screenToWorld(e.clientX, e.clientY, vp, view)
                setGraph(g => ({
                    ...g,
                    nodes: g.nodes.map(n => n.id === nodeId
                        ? { ...n, x: pt.x - offsetX, y: pt.y - offsetY }
                        : n)
                }), false)
                return
            }
            if (pan.current) {
                const { startX, startY, viewX, viewY } = pan.current
                setView(v => ({ ...v, x: viewX + e.clientX - startX, y: viewY + e.clientY - startY }))
            }
        }

        const onUp = () => {
            if (drag.current || resize.current) {
                setGraph(g => g) // commit final position to history
            }
            drag.current = null
            resize.current = null
            pan.current = null
        }

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        return () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
    }, [view])

    return { handleViewportMouseDown, handleResizeStart, handleWheel }
}