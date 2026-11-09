import type { ParamValue } from '../content/types';
import { isExpr, isRef, pyName, type DefaultValue, type OpDB, type OpInfo, type ParamInfo, type ResolvedParam } from './opdb';

/**
 * Parameter defaults recorded from a running TouchDesigner by scripts/td/dump_td_defaults.py.
 * The official docs don't list defaults, so this dump is the only source for them. It also
 * carries TouchDesigner's own menu entries, which are more complete than the docs'.
 */
export interface TDDumpPar {
  d: unknown;
  label?: string;
  style?: string;
  tuplet?: string;
  page?: string;
  mode?: 'expr';
  expr?: string;
  menuNames?: string[];
  menuLabels?: string[];
}

export interface TDDump {
  build: string;
  version: string;
  os?: string;
  ops: Record<string, Record<string, TDDumpPar>>;
  failed?: Record<string, string>;
}

export interface MergeStats {
  build: string;
  version: string;
  ops: number;
  defaults: number;
  menusReplaced: number;
  paramsAdded: number;
  renamed: number;
  missing: number;
}

const SEQ_PARAM = /^[a-z]+?0[a-z]/i;

function plain(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  return String(v);
}

/** Merge a TouchDesigner dump into the docs-derived database (returns a new DB). */
export function mergeDump(db: OpDB, dump: TDDump): { db: OpDB; stats: MergeStats } {
  const out: OpDB = {};
  const stats: MergeStats = { build: dump.build, version: dump.version, ops: 0, defaults: 0, menusReplaced: 0, paramsAdded: 0, renamed: 0, missing: 0 };
  for (const [type, info] of Object.entries(db)) {
    const pars = dump.ops[type];
    if (!pars) {
      out[type] = info;
      continue;
    }
    stats.ops++;
    const defaults: Record<string, DefaultValue> = {};
    for (const [name, p] of Object.entries(pars)) {
      defaults[name] = p.mode === 'expr' && p.expr ? { expr: p.expr } : plain(p.d);
      stats.defaults++;
    }
    const known = new Set<string>();
    // TouchDesigner parameters the docs don't know by name, keyed by page + label: a docs
    // parameter missing from TouchDesigner with exactly one such match was renamed.
    const docNames = new Set<string>();
    info.pages.forEach((pg) => pg.params.forEach((p) => (docNames.add(p.name), p.comps?.forEach((c) => docNames.add(c)))));
    const renameCands = new Map<string, string[]>();
    for (const [n, tp] of Object.entries(pars)) {
      if (docNames.has(n) || (tp.tuplet && tp.tuplet !== n)) continue;
      const k = `${tp.page}|${tp.label}`;
      renameCands.set(k, [...(renameCands.get(k) || []), n]);
    }
    // TouchDesigner stores some parameters per component under a tuplet name; POP parameters
    // with a "Parameter Size" are amp0, amp1… (only amp0 exists at the default size).
    const tuplets = new Map<string, string[]>();
    for (const [n, tp] of Object.entries(pars)) if (tp.tuplet && tp.tuplet !== n) tuplets.set(tp.tuplet, [...(tuplets.get(tp.tuplet) || []), n]);
    const pages = info.pages.map((pg) => ({
      page: pg.page,
      params: pg.params.map((p0) => {
        let p: ParamInfo = p0;
        if (!(p.name in pars) && !(p.comps || []).some((c) => c in pars) && tuplets.has(p.name)) {
          const members = tuplets.get(p.name)!;
          if (members.length === 1 && members[0] === `${p.name}0`) {
            p = { ...p, comps: [0, 1, 2, 3].map((i) => `${p.name}${i}`), sizeable: true };
          } else if (members.length === 1) {
            p = { ...p, name: members[0], renamedFrom: p.name };
          } else {
            p = { ...p, comps: members };
          }
          stats.renamed++;
        }
        const inTD = p.name in pars || (p.comps || []).some((c) => c in pars) || p.type === 'Sequence' || SEQ_PARAM.test(p.name);
        if (!inTD) {
          const cands = renameCands.get(`${pg.page}|${p.label}`);
          if (cands?.length === 1 && !known.has(cands[0])) {
            p = { ...p, name: cands[0], renamedFrom: p.name };
            stats.renamed++;
          } else {
            p = { ...p, missingInTD: true };
            stats.missing++;
          }
        }
        known.add(p.name);
        p.comps?.forEach((c) => known.add(c));
        const tp = pars[p.sizeable ? p.comps![0] : p.name];
        // TouchDesigner's own menu entries win for fixed menus (docs are sometimes incomplete);
        // StrMenus are left alone because their entries depend on the node's inputs.
        if (tp?.menuLabels?.length && /Menu/.test(p.type) && p.type !== 'StrMenu') {
          const same = p.menu && p.menu.join('|') === tp.menuLabels.join('|');
          if (!same) stats.menusReplaced++;
          return { ...p, menu: tp.menuLabels, menuNames: tp.menuNames };
        }
        return p;
      }),
    }));
    // Parameters TouchDesigner has that the docs don't describe: add them, grouped by tuplet.
    const extra = new Map<string, { page: string; params: [string, TDDumpPar][] }>();
    for (const [name, p] of Object.entries(pars)) {
      if (known.has(name)) continue;
      const tuplet = p.tuplet || name;
      if (known.has(tuplet)) continue;
      const g = extra.get(tuplet) ?? { page: p.page || 'Other', params: [] };
      g.params.push([name, p]);
      extra.set(tuplet, g);
    }
    for (const [tuplet, g] of extra) {
      const [firstName, first] = g.params[0];
      const param: ParamInfo = {
        label: first.label || tuplet,
        name: g.params.length > 1 ? tuplet : firstName,
        type: first.style || '',
        fromTD: true,
      };
      if (g.params.length > 1) param.comps = g.params.map(([n]) => n);
      if (first.menuLabels?.length) {
        param.menu = first.menuLabels;
        param.menuNames = first.menuNames;
      }
      let page = pages.find((pg) => pg.page === g.page);
      if (!page) {
        page = { page: g.page, params: [] };
        // keep the Common page last, like TouchDesigner's parameter dialog
        const common = pages.findIndex((pg) => pg.page === 'Common');
        if (common >= 0) pages.splice(common, 0, page);
        else pages.push(page);
      }
      page.params.push(param);
      stats.paramsAdded++;
    }
    out[type] = { ...info, pages, defaults };
  }
  return { db: out, stats };
}

function numEq(a: number, b: number) {
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

function truthy(d: DefaultValue): boolean | null {
  if (typeof d === 'boolean') return d;
  if (typeof d === 'number') return d !== 0;
  if (typeof d === 'string') {
    if (/^(true|on|1)$/i.test(d)) return true;
    if (/^(false|off|0)$/i.test(d)) return false;
  }
  return null;
}

/** Does one component value equal the recorded default? undefined = can't tell. */
function compEq(p: ParamInfo, d: DefaultValue | undefined, v: number | string | boolean | { expr: string }): boolean | undefined {
  if (d === undefined) return undefined;
  if (typeof v === 'object') return typeof d === 'object' && d !== null && d.expr.trim() === v.expr.trim();
  if (typeof d === 'object' && d !== null) return false; // default is an expression, value is a constant
  if (typeof v === 'boolean') {
    const t = truthy(d);
    return t === null ? undefined : t === v;
  }
  if (typeof v === 'number') {
    const n = typeof d === 'number' ? d : typeof d === 'string' && d.trim() !== '' ? Number(d) : NaN;
    if (Number.isNaN(n)) {
      const t = truthy(d);
      return t === null ? undefined : (v !== 0) === t;
    }
    return numEq(v, n);
  }
  // strings: menu label → token, otherwise literal
  const ds = d === null ? '' : String(d);
  if (p.menu && p.menuNames) {
    const i = p.menu.indexOf(v);
    if (i >= 0 && p.menuNames[i] === ds) return true;
    if (p.menuNames.includes(v) && v === ds) return true;
  }
  return v.trim() === ds.trim();
}

/**
 * Is a lesson's value for this parameter the same as TouchDesigner's default?
 * Returns undefined when the defaults aren't known (no dump, or a name we can't match).
 */
export function isDefaultValue(op: OpInfo | undefined, r: ResolvedParam | null, v: ParamValue): boolean | undefined {
  const defs = op?.defaults;
  if (!defs || !r) return undefined;
  const p = r.param;
  const comps = p.comps?.length && !/Menu/.test(p.type) ? p.comps : null;
  const lookup = (name: string) => defs[pyName(r, name)];
  // sizeable POP parameters: a single value means column 0 (the only one at the default size)
  if (p.sizeable && !Array.isArray(v)) {
    if (isRef(v)) return compEq(p, lookup(p.comps![0]), v.ref);
    return compEq(p, lookup(p.comps![0]), v as number | string | boolean | { expr: string });
  }
  if (Array.isArray(v)) {
    if (!comps) return undefined;
    let all = true;
    for (let i = 0; i < v.length; i++) {
      const eq = compEq(p, lookup(comps[i]), v[i]);
      if (eq === undefined) return undefined;
      all = all && eq;
    }
    return all;
  }
  if (isRef(v)) return compEq(p, lookup(p.name), v.ref);
  if (isExpr(v)) {
    if (comps) return comps.every((c) => compEq(p, lookup(c), v) === true);
    return compEq(p, lookup(p.name), v);
  }
  // a single number on a multi-component parameter applies to every component
  if (comps && typeof v === 'number') {
    let all = true;
    for (const c of comps) {
      const eq = compEq(p, lookup(c), v);
      if (eq === undefined) return undefined;
      all = all && eq;
    }
    return all;
  }
  return compEq(p, lookup(p.name), v);
}

/** Human-readable form of a default, for the Atlas parameter tables. */
export function formatDefault(p: ParamInfo, defs: Record<string, DefaultValue> | undefined): string | null {
  if (!defs) return null;
  const one = (name: string): string | null => {
    const d = defs[name];
    if (d === undefined) return null;
    if (d !== null && typeof d === 'object') return `ƒx ${d.expr}`;
    if (p.menu && p.menuNames && typeof d === 'string') {
      const i = p.menuNames.indexOf(d);
      if (i >= 0) return p.menu[i];
    }
    if (p.type === 'Toggle' || p.type === 'toggle') {
      const t = truthy(d);
      if (t !== null) return t ? 'On' : 'Off';
    }
    if (d === '' || d === null) return '—';
    return String(d);
  };
  if (p.sizeable && p.comps?.length) return one(p.comps[0]);
  if (p.comps?.length && !/Menu/.test(p.type)) {
    const parts = p.comps.map(one);
    if (parts.every((x) => x === null)) return null;
    return parts.map((x) => x ?? '?').join('  ');
  }
  return one(p.name);
}
