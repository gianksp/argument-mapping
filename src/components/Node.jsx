import { useRef, useEffect } from 'react'
import { nodeNumber } from '../utils/utils.js'

const NODE_STYLES = {
  thesis: 'bg-white border-slate-300 text-slate-900',
  conclusion: 'bg-white border-slate-300 text-slate-900',
  reason: 'bg-green-50 border-green-500 text-slate-900',
  rebuttal: 'bg-green-50 border-green-500 text-slate-900',
  objection: 'bg-red-50 border-red-500 text-slate-900',
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ResizeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 rotate-90" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 16L16 8" />
      <path d="M13 8H16V11" />
      <path d="M11 16H8V13" />
    </svg>
  )
}

function EditableText({ nodeId, text, onChange, onFocus, readOnly }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.innerText = text
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={ref}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck={false}
      className={`outline-none text-sm leading-tight text-center whitespace-pre-wrap break-words w-full flex items-center justify-center min-h-[20px] ${readOnly ? 'cursor-default select-none' : 'cursor-text select-text'}`}
      onFocus={readOnly ? undefined : () => onFocus(nodeId)}
      onInput={readOnly ? undefined : e => onChange(nodeId, e.currentTarget.innerText.trim())}
    />
  )
}

export default function Node({ node, edges, nodes, nodeRef, onDelete, onSpawn, onTextChange, onTextFocus, onDragStart, onResizeStart, readOnly }) {
  const incomingEdge = edges.find(e => e.from === node.id)
  const edgeLabel = incomingEdge
    ? (incomingEdge.type === 'objection' ? 'But' : 'Because')
    : null

  const isRed = node.type === 'objection'
  const greenLabel = isRed ? 'Rebuttal' : 'Reason'
  const redLabel = isRed ? 'Counter' : 'Objection'
  const num = nodeNumber(node.id, nodes)

  return (
    <div
      ref={nodeRef}
      className={`
        group absolute rounded-[12px] border-2 shadow-md px-5 py-3
        flex items-center justify-center select-none
        transition hover:shadow-xl
        ${readOnly ? 'cursor-default' : 'cursor-grab'}
        ${NODE_STYLES[node.type] || NODE_STYLES.thesis}
      `}
      style={{
        left: node.x,
        top: node.y,
        width: node.w || 288,
        minHeight: node.h || 58,
        height: 'fit-content',
      }}
      onMouseDown={readOnly ? undefined : onDragStart}
    >
      {edgeLabel && (
        <div className={`absolute -top-7 left-4 text-sm font-semibold
          ${incomingEdge.type === 'objection' ? 'text-red-500' : 'text-green-500'}`}>
          {edgeLabel}
        </div>
      )}

      <div className="absolute -top-4 right-4 h-9 min-w-9 px-2 rounded-full bg-white
        text-slate-700 border border-slate-200 shadow flex items-center justify-center
        text-xs font-bold z-30">
        {num}
      </div>

      {!readOnly && (
        <button
          className="absolute -top-4 -right-5 hidden group-hover:flex h-9 w-9 items-center
            justify-center rounded-full bg-white border border-slate-300 shadow
            hover:bg-red-50 hover:text-red-600 z-40"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(node.id) }}
        >
          ×
        </button>
      )}

      <EditableText
        nodeId={node.id}
        text={node.text}
        onChange={onTextChange}
        onFocus={onTextFocus}
        readOnly={readOnly}
      />

      {!readOnly && (
        <div className="absolute left-1/2 -bottom-7 -translate-x-1/2 hidden group-hover:flex gap-2 z-40">
          <button
            className="inline-flex h-8 items-center gap-1 rounded-full bg-green-600 px-3
              text-sm font-medium text-white whitespace-nowrap"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSpawn(node.id, 'reason') }}
          >
            <PlusIcon /> {greenLabel}
          </button>
          <button
            className="inline-flex h-8 items-center gap-1 rounded-full bg-red-500 px-3
              text-sm font-medium text-white whitespace-nowrap"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onSpawn(node.id, 'objection') }}
          >
            <PlusIcon /> {redLabel}
          </button>
        </div>
      )}

      {!readOnly && (
        <div
          className="absolute right-2 bottom-2 h-5 w-5 cursor-nwse-resize opacity-0
            group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={e => { e.stopPropagation(); onResizeStart(e, node) }}
        >
          <ResizeIcon />
        </div>
      )}
    </div>
  )
}