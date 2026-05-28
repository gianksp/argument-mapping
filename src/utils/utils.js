export function screenToWorld(clientX, clientY, rect, view) {
  return {
    x: (clientX - rect.left - view.x) / view.scale,
    y: (clientY - rect.top - view.y) / view.scale,
  };
}

export function getDescendants(id, edges) {
  const children = edges.filter(e => e.to === id).map(e => e.from);
  return children.flatMap(c => [c, ...getDescendants(c, edges)]);
}

export function nodeNumber(nodeId, nodes) {
  const sorted = [...nodes].sort((a, b) => {
    const rA = Math.round(a.y / 190);
    const rB = Math.round(b.y / 190);
    return rA - rB || a.x - b.x;
  });

  const rows = [];
  for (const node of sorted) {
    let row = rows.find(r => Math.abs(r.y - node.y) < 100);
    if (!row) { row = { y: node.y, nodes: [] }; rows.push(row); }
    row.nodes.push(node);
    row.y = row.nodes.reduce((s, n) => s + n.y, 0) / row.nodes.length;
  }

  rows.sort((a, b) => a.y - b.y);
  for (let r = 0; r < rows.length; r++) {
    rows[r].nodes.sort((a, b) => a.x - b.x);
    const c = rows[r].nodes.findIndex(n => n.id === nodeId);
    if (c !== -1) return `${r + 1}.${c + 1}`;
  }
  return '?';
}

const NODE_W = 288;
const COL_GAP = 40;  // horizontal gap between sibling subtrees
const ROW_GAP = 190; // vertical gap between rows

// Returns the total pixel width a subtree needs
function subtreeWidth(id, childrenByParent) {
  const kids = childrenByParent[id] || [];
  if (kids.length === 0) return NODE_W;
  const total = kids.reduce((sum, kid) => sum + subtreeWidth(kid, childrenByParent), 0);
  return Math.max(NODE_W, total + COL_GAP * (kids.length - 1));
}

// Assigns x/y to every node, centered over its subtree
function assignPositions(id, depth, left, childrenByParent, nodes) {
  const node = nodes.find(n => n.id === id);
  if (!node) return;

  const kids = childrenByParent[id] || [];
  const sw = subtreeWidth(id, childrenByParent);

  // center this node over its subtree
  node.x = left + sw / 2 - NODE_W / 2;
  node.y = depth * ROW_GAP + 70;

  // lay out children left-to-right
  let cursor = left;
  for (const kid of kids) {
    const kw = subtreeWidth(kid, childrenByParent);
    assignPositions(kid, depth + 1, cursor, childrenByParent, nodes);
    cursor += kw + COL_GAP;
  }
}

export function computeAutoLayout(nodes, edges) {
  const childrenByParent = {};
  const hasParent = new Set();
  edges.forEach(e => {
    (childrenByParent[e.to] ||= []).push(e.from);
    hasParent.add(e.from);
  });

  const roots = nodes
    .filter(n => !hasParent.has(n.id))
    .sort((a, b) => a.x - b.x || a.y - b.y);

  // figure out total width of all root subtrees so we can center the whole map
  const totalWidth = roots.reduce((sum, r, i) =>
    sum + subtreeWidth(r.id, childrenByParent) + (i > 0 ? COL_GAP * 3 : 0), 0);

  let cursor = window.innerWidth / 2 - totalWidth / 2;
  for (const root of roots) {
    const sw = subtreeWidth(root.id, childrenByParent);
    assignPositions(root.id, 0, cursor, childrenByParent, nodes);
    cursor += sw + COL_GAP * 3;
  }
}