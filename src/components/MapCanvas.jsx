import { useRef } from 'react'
import { screenToWorld } from '../utils/utils.js'
import Edges from './Edges.jsx'
import Node from './Node.jsx'

export default function MapCanvas({
    graph, view, nodeRects, isOwner,
    onMouseDown, onWheel, onContextMenu,
    onDelete, onSpawn, onTextChange, onTextFocus, onResizeStart,
    nodeElsRef, drag, viewportRef,
}) {
    return (
        <main
            ref={viewportRef}
            className="relative flex-1 overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]"
            onMouseDown={onMouseDown}
            onContextMenu={isOwner ? onContextMenu : undefined}
            onWheel={onWheel}
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
                            onDelete={isOwner ? onDelete : () => { }}
                            onSpawn={isOwner ? onSpawn : () => { }}
                            onTextChange={isOwner ? onTextChange : () => { }}
                            onTextFocus={isOwner ? onTextFocus : () => { }}
                            onDragStart={e => {
                                if (!isOwner) return
                                if (e.target.closest('button') || e.target.isContentEditable) return
                                e.stopPropagation()
                                const vp = viewportRef.current.getBoundingClientRect()
                                const pt = screenToWorld(e.clientX, e.clientY, vp, view)
                                drag.current = { nodeId: node.id, offsetX: pt.x - node.x, offsetY: pt.y - node.y }
                            }}
                            onResizeStart={isOwner ? onResizeStart : () => { }}
                            readOnly={!isOwner}
                        />
                    ))}
                </div>
            </div>
        </main>
    )
}