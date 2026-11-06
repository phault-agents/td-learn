/**
 * Operator database helpers, shared by the app and the Node scripts (validator, generator).
 * The data itself comes from data/opdata.json (built from the official TouchDesigner docs by
 * scripts/opdata/build_opdata.py) and contains only parameter metadata, no prose.
 */
import type { Family, ParamValue } from '../content/types';

export interface ParamInfo {
  label: string;
  /** Python name, e.g. 'amp' */
  name: string;
  /** Doc parameter type: Float, Int, Toggle, Menu, StrMenu, OP, XYZ, RGB, Pulse, Str ... */
  type: string;
  menu?: string[];
  menuNames?: string[];
  /** Component python names for multi-value params, e.g. ['tx','ty','tz'] */
  comps?: string[];
}

export interface PageInfo {
  page: string;
  params: ParamInfo[];
}

export interface OpInfo {
  label: string;
  family: Family;
  pages: PageInfo[];
  removed?: boolean;
  experimental?: boolean;
}

export type OpDB = Record<string, OpInfo>;

export const FAMILIES: Family[] = ['POP', 'TOP', 'CHOP', 'SOP', 'DAT', 'COMP', 'MAT'];

export function familyOf(type: string): Family {
  for (const f of FAMILIES) if (type.endsWith(f)) return f;
  return 'COMP';
}

/** 'noisePOP' → 'Noise POP' style fallback label when the DB is not loaded. */
export function fallbackLabel(type: string): string {
  const fam = familyOf(type);
  const base = type.slice(0, type.length - fam.length);
  return `${base.charAt(0).toUpperCase()}${base.slice(1)} ${fam}`;
}

export function labelIndex(db: OpDB): Map<string, string> {
  const m = new Map<string, string>();
  for (const [type, info] of Object.entries(db)) m.set(info.label.toLowerCase(), type);
  return m;
}

export interface ResolvedParam {
  page: string;
  param: ParamInfo;
  /** Sequential parameter block index when the key used the 'Label[n]' form */
  block?: number;
  /** true if label matched only case-insensitively */
  loose?: boolean;
  /** other pages that also contain this label (ambiguity) */
  alsoOn?: string[];
  /** python names of other params with the same label on the same page */
  samePage?: string[];
}

/** Resolve a lesson param key ('Label' or 'Page:Label') against an operator. */
export function resolveParam(op: OpInfo, rawKey: string): ResolvedParam | null {
  let key = rawKey.trim();
  let block: number | undefined;
  const bm = /^(.*?)\s*\[(\d+)\]$/.exec(key);
  if (bm) {
    key = bm[1];
    block = Number(bm[2]);
  }
  const r = resolveParamInner(op, key, block !== undefined);
  if (r && block !== undefined) r.block = block;
  return r;
}

/** Python parameter name for a (possibly sequential-block) param, e.g. comb0oper → comb2oper */
export function pyName(r: ResolvedParam, compName?: string): string {
  const base = compName ?? r.param.name;
  if (r.block === undefined) return base;
  return base.replace(/^([a-z]+?)0(?=[a-z])/i, `$1${r.block}`);
}

/** Sequence name for a sequential-block param, e.g. comb0oper → 'comb' */
export function seqName(r: ResolvedParam): string | null {
  const m = /^([a-z]+?)0(?=[a-z])/i.exec(r.param.name);
  return m ? m[1] : null;
}

const SEQ_PARAM = /^[a-z]+?0[a-z]/i;

function resolveParamInner(op: OpInfo, key: string, inBlock = false): ResolvedParam | null {
  let pageWanted: string | null = null;
  let label = key;
  const colon = key.indexOf(':');
  if (colon > 0) {
    const maybePage = key.slice(0, colon).trim();
    if (op.pages.some((p) => p.page.toLowerCase() === maybePage.toLowerCase())) {
      pageWanted = maybePage;
      label = key.slice(colon + 1).trim();
    }
  }
  const hits: ResolvedParam[] = [];
  for (const loose of [false, true]) {
    for (const pg of op.pages) {
      if (pageWanted && pg.page.toLowerCase() !== pageWanted.toLowerCase()) continue;
      for (const p of pg.params) {
        const match = loose ? p.label.toLowerCase() === label.toLowerCase() : p.label === label;
        if (match && !hits.some((h) => h.page === pg.page && h.param.name === p.name)) {
          hits.push({ page: pg.page, param: p, loose });
        }
      }
    }
    if (hits.length) break;
  }
  if (inBlock && hits.length > 1) {
    // 'Label[n]' means a field inside sequential block n — prefer block params over the
    // sequence header that may share the same label
    const blockHits = hits.filter((h) => h.param.type !== 'Sequence' && SEQ_PARAM.test(h.param.name));
    if (blockHits.length) hits.splice(0, hits.length, ...blockHits);
  }
  if (!hits.length) {
    // Fall back to python-name matching (e.g. 'amp')
    for (const pg of op.pages) {
      if (pageWanted && pg.page.toLowerCase() !== pageWanted.toLowerCase()) continue;
      for (const p of pg.params) if (p.name === label) return { page: pg.page, param: p };
    }
    return null;
  }
  const first = hits[0];
  const others = [...new Set(hits.slice(1).map((h) => h.page))].filter((pg) => pg !== first.page);
  if (others.length) first.alsoOn = others;
  const same = hits.slice(1).filter((h) => h.page === first.page && h.param.name !== first.param.name).map((h) => h.param.name);
  if (same.length) first.samePage = same;
  return first;
}

export function isExpr(v: ParamValue): v is { expr: string } {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'expr' in v;
}
export function isRef(v: ParamValue): v is { ref: string } {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && 'ref' in v;
}

/** Op names referenced in python expressions: op('name'), op("name"), op.name? (only op('...') form) */
export function opsInExpr(expr: string): string[] {
  const out: string[] = [];
  const re = /op\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) out.push(m[1]);
  return out;
}

export function formatValue(v: ParamValue): string {
  if (Array.isArray(v)) return v.map((n) => (typeof n === 'number' ? fmtNum(n) : typeof n === 'boolean' ? (n ? 'On' : 'Off') : typeof n === 'string' ? n : n.expr)).join('  ');
  if (typeof v === 'number') return fmtNum(v);
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'string') return v;
  if (isExpr(v)) return v.expr;
  if (isRef(v)) return v.ref;
  return String(v);
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100000) / 100000);
}
