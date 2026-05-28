const EDGE_COLORS = {
  reason:    '#22c55e',
  rebuttal:  '#22c55e',
  objection: '#ef4444',
};

export default function Edges({ edges, nodes, nodeRects }) {
  return (
    <svg
      className="absolute left-0 top-0 pointer-events-none"
      style={{ width: 6000, height: 6000 }}
    >
      <defs>
        {['reason', 'rebuttal', 'objection'].map(t => (
          <marker
            key={t}
            id={`arrow-${t}`}
            markerWidth="5" markerHeight="5"
            refX="4.2" refY="1.8"
            orient="auto" markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,3.6 L4.2,1.8 z" fill={EDGE_COLORS[t]} />
          </marker>
        ))}
      </defs>

      {edges.map((edge, i) => {
        const from = nodes.find(n => n.id === edge.from);
        const to   = nodes.find(n => n.id === edge.to);
        if (!from || !to) return null;

        const toRect   = nodeRects[to.id]   || { w: to.w   || 288, h: to.h   || 58 };
        const fromRect = nodeRects[from.id] || { w: from.w || 288, h: from.h || 58 };

        const x1 = to.x   + toRect.w   / 2;
        const y1 = to.y   + toRect.h;
        const x2 = from.x + fromRect.w / 2;
        const y2 = from.y;
        const mid = (y1 + y2) / 2;

        return (
          <path
            key={i}
            d={`M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`}
            fill="none"
            stroke={EDGE_COLORS[edge.type] || '#64748b'}
            strokeWidth="1.8"
            markerEnd={`url(#arrow-${edge.type})`}
          />
        );
      })}
    </svg>
  );
}
