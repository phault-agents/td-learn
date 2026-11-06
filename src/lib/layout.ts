import type { GraphNode } from '../content/types';

export const COL = 210; // px per grid column
export const ROW = 150; // px per grid row
export const NODE_W = 148;
export const NODE_H = 104;

export interface Placed {
  node: GraphNode;
  x: number; // px (top-left)
  y: number;
}

/**
 * Position nodes of one network. Explicit x/y (grid units) win; otherwise a simple layered
 * layout is used: column = longest input chain depth, row = order of appearance in that column.
 */
export function placeNodes(nodes: GraphNode[]): Placed[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const d = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const n = byId.get(id);
    let v = 0;
    for (const src of n?.inputs || []) if (src && byId.has(src)) v = Math.max(v, d(src) + 1);
    visiting.delete(id);
    depth.set(id, v);
    return v;
  };
  const rowsUsed = new Map<number, number>();
  return nodes.map((n) => {
    if (n.x !== undefined && n.y !== undefined) return { node: n, x: n.x * COL, y: n.y * ROW };
    const col = n.x ?? d(n.id);
    const row = n.y ?? rowsUsed.get(col) ?? 0;
    rowsUsed.set(col, row + 1);
    return { node: n, x: col * COL, y: row * ROW };
  });
}
