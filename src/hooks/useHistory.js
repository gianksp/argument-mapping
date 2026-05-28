import { useRef, useCallback } from 'react'

const MAX = 30

export function useHistory() {
    const stack = useRef([]) // past states as JSON strings
    const future = useRef([]) // redo states as JSON strings

    const push = useCallback((graph) => {
        if (!graph) return
        const json = JSON.stringify(graph)
        // don't push duplicate
        if (stack.current[stack.current.length - 1] === json) return
        stack.current = [...stack.current.slice(-MAX), json]
        future.current = []
    }, [])

    const undo = useCallback((current, setGraph) => {
        if (!stack.current.length) return
        future.current = [JSON.stringify(current), ...future.current.slice(0, MAX)]
        const prev = stack.current[stack.current.length - 1]
        stack.current = stack.current.slice(0, -1)
        setGraph(JSON.parse(prev))
    }, [])

    const redo = useCallback((current, setGraph) => {
        if (!future.current.length) return
        stack.current = [...stack.current.slice(-MAX), JSON.stringify(current)]
        const next = future.current[0]
        future.current = future.current.slice(1)
        setGraph(JSON.parse(next))
    }, [])

    const canUndo = () => stack.current.length > 0
    const canRedo = () => future.current.length > 0

    return { push, undo, redo, canUndo, canRedo }
}