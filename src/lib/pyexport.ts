import type { Graph, GraphNode, ParamValue } from '../content/types';
import { isExpr, isRef, pyName, resolveParam, seqName, type OpDB } from './opdb';
import { COL, ROW } from './layout';

/**
 * Generate a TouchDesigner Python script that rebuilds a lesson graph.
 * Parameter python names and menu tokens come from the official-docs database, and every
 * parameter assignment is wrapped so one mismatch never aborts the whole build.
 */
export function buildScript(graph: Graph, db: OpDB, lessonTitle: string): string {
  const L: string[] = [];
  const py = (s: string) => JSON.stringify(s); // JSON strings are valid Python string literals
  L.push(`# TouchDesigner build script (beta) — "${graph.title}"`);
  L.push(`# From the lesson "${lessonTitle}".`);
  L.push('#');
  L.push('# How to use: in an empty network (e.g. inside a new Base COMP), create a Text DAT,');
  L.push('# paste this script into it, then right-click the DAT > Run Script.');
  L.push('# Nodes are created in the same network as the Text DAT. Existing nodes with the same');
  L.push('# name and type are reused (their parameters are re-applied); nothing is deleted.');
  L.push('# Building by hand teaches more — use this to check your work or to skip ahead.');
  L.push('');
  L.push('root = me.parent()');
  L.push('made = {}');
  L.push('problems = []');
  L.push('');
  L.push('def mk(parent, optype, name, x, y):');
  L.push('    o = parent.op(name)');
  L.push('    fresh = False');
  L.push('    if o is None or o.OPType != optype:');
  L.push('        o = parent.create(optype, name if o is None else None)');
  L.push('        fresh = True');
  L.push('    o.nodeX, o.nodeY = x, y');
  L.push('    made[name] = o');
  L.push('    return o, fresh');
  L.push('');
  L.push('def setp(o, name, value):');
  L.push('    try:');
  L.push('        p = getattr(o.par, name)');
  L.push('        p.mode = ParMode.CONSTANT');
  L.push('        p.val = value');
  L.push('    except Exception as e:');
  L.push('        problems.append("%s.par.%s = %r  (%s)" % (o.path, name, value, e))');
  L.push('');
  L.push('def setexpr(o, name, expr):');
  L.push('    try:');
  L.push('        p = getattr(o.par, name)');
  L.push('        p.expr = expr');
  L.push('        p.mode = ParMode.EXPRESSION');
  L.push('    except Exception as e:');
  L.push('        problems.append("%s.par.%s expr %r  (%s)" % (o.path, name, expr, e))');
  L.push('');
  L.push('def setseq(o, seq, count):');
  L.push('    try:');
  L.push('        s = o.seq[seq]');
  L.push('        if s.numBlocks < count:');
  L.push('            s.numBlocks = count');
  L.push('    except Exception as e:');
  L.push('        problems.append("%s.seq.%s.numBlocks = %d  (%s)" % (o.path, seq, count, e))');
  L.push('');

  const emitNetwork = (nodes: GraphNode[], parentVar: string, indent: string) => {
    // create all nodes first
    for (const n of nodes) {
      const x = Math.round(((n.x ?? 0) * COL));
      const y = Math.round(-(n.y ?? 0) * ROW);
      L.push(`${indent}o, fresh = mk(${parentVar}, ${py(n.type)}, ${py(n.id)}, ${x}, ${y})`);
      if (n.children?.length) {
        L.push(`${indent}if fresh:`);
        L.push(`${indent}    for c in list(o.children):`);
        L.push(`${indent}        c.destroy()  # remove the default contents of the new COMP`);
      }
    }
    // params, flags, content
    for (const n of nodes) {
      const info = db[n.type];
      const v = `made[${py(n.id)}]`;
      const lines: string[] = [];
      const seqCounts = new Map<string, number>();
      for (const [key, val] of Object.entries(n.params || {})) {
        const r = info ? resolveParam(info, key) : null;
        if (!r) {
          lines.push(`# (skipped unknown parameter ${py(key)})`);
          continue;
        }
        if (r.block !== undefined) {
          const s = seqName(r);
          if (s) seqCounts.set(s, Math.max(seqCounts.get(s) || 0, r.block + 1));
        }
        lines.push(...paramLines(v, r, val, py));
      }
      const seqLines = [...seqCounts].map(([s, c]) => `setseq(${v}, ${py(s)}, ${c})`);
      const body = [...seqLines, ...lines];
      if (n.flags?.display !== undefined) body.push(`${v}.display = ${n.flags.display ? 'True' : 'False'}`);
      if (n.flags?.render !== undefined) body.push(`${v}.render = ${n.flags.render ? 'True' : 'False'}`);
      if (n.flags?.bypass) body.push(`${v}.bypass = True`);
      if (n.code) body.push(`${v}.text = ${py(n.code.text)}`);
      if (n.table) {
        body.push(`${v}.clear()`);
        for (const row of n.table) body.push(`${v}.appendRow(${JSON.stringify(row)})`);
      }
      if (body.length) {
        L.push(`${indent}# ${n.id}`);
        for (const b of body) L.push(indent + b);
      }
    }
    // wires
    for (const n of nodes) {
      (n.inputs || []).forEach((src, i) => {
        if (!src) return;
        L.push(`${indent}made[${py(n.id)}].inputConnectors[${i}].connect(made[${py(src)}])`);
      });
    }
    // children
    for (const n of nodes) {
      if (n.children?.length) {
        L.push('');
        L.push(`${indent}# --- inside ${n.id} ---`);
        emitNetwork(n.children, `made[${py(n.id)}]`, indent);
      }
    }
  };

  emitNetwork(graph.nodes, 'root', '');
  L.push('');
  L.push('if problems:');
  L.push('    print("[TD Learning] built with %d parameter(s) to set by hand:" % len(problems))');
  L.push('    for p in problems:');
  L.push('        print("   ", p)');
  L.push('else:');
  L.push(`    print("[TD Learning] built ${graph.title.replace(/"/g, "'")}: %d nodes" % len(made))`);
  return L.join('\n') + '\n';
}

function paramLines(
  v: string,
  r: NonNullable<ReturnType<typeof resolveParam>>,
  val: ParamValue,
  py: (s: string) => string,
): string[] {
  const p = r.param;
  const name = pyName(r);
  if (isExpr(val)) {
    if (p.comps?.length) return p.comps.map((c) => `setexpr(${v}, ${py(pyName(r, c))}, ${py(val.expr)})`);
    return [`setexpr(${v}, ${py(name)}, ${py(val.expr)})`];
  }
  if (isRef(val)) return [`setp(${v}, ${py(name)}, ${py(val.ref)})`];
  if (Array.isArray(val)) {
    const comps = p.comps?.length ? p.comps : val.map((_, i) => `${p.name}${i}`);
    return val.map((x, i) =>
      typeof x === 'number' ? `setp(${v}, ${py(pyName(r, comps[i]))}, ${x})` : `setexpr(${v}, ${py(pyName(r, comps[i]))}, ${py(x.expr)})`,
    );
  }
  if (typeof val === 'boolean') return [`setp(${v}, ${py(name)}, ${val ? 'True' : 'False'})`];
  if (typeof val === 'number') {
    if (p.comps?.length && !/Menu/.test(p.type)) return p.comps.map((c) => `setp(${v}, ${py(pyName(r, c))}, ${val})`);
    return [`setp(${v}, ${py(name)}, ${val})`];
  }
  // string: menu label → menu token
  if (p.menu && p.menuNames) {
    const i = p.menu.indexOf(val);
    const token = i >= 0 ? p.menuNames[i] : val;
    return [`setp(${v}, ${py(name)}, ${py(token)})`];
  }
  return [`setp(${v}, ${py(name)}, ${py(val)})`];
}
