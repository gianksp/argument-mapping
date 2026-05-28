import { useState, useEffect } from 'react'

export function useNodeRects(nodes, nodeElsRef) {
    const [nodeRects, setNodeRects] = useState({})

    useEffect(() => {
        if (!nodes) return
        const rects = {}
        const observers = []
        nodes.forEach(n => {
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
    }, [nodes])

    return nodeRects
}