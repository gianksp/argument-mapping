import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'
import { saveMap, createMap } from '../store.js'

export function usePersist({ graph, setGraph, setOwnerId, setStatus, user }) {
    const persistRef = useRef(null)
    const saveTimer = useRef(null)
    const graphRef = useRef(null)

    const persist = useCallback(async (g) => {
        if (!g) return
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setStatus('saving')
        try {
            if (!g.id) {
                const id = await createMap(g, session.user.id)
                setGraph(prev => ({ ...prev, id }), false) // ← add false
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
        if (!graph || !user) return
        if (graphRef.current === graph) return
        graphRef.current = graph
        scheduleSave(graph)
    }, [graph])
}