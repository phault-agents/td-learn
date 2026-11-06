import { allLessons } from '../content';
import type { GraphNode, Lesson } from '../content/types';

export interface OpUse {
  slug: string;
  lessonTitle: string;
  code: string;
  graphId: string;
  graphTitle: string;
  nodeIds: string[];
}

function walk(nodes: GraphNode[], f: (n: GraphNode) => void) {
  for (const n of nodes) {
    f(n);
    if (n.children) walk(n.children, f);
  }
}

export function lessonOps(lesson: Lesson): string[] {
  const s = new Set<string>();
  for (const b of lesson.blocks) if (b.kind === 'graph') walk(b.graph.nodes, (n) => s.add(n.type));
  return [...s];
}

let usageCache: Map<string, OpUse[]> | null = null;
export function opUsage(): Map<string, OpUse[]> {
  if (usageCache) return usageCache;
  const m = new Map<string, OpUse[]>();
  for (const ref of allLessons) {
    for (const b of ref.lesson.blocks) {
      if (b.kind !== 'graph') continue;
      const per = new Map<string, string[]>();
      walk(b.graph.nodes, (n) => per.set(n.type, [...(per.get(n.type) || []), n.id]));
      for (const [type, ids] of per) {
        const arr = m.get(type) || [];
        arr.push({ slug: ref.lesson.slug, lessonTitle: ref.lesson.title, code: ref.code, graphId: b.graph.id, graphTitle: b.graph.title, nodeIds: ids });
        m.set(type, arr);
      }
    }
  }
  usageCache = m;
  return m;
}

export function totalMinutes() {
  return allLessons.reduce((a, l) => a + l.lesson.minutes, 0);
}
