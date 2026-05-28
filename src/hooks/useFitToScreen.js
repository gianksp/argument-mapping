import { useCallback } from 'react'

export function useFitToScreen(viewportRef, setView) {
    return useCallback((nodes) => {
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
}