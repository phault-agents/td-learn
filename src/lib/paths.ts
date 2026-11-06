import type { GraphNode } from '../content/types';
import { familyOf } from './opdb';

/**
 * Operator path resolution, mirroring TouchDesigner's rules for parameters:
 * relative paths are searched from the *inside* of the operator that owns the parameter.
 * For a COMP that is the COMP itself (so a sibling is '../name'); for any other operator it is
 * the network the operator lives in (so a sibling is just 'name').
 */
export interface NetIndex {
  parent: Map<string, string | null>;
  isComp: Map<string, boolean>;
  /** network (COMP id or null for the root) → child ids */
  children: Map<string | null, Set<string>>;
}

export function buildNetIndex(nodes: GraphNode[]): NetIndex {
  const idx: NetIndex = { parent: new Map(), isComp: new Map(), children: new Map() };
  const walk = (ns: GraphNode[], parent: string | null) => {
    if (!idx.children.has(parent)) idx.children.set(parent, new Set());
    for (const n of ns) {
      idx.parent.set(n.id, parent);
      idx.isComp.set(n.id, familyOf(n.type) === 'COMP');
      idx.children.get(parent)!.add(n.id);
      if (n.children) walk(n.children, n.id);
    }
  };
  walk(nodes, null);
  return idx;
}

/** The network a node's relative parameter paths start from. */
export function baseOf(id: string, idx: NetIndex): string | null {
  return idx.isComp.get(id) ? id : (idx.parent.get(id) ?? null);
}

export type Resolved = { kind: 'node'; id: string } | { kind: 'external' } | { kind: 'pattern' } | { kind: 'missing' };

export function resolvePath(fromId: string, path: string, idx: NetIndex): Resolved {
  const p = path.trim();
  if (!p) return { kind: 'missing' };
  if (p.startsWith('/')) return { kind: 'external' };
  if (/[*?[\]^]/.test(p)) return { kind: 'pattern' };
  let cur: string | null = baseOf(fromId, idx);
  let last: string | null = null;
  const segs = p.split('/');
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (cur === null) return { kind: 'external' }; // above the diagram's root network
      cur = idx.parent.get(cur) ?? null;
      last = null;
      continue;
    }
    const kids = idx.children.get(cur);
    if (!kids || !kids.has(seg)) return { kind: 'missing' };
    last = seg;
    if (i < segs.length - 1) {
      if (!idx.isComp.get(seg)) return { kind: 'missing' };
      cur = seg;
    }
  }
  if (last) return { kind: 'node', id: last };
  return cur ? { kind: 'node', id: cur } : { kind: 'external' };
}

/** Shortest relative path from a node's parameter base to a target node. */
export function relPath(fromId: string, targetId: string, idx: NetIndex): string {
  const chain = (net: string | null) => {
    const out: (string | null)[] = [net];
    let c = net;
    while (c !== null) {
      c = idx.parent.get(c) ?? null;
      out.push(c);
    }
    return out; // net → … → null (root)
  };
  const base = baseOf(fromId, idx);
  const targetNet = idx.parent.get(targetId) ?? null;
  const up = chain(base);
  const down = chain(targetNet);
  const common = up.find((n) => down.includes(n)) ?? null;
  const ups = up.indexOf(common);
  const downs = down.slice(0, down.indexOf(common)).reverse() as string[];
  const parts = [...Array(ups).fill('..'), ...downs, targetId];
  return parts.join('/');
}

/** Last path segment: '../lfo1' → 'lfo1' (used to map a path to a node id for drawing). */
export function lastSeg(path: string): string {
  const segs = path.split('/').filter((s) => s && s !== '.' && s !== '..');
  return segs[segs.length - 1] ?? path;
}
