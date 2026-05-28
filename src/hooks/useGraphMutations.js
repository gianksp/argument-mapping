import { useCallback, useEffect, useRef } from 'react'
import { getDescendants, computeAutoLayout } from '../utils/utils.js'

export function useGraphMutations({ graph, setGraph, push }) {
    const layoutPending = useRef(false)
    const graphRef = useRef(graph)

    useEffect(() => { graphRef.current = graph }, [graph])

    const mutate = useCallback(fn => {
        setGraph(g => {
            const next = { ...g, nodes: [...g.nodes], edges: [...g.edges] }
            fn(next)
            return next
        })
    }, [])

    const applyLayout = useCallback(() => {
        mutate(g => computeAutoLayout(g.nodes, g.edges))
    }, [mutate])

    const autoLayout = useCallback(() => {
        push(graphRef.current)
        mutate(g => computeAutoLayout(g.nodes, g.edges))
    }, [mutate, push])

    const deleteNode = useCallback(id => {
        push(graphRef.current)
        layoutPending.current = true
        mutate(g => {
            const ids = new Set([id, ...getDescendants(id, g.edges)])
            g.nodes = g.nodes.filter(n => !ids.has(n.id))
            g.edges = g.edges.filter(e => !ids.has(e.from) && !ids.has(e.to))
        })
    }, [mutate, push])

    const spawnNode = useCallback((parentId, requestedType) => {
        push(graphRef.current)
        layoutPending.current = true
        mutate(g => {
            const parent = g.nodes.find(n => n.id === parentId)
            if (!parent) return
            const type = parent.type === 'objection' && requestedType === 'reason' ? 'rebuttal' : requestedType
            const existingChildren = g.edges.filter(e => e.to === parentId)
            const childCount = existingChildren.length
            const parentW = parent.w || 288
            const childW = 288
            const gap = 40
            const offset = childCount === 0 ? 0 : (type === 'objection' ? 1 : -1) * (childW + gap) * Math.ceil(childCount / 2)
            const child = {
                id: crypto.randomUUID(), type,
                text: type === 'rebuttal' ? 'New rebuttal' : type === 'reason' ? 'New reason' : 'New objection',
                x: parent.x + parentW / 2 - childW / 2 + offset,
                y: parent.y + (parent.h || 58) + 130,
                w: childW, h: 58,
            }
            g.nodes.push(child)
            g.edges.push({ from: child.id, to: parentId, type })
        })
    }, [mutate, push])

    const addThesisAt = useCallback((x, y) => {
        push(graphRef.current)
        layoutPending.current = true
        mutate(g => {
            g.nodes.push({ id: crypto.randomUUID(), type: 'thesis', text: 'New thesis / conclusion', x, y, w: 288, h: 58 })
        })
    }, [mutate, push])

    const changeNodeText = useCallback((id, text) => {
        setGraph(g => ({ ...g, nodes: g.nodes.map(n => n.id === id ? { ...n, text } : n) }))
    }, [setGraph])

    // called on blur — push pre-edit snapshot so undo restores text before edit
    const handleTextCommit = useCallback((id, type) => {
        if (type === 'focus') {
            push(graphRef.current)
        }
    }, [push])

    useEffect(() => {
        if (layoutPending.current) {
            layoutPending.current = false
            applyLayout()
        }
    }, [graph?.nodes.length, graph?.edges.length])

    return { mutate, deleteNode, spawnNode, addThesisAt, changeNodeText, handleTextCommit, autoLayout }
}