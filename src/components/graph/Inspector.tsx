import { useMemo, useState } from 'react';
import type { Graph, GraphNode, ParamValue } from '../../content/types';
import { familyOf, fallbackLabel, formatValue, isExpr, isRef, opsInExpr, pyName, resolveParam, type OpDB, type ResolvedParam } from '../../lib/opdb';
import { FAMILY_COLOR } from '../../lib/families';
import { docsUrl } from '../../lib/opsData';
import { highlight, renderMarkdown } from '../../lib/markdown';
import { blurbs } from '../../content';
import { lastSeg } from '../../lib/paths';
import { href } from '../../lib/router';
import { Icon } from '../Icon';
import { CopyButton } from '../CopyButton';

interface Props {
  entry?: { node: GraphNode; parent: string | null };
  graph: Graph;
  db: OpDB | null;
  built: boolean;
  fresh: boolean;
  onToggleBuilt: () => void;
  onSelect: (id: string) => void;
  onEnter: (id: string) => void;
  onClose: () => void;
}

interface Row {
  key: string;
  value: ParamValue;
  r: ResolvedParam | null;
  order: number;
}

function allNodes(nodes: GraphNode[], out: GraphNode[] = []) {
  for (const n of nodes) {
    out.push(n);
    if (n.children) allNodes(n.children, out);
  }
  return out;
}

export function Inspector({ entry, graph, db, built, fresh, onToggleBuilt, onSelect, onEnter, onClose }: Props) {
  const flat = useMemo(() => allNodes(graph.nodes), [graph]);
  const ids = useMemo(() => new Set(flat.map((n) => n.id)), [flat]);

  if (!entry) {
    const fams = new Map<string, number>();
    flat.forEach((n) => fams.set(familyOf(n.type), (fams.get(familyOf(n.type)) || 0) + 1));
    return (
      <aside className="nv-inspector is-empty">
        <div className="insp-empty">
          <Icon name="pointer" size={22} />
          <p>
            <b>Select a node</b> to see what it does and exactly which parameters to change.
          </p>
          <div className="insp-famcount">
            {[...fams].map(([f, n]) => (
              <span key={f} className={`famtag fam-${f}`}>
                {n} {f}
                {n > 1 ? 's' : ''}
              </span>
            ))}
          </div>
          <p className="insp-small">Everything not listed in a node's parameters stays at its default value.</p>
        </div>
      </aside>
    );
  }

  const { node } = entry;
  const fam = familyOf(node.type);
  const info = db?.[node.type];
  const label = info?.label ?? fallbackLabel(node.type);
  const blurb = blurbs[node.type];
  const color = FAMILY_COLOR[fam];

  const rows: Row[] = Object.entries(node.params || {}).map(([key, value], i) => {
    const r = info ? resolveParam(info, key) : null;
    let order = 10000 + i;
    if (r && info) {
      const pi = info.pages.findIndex((p) => p.page === r.page);
      const qi = info.pages[pi].params.findIndex((q) => q.name === r.param.name);
      order = pi * 1000 + (r.block ?? 0) * 100 + qi;
    }
    return { key, value, r, order };
  });
  rows.sort((a, b) => a.order - b.order);
  const pages: { page: string; rows: Row[] }[] = [];
  for (const row of rows) {
    const page = row.r?.page ?? 'Parameters';
    const last = pages[pages.length - 1];
    if (last && last.page === page) last.rows.push(row);
    else pages.push({ page, rows: [row] });
  }

  const feeds = flat.filter((n) => (n.inputs || []).includes(node.id)).map((n) => n.id);
  const referencedBy = flat
    .filter((n) =>
      Object.values(n.params || {}).some(
        (v) =>
          (isRef(v) && v.ref.split(/\s+/).map(lastSeg).includes(node.id)) ||
          (isExpr(v) && opsInExpr(v.expr).map(lastSeg).includes(node.id)) ||
          (Array.isArray(v) && v.some((c) => typeof c === 'object' && opsInExpr(c.expr).map(lastSeg).includes(node.id))),
      ),
    )
    .map((n) => n.id);

  return (
    <aside className="nv-inspector" style={{ ['--fam' as string]: color }}>
      <header className="insp-head">
        <div className="insp-title">
          <span className={`famtag fam-${fam}`}>{fam}</span>
          <h4>
            <a href={href('atlas', node.type)} title="Open in the Operator Atlas">
              {label}
            </a>
          </h4>
          <button className="insp-close" onClick={onClose} aria-label="Close inspector">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="insp-name">
          <code>{node.id}</code>
          <CopyButton text={node.id} small label="Copy name" />
          {fresh && <span className="insp-new">new this step</span>}
        </div>
      </header>

      <div className="insp-scroll">
        {blurb && <p className="insp-blurb" dangerouslySetInnerHTML={{ __html: renderMarkdown(blurb.what, true) }} />}


        {node.flags && (node.flags.display || node.flags.render || node.flags.bypass) && (
          <div className="insp-flags">
            {node.flags.display && <span className="flagtag flag-display">Display flag</span>}
            {node.flags.render && <span className="flagtag flag-render">Render flag</span>}
            {node.flags.bypass && <span className="flagtag flag-bypass">Bypassed</span>}
          </div>
        )}

        {pages.length > 0 ? (
          <div className="insp-params">
            <div className="insp-section-title">Parameters to set</div>
            {pages.map((pg) => (
              <div key={pg.page} className="insp-page">
                <div className="insp-page-name">{pg.page}</div>
                {pg.rows.map((row) => (
                  <ParamRow key={row.key} row={row} ids={ids} onSelect={onSelect} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="insp-small">Defaults are fine for this node — just create it{node.inputs?.length ? ' and wire it up' : ''}.</p>
        )}

        {node.note && <div className="insp-note prose prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(node.note) }} />}
        {(node.inputs?.some(Boolean) || feeds.length > 0 || referencedBy.length > 0) && (
          <div className="insp-io">
            {node.inputs?.some(Boolean) && (
              <div>
                <span className="insp-io-label">Inputs</span>
                {node.inputs!.map((id, i) =>
                  id ? (
                    <button key={i} className="insp-link" onClick={() => onSelect(id)}>
                      <span className="insp-io-idx">{i}</span> {id}
                    </button>
                  ) : null,
                )}
              </div>
            )}
            {feeds.length > 0 && (
              <div>
                <span className="insp-io-label">Feeds</span>
                {feeds.map((id) => (
                  <button key={id} className="insp-link" onClick={() => onSelect(id)}>
                    {id}
                  </button>
                ))}
              </div>
            )}
            {referencedBy.length > 0 && (
              <div>
                <span className="insp-io-label">Used by</span>
                {referencedBy.map((id) => (
                  <button key={id} className="insp-link is-ref" onClick={() => onSelect(id)}>
                    {id}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {node.code && (
          <div className="insp-code">
            <div className="insp-section-title">
              Contents <CopyButton text={node.code.text} small />
            </div>
            <pre className="md-code">
              <code className="hljs" dangerouslySetInnerHTML={{ __html: highlight(node.code.text, node.code.lang) }} />
            </pre>
          </div>
        )}

        {node.table && (
          <div className="insp-code">
            <div className="insp-section-title">
              Table contents <CopyButton text={node.table.map((r) => r.join('\t')).join('\n')} small label="Copy as TSV" />
            </div>
            <div className="insp-table">
              <table>
                <tbody>
                  {node.table.slice(0, 40).map((r, i) => (
                    <tr key={i} className={i === 0 ? 'is-head' : ''}>
                      {r.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {node.table.length > 40 && <p className="insp-small">…and {node.table.length - 40} more rows</p>}
            </div>
          </div>
        )}

        {blurb?.tip && (
          <div className="insp-tip">
            <Icon name="spark" size={14} /> <span dangerouslySetInnerHTML={{ __html: renderMarkdown(blurb.tip, true) }} />
          </div>
        )}
      </div>

      <footer className="insp-foot">
        <label className={`insp-built ${built ? 'is-on' : ''}`}>
          <input type="checkbox" checked={built} onChange={onToggleBuilt} />
          <span className="insp-check">
            <Icon name="check" size={12} />
          </span>
          I've built this
        </label>
        {node.children?.length ? (
          <button className="insp-btn" onClick={() => onEnter(node.id)}>
            <Icon name="enter" size={14} /> Open network
          </button>
        ) : null}
        <a className="insp-btn" href={docsUrl(label)} target="_blank" rel="noopener noreferrer" title="Official TouchDesigner documentation">
          Docs <Icon name="external" size={12} />
        </a>
      </footer>
    </aside>
  );
}

function ParamRow({ row, ids, onSelect }: { row: Row; ids: Set<string>; onSelect: (id: string) => void }) {
  const [showPy, setShowPy] = useState(false);
  const { r, value } = row;
  const label = r ? r.param.label : row.key;
  const isMenu = !!(r?.param.menu?.length && /Menu/.test(r.param.type)) && typeof value === 'string';
  const py = r ? `par.${pyName(r)}` : null;
  return (
    <div className={`pr ${r ? '' : 'is-unknown'}`}>
      <div className="pr-label" onClick={() => setShowPy(!showPy)} title={py ? `Python: ${py}` : 'Not found in the parameter database'}>
        {r?.block !== undefined && <span className="pr-block">#{r.block}</span>}
        {label}
        {showPy && py && <code className="pr-py">{py}</code>}
      </div>
      <div className="pr-value">
        <Value value={value} isMenu={isMenu} type={r?.param.type} ids={ids} onSelect={onSelect} />
      </div>
    </div>
  );
}

function Value({ value, isMenu, type, ids, onSelect }: { value: ParamValue; isMenu: boolean; type?: string; ids: Set<string>; onSelect: (id: string) => void }) {
  if (isExpr(value)) {
    return (
      <span className="pv pv-expr" title="Expression mode (click the parameter's mode button until it turns blue, then type this)">
        <span className="pv-fx">ƒx</span>
        <code>{value.expr}</code>
      </span>
    );
  }
  if (isRef(value)) {
    return (
      <span className="pv pv-ref">
        {value.ref.split(/\s+/).map((t, i) =>
          ids.has(lastSeg(t)) ? (
            <button key={i} onClick={() => onSelect(lastSeg(t))} title="Select this node">
              {t}
            </button>
          ) : (
            <code key={i}>{t}</code>
          ),
        )}
      </span>
    );
  }
  if (typeof value === 'boolean' || (type === 'Toggle' && !Array.isArray(value))) {
    const on = value === true;
    return (
      <span className={`pv pv-toggle ${on ? 'is-on' : ''}`}>
        <span className="pv-switch" />
        {on ? 'On' : 'Off'}
      </span>
    );
  }
  if (Array.isArray(value)) {
    return (
      <span className="pv-tuple">
        {value.map((v, i) =>
          typeof v === 'number' ? (
            <span key={i} className="pv pv-num">
              {formatValue(v)}
            </span>
          ) : typeof v === 'boolean' ? (
            <span key={i} className={`pv pv-toggle ${v ? 'is-on' : ''}`}>
              <span className="pv-switch" />
              {v ? 'On' : 'Off'}
            </span>
          ) : typeof v === 'string' ? (
            <span key={i} className="pv pv-str">
              {v}
            </span>
          ) : (
            <span key={i} className="pv pv-expr" title="This component is an expression">
              <span className="pv-fx">ƒx</span>
              <code>{v.expr}</code>
            </span>
          ),
        )}
      </span>
    );
  }
  if (isMenu) {
    return (
      <span className="pv pv-menu">
        {value as string} <Icon name="chev" size={10} />
      </span>
    );
  }
  if (typeof value === 'number') return <span className="pv pv-num">{formatValue(value)}</span>;
  return <span className="pv pv-str">{String(value)}</span>;
}
