/**
 * Content validator. Run: npm run validate  [-- --lesson <slug>] [--strict]
 *
 * Checks every lesson graph against the official operator database (data/opdata.json):
 *  - operator types exist (and are not removed/experimental)
 *  - parameter labels exist on that operator (optionally 'Page:Label')
 *  - menu values are valid menu entries, toggles are booleans, tuples fit
 *  - wires connect same-family operators that exist in the same network
 *  - references / expressions point at nodes that exist
 *  - steps reference real nodes; [[Op Name]] chips in markdown resolve
 *  - every operator used has a blurb
 */
import { writeFileSync } from 'node:fs';
import { loadDB } from './lib/load-db';
import { isDefaultValue } from '../src/lib/defaults';
import { modules, blurbs } from '../src/content/index';
import type { Block, Graph, GraphNode, Lesson, ParamValue } from '../src/content/types';
import { buildNetIndex, relPath, resolvePath, lastSeg, type NetIndex } from '../src/lib/paths';
import {
  familyOf,
  isExpr,
  isRef,
  labelIndex,
  opsInExpr,
  resolveParam,
} from '../src/lib/opdb';

const { db, stats: defaultStats } = loadDB();
const labels = labelIndex(db);

const args = process.argv.slice(2);
const onlyLesson = args.includes('--lesson') ? args[args.indexOf('--lesson') + 1] : null;
const strict = args.includes('--strict');
const listDefaults = args.includes('--defaults');
const atDefault: string[] = [];

let errors = 0;
let warnings = 0;
const usedOps = new Set<string>();

function err(where: string, msg: string) {
  errors++;
  console.log(`  \x1b[31merror\x1b[0m  ${where}: ${msg}`);
}
function warn(where: string, msg: string) {
  warnings++;
  console.log(`  \x1b[33mwarn \x1b[0m  ${where}: ${msg}`);
}

const MD_CHIP = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

function checkMarkdown(where: string, md: string | undefined) {
  if (!md) return;
  let m: RegExpExecArray | null;
  MD_CHIP.lastIndex = 0;
  while ((m = MD_CHIP.exec(md))) {
    const name = m[1].trim();
    const type = db[name] ? name : labels.get(name.toLowerCase());
    if (!type) err(where, `op chip [[${name}]] does not match any operator label or type`);
    else {
      usedOps.add(type);
      if (db[type].removed) err(where, `op chip [[${name}]] refers to a REMOVED operator`);
    }
  }
}

function flatten(nodes: GraphNode[], parent: string | null, out: Map<string, { node: GraphNode; parent: string | null }>, where: string) {
  for (const n of nodes) {
    if (out.has(n.id)) err(where, `duplicate node id '${n.id}'`);
    out.set(n.id, { node: n, parent });
    if (n.children) flatten(n.children, n.id, out, where);
  }
}

let netIdx: NetIndex;
const fixOut = args.includes('--fixes') ? args[args.indexOf('--fixes') + 1] : null;
const fixes: { where: string; node: string; key: string; from: string; to: string }[] = [];

/** Check that an OP path typed into `node`'s parameter resolves the way TouchDesigner would. */
function checkPath(where: string, node: GraphNode, key: string, path: string, all: Map<string, { node: GraphNode; parent: string | null }>) {
  const res = resolvePath(node.id, path, netIdx);
  if (res.kind !== 'missing') return;
  const name = lastSeg(path);
  if (all.has(name)) {
    if (fixOut) fixes.push({ where, node: node.id, key, from: path, to: relPath(node.id, name, netIdx) });
    err(where, `${node.id}.${key}: '${path}' does not resolve from ${node.id}${familyOf(node.type) === 'COMP' ? ' (a COMP resolves paths from its inside)' : ''} — use '${relPath(node.id, name, netIdx)}'`);
  } else if (!path.includes('..')) {
    warn(where, `${node.id}.${key}: '${path}' is not a node in this graph`);
  }
}

function checkValue(where: string, node: GraphNode, key: string, v: ParamValue, all: Map<string, { node: GraphNode; parent: string | null }>) {
  const info = db[node.type];
  if (!info) return;
  const r = resolveParam(info, key);
  if (!r) {
    err(where, `${node.id} (${info.label}): no parameter labelled '${key}'`);
    return;
  }
  if (r.loose) warn(where, `${node.id}: parameter '${key}' matched loosely as '${r.param.label}' — use exact label`);
  if (r.alsoOn && !key.includes(':')) {
    warn(where, `${node.id}: '${key}' exists on pages ${[r.page, ...r.alsoOn].join(', ')} — prefix the page, e.g. '${r.page}:${r.param.label}'`);
  }
  const p = r.param;
  if (p.missingInTD) warn(where, `${node.id}.${key}: '${p.label}' (${p.name}) is in the docs but not in TouchDesigner ${defaultStats?.build ?? ''} — check the parameter still exists`);
  if (isDefaultValue(info, r, v) === true) atDefault.push(`${where}: ${node.id}.${key}`);
  if (r.samePage) warn(where, `${node.id}: label '${key}' is used by several parameters on page ${r.page} (${[p.name, ...r.samePage].join(', ')}) — use the Python name as the key`);
  if (r.block !== undefined && !/^[a-z]+?0[a-z]/i.test(p.name)) err(where, `${node.id}: '${key}' uses a [block] index but '${p.label}' is not a sequential-block parameter`);
  if (isExpr(v)) {
    for (const name of opsInExpr(v.expr)) checkPath(where, node, key, name, all);
    return;
  }
  if (isRef(v)) {
    for (const t of v.ref.split(/\s+/).filter(Boolean)) checkPath(where, node, key, t, all);
    if (!/OP|COMP|TOP|CHOP|SOP|DAT|MAT|POP|Object|Str/i.test(p.type)) {
      warn(where, `${node.id}.${key}: {ref} used on a parameter of type '${p.type}'`);
    }
    return;
  }
  const isMenu = /Menu/.test(p.type) && p.menu && p.menu.length;
  if (isMenu && p.type !== 'StrMenu') {
    if (typeof v !== 'string') {
      err(where, `${node.id}.${key}: menu parameter expects a menu label string, got ${JSON.stringify(v)}`);
    } else if (!p.menu!.includes(v) && !(p.menuNames || []).includes(v)) {
      err(where, `${node.id}.${key}: '${v}' is not a menu entry. Options: ${p.menu!.join(' | ')}`);
    } else if (!p.menu!.includes(v)) {
      warn(where, `${node.id}.${key}: '${v}' is a python menu name; prefer the label '${p.menu![p.menuNames!.indexOf(v)]}'`);
    }
    return;
  }
  if (p.type === 'Toggle' && typeof v !== 'boolean' && !(Array.isArray(v) && p.comps?.length)) err(where, `${node.id}.${key}: toggle expects true/false`);
  if (Array.isArray(v)) {
    for (const c of v) {
      if (typeof c === 'object') for (const name of opsInExpr(c.expr)) checkPath(where, node, key, name, all);
    }
    const n = p.comps?.length ?? 0;
    if (n && v.length > n) err(where, `${node.id}.${key}: ${v.length} values but parameter has ${n} components`);
    if (!n) warn(where, `${node.id}.${key}: array value on a parameter with no listed components`);
  }
  if (typeof v === 'number' && /Str|OP|COMP|TOP|CHOP|DAT|POP|SOP|MAT/.test(p.type) && !/Menu/.test(p.type)) {
    warn(where, `${node.id}.${key}: number given for parameter of type ${p.type}`);
  }
}

function checkGraph(where0: string, g: Graph) {
  const where = `${where0} graph '${g.id}'`;
  const all = new Map<string, { node: GraphNode; parent: string | null }>();
  flatten(g.nodes, null, all, where);
  netIdx = buildNetIndex(g.nodes);
  for (const [id, { node, parent }] of all) {
    const info = db[node.type];
    usedOps.add(node.type);
    if (!info) {
      err(where, `node '${id}': unknown operator type '${node.type}'`);
      continue;
    }
    if (info.removed) err(where, `node '${id}': ${info.label} has been REMOVED from TouchDesigner`);
    if (info.experimental) warn(where, `node '${id}': ${info.label} is experimental`);
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) err(where, `node id '${id}' is not a valid TD node name`);
    if (node.children && familyOf(node.type) !== 'COMP') err(where, `node '${id}' has children but is not a COMP`);
    for (const [k, v] of Object.entries(node.params || {})) checkValue(where, node, k, v, all);
    (node.inputs || []).forEach((src, i) => {
      if (src === null) return;
      const s = all.get(src);
      if (!s) return err(where, `node '${id}' input ${i}: '${src}' does not exist`);
      if (s.parent !== parent) err(where, `node '${id}' input ${i}: '${src}' is in a different network`);
      const fa = familyOf(s.node.type);
      const fb = familyOf(node.type);
      if (fa !== fb && fb !== 'COMP' && fa !== 'COMP') err(where, `node '${id}' (${fb}) cannot be wired from '${src}' (${fa})`);
    });
    checkMarkdown(`${where} node '${id}'`, node.note);
    if (node.table && familyOf(node.type) !== 'DAT') warn(where, `node '${id}' has table but is not a DAT`);
    if (!blurbs[node.type]) {
      (strict ? err : warn)(where, `no blurb for ${node.type} (add one in src/content/blurbs/*.ts)`);
    }
  }
  // overlapping tiles within a network (grid units: a tile is ~0.7 columns wide, ~0.7 rows tall)
  const byNet = new Map<string | null, GraphNode[]>();
  for (const [, { node, parent }] of all) byNet.set(parent, [...(byNet.get(parent) || []), node]);
  for (const [net, ns] of byNet) {
    const placed = ns.filter((n) => n.x !== undefined && n.y !== undefined);
    for (let i = 0; i < placed.length; i++)
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i], b = placed[j];
        if (Math.abs(a.x! - b.x!) < 0.75 && Math.abs(a.y! - b.y!) < 0.75) {
          warn(where, `nodes '${a.id}' and '${b.id}' overlap in ${net ?? 'the root network'} (x ${a.x}/${b.x}, y ${a.y}/${b.y})`);
        }
      }
    if (placed.length !== ns.length && placed.length) warn(where, `some nodes in ${net ?? 'root'} have no x/y while others do`);
  }
  for (const l of g.links || []) {
    if (!all.has(l.from)) err(where, `link from unknown node '${l.from}'`);
    if (!all.has(l.to)) err(where, `link to unknown node '${l.to}'`);
  }
  for (const b of g.boxes || []) for (const id of b.nodes) if (!all.has(id)) err(where, `box '${b.title}' lists unknown node '${id}'`);
  const introduced = new Set<string>();
  (g.steps || []).forEach((s, i) => {
    const sw = `${where} step ${i + 1}`;
    for (const id of s.nodes || []) {
      if (!all.has(id)) err(sw, `unknown node '${id}'`);
      if (introduced.has(id)) err(sw, `node '${id}' introduced twice`);
      introduced.add(id);
    }
    for (const id of s.focus || []) if (!all.has(id)) err(sw, `focus on unknown node '${id}'`);
    checkMarkdown(sw, s.body);
  });
  if (g.steps?.length) {
    // nodes whose COMP parent is introduced later than the node is a mistake
    for (const [id, { parent }] of all) {
      if (!introduced.has(id) && parent && introduced.has(parent)) {
        warn(where, `node '${id}' is inside '${parent}' but never introduced in a step`);
      }
    }
    const missing = [...all.keys()].filter((id) => !introduced.has(id) && !all.get(id)!.parent);
    if (missing.length) warn(where, `nodes never introduced in steps (visible from start): ${missing.join(', ')}`);
  }
  checkMarkdown(where, g.caption);
}

function checkBlock(where: string, b: Block) {
  switch (b.kind) {
    case 'md':
      return checkMarkdown(where, b.md);
    case 'callout':
      return checkMarkdown(where, b.md);
    case 'graph':
      return checkGraph(where, b.graph);
    case 'challenge':
      checkMarkdown(where, b.md);
      (b.hints || []).forEach((h) => checkMarkdown(where, h));
      return checkMarkdown(where, b.solution);
    case 'quiz':
      b.questions.forEach((q, i) => {
        if (q.answer < 0 || q.answer >= q.options.length) err(where, `quiz question ${i + 1} answer index out of range`);
        checkMarkdown(where, q.q);
        checkMarkdown(where, q.explain);
      });
      return;
    case 'compare':
      checkMarkdown(where, b.left.md);
      return checkMarkdown(where, b.right.md);
    case 'code':
      return;
  }
}

function checkLesson(l: Lesson) {
  const where = `lesson '${l.slug}'`;
  if (!l.objectives.length) warn(where, 'no objectives');
  const graphIds = new Set<string>();
  l.blocks.forEach((b, i) => {
    if (b.kind === 'graph') {
      if (graphIds.has(b.graph.id)) err(where, `duplicate graph id '${b.graph.id}'`);
      graphIds.add(b.graph.id);
    }
    checkBlock(`${where} block ${i + 1}`, b);
  });
  checkMarkdown(where, l.summary);
}

const slugs = new Set<string>();
for (const m of modules) {
  for (const l of m.lessons) {
    if (slugs.has(l.slug)) err('course', `duplicate lesson slug ${l.slug}`);
    slugs.add(l.slug);
  }
}
for (const m of modules) {
  for (const l of m.lessons) {
    if (onlyLesson && l.slug !== onlyLesson) continue;
    const before = errors + warnings;
    console.log(`\x1b[1m${m.number}. ${l.slug}\x1b[0m`);
    checkLesson(l);
    for (const r of l.requires || []) if (!slugs.has(r)) err(`lesson '${l.slug}'`, `requires unknown lesson '${r}'`);
    if (errors + warnings === before) console.log('  ok');
  }
}
for (const k of Object.keys(blurbs)) if (!db[k]) err('blurbs', `blurb key '${k}' is not a known operator type`);

if (fixOut) writeFileSync(fixOut, JSON.stringify(fixes, null, 1));
if (defaultStats) {
  if (listDefaults) atDefault.forEach((s) => console.log(`  default  ${s}`));
  console.log(`\nTouchDesigner ${defaultStats.build}: ${defaultStats.ops} operators merged, ${defaultStats.menusReplaced} menus updated, ${defaultStats.renamed} parameters renamed, ${defaultStats.paramsAdded} added, ${defaultStats.missing} documented but missing.`);
  console.log(`Defaults from TouchDesigner ${defaultStats.version ?? ''} build ${defaultStats.build}: ${atDefault.length} lesson value(s) equal the default${listDefaults ? '' : ' (list them with --defaults)'}.`);
} else {
  console.log('\nNo TouchDesigner defaults file (data/td_param_defaults.json) — default values not checked.');
}
console.log(`\n${errors} error(s), ${warnings} warning(s); ${usedOps.size} operator types used.`);
process.exit(errors ? 1 : 0);
