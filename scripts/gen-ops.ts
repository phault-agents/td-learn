/**
 * Generates src/generated/ops.json: the subset of data/opdata.json shipped to the browser
 * (every POP — for the Atlas — plus every operator used anywhere in the course).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadDB } from './lib/load-db';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { modules, blurbs } from '../src/content/index';
import type { GraphNode } from '../src/content/types';
import { labelIndex, type OpDB } from '../src/lib/opdb';

const here = dirname(fileURLToPath(import.meta.url));
const { db, stats } = loadDB();
const labels = labelIndex(db);
const used = new Set<string>();
const walk = (nodes: GraphNode[]) => nodes.forEach((n) => { used.add(n.type); if (n.children) walk(n.children); });
const chips = (md?: string) => { if (!md) return; for (const m of md.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) { const t = db[m[1]] ? m[1] : labels.get(m[1].toLowerCase()); if (t) used.add(t); } };
for (const m of modules) for (const l of m.lessons) {
  chips(l.summary);
  for (const b of l.blocks) {
    if (b.kind === 'graph') { walk(b.graph.nodes); chips(b.graph.caption); b.graph.steps?.forEach((s) => chips(s.body)); }
    else if (b.kind === 'md' || b.kind === 'callout') chips(b.md);
    else if (b.kind === 'challenge') { chips(b.md); chips(b.solution); b.hints?.forEach(chips); }
    else if (b.kind === 'compare') { chips(b.left.md); chips(b.right.md); }
  }
}
for (const k of Object.keys(blurbs)) used.add(k);
const out: OpDB = {};
for (const [t, o] of Object.entries(db)) {
  if (o.removed) continue;
  if (o.family === 'POP' || used.has(t)) out[t] = o;
}
mkdirSync(resolve(here, '../src/generated'), { recursive: true });
writeFileSync(resolve(here, '../src/generated/ops.json'), JSON.stringify(out));
writeFileSync(
  resolve(here, '../src/generated/meta.json'),
  JSON.stringify({ defaults: stats ? { build: stats.build, version: stats.version } : null }),
);
console.log(`ops.json: ${Object.keys(out).length} operators (${used.size} referenced by content)` + (stats ? `; defaults from TouchDesigner build ${stats.build}` : '; no TouchDesigner defaults file'));
