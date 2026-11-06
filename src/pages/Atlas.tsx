import { useMemo, useState } from 'react';
import { blurbs } from '../content';
import type { Family } from '../content/types';
import { useOps } from '../lib/opsData';
import { FAMILY_COLOR, FAMILY_ORDER } from '../lib/families';
import { opUsage } from '../lib/courseIndex';
import { href } from '../lib/router';
import { renderMarkdown } from '../lib/markdown';
import { Icon } from '../components/Icon';

export function Atlas() {
  const db = useOps();
  const usage = opUsage();
  const [q, setQ] = useState('');
  const [fam, setFam] = useState<Family | 'all'>('all');
  const [onlyUsed, setOnlyUsed] = useState(false);

  const list = useMemo(() => {
    if (!db) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.entries(db)
      .filter(([t, o]) => (fam === 'all' || o.family === fam) && (!onlyUsed || usage.has(t)))
      .filter(([t, o]) => terms.every((term) => o.label.toLowerCase().includes(term) || t.toLowerCase().includes(term) || (blurbs[t]?.what || '').toLowerCase().includes(term)))
      .sort((a, b) => FAMILY_ORDER.indexOf(a[1].family) - FAMILY_ORDER.indexOf(b[1].family) || a[1].label.localeCompare(b[1].label));
  }, [db, q, fam, onlyUsed, usage]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    if (db) for (const o of Object.values(db)) c.set(o.family, (c.get(o.family) || 0) + 1);
    return c;
  }, [db]);

  return (
    <div className="page atlas">
      <header className="page-head">
        <h1>Operator Atlas</h1>
        <p className="section-lede">
          Every POP in TouchDesigner, plus every other operator the course uses — with a plain-language description, the lessons that use it, and its full parameter list
          (labels, Python names and menu options from the official docs).
        </p>
      </header>
      <div className="atlas-controls">
        <label className="atlas-search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter operators… (e.g. noise, lookup, line)" />
        </label>
        <div className="atlas-fams" role="group" aria-label="Filter by family">
          <button className={fam === 'all' ? 'is-on' : ''} onClick={() => setFam('all')}>
            All
          </button>
          {FAMILY_ORDER.filter((f) => counts.get(f)).map((f) => (
            <button key={f} className={`fam-${f} ${fam === f ? 'is-on' : ''}`} onClick={() => setFam(f)} style={{ ['--fam' as string]: FAMILY_COLOR[f] }}>
              {f} <small>{counts.get(f)}</small>
            </button>
          ))}
        </div>
        <label className="atlas-toggle">
          <input type="checkbox" checked={onlyUsed} onChange={(e) => setOnlyUsed(e.target.checked)} /> Only operators used in lessons
        </label>
      </div>
      {!db ? (
        <p className="loading">Loading operators…</p>
      ) : (
        <div className="atlas-grid">
          {list.map(([t, o]) => {
            const uses = usage.get(t)?.length || 0;
            return (
              <a key={t} className={`atlas-card fam-${o.family}`} href={href('atlas', t)} style={{ ['--fam' as string]: FAMILY_COLOR[o.family] }}>
                <div className="atlas-card-top">
                  <span className={`famtag fam-${o.family}`}>{o.family}</span>
                  {uses > 0 && <span className="atlas-uses">{uses} lesson graph{uses > 1 ? 's' : ''}</span>}
                </div>
                <h3>{o.label}</h3>
                {blurbs[t] ? <p dangerouslySetInnerHTML={{ __html: renderMarkdown(blurbs[t].what, true) }} /> : <p className="dim">See parameters and official docs.</p>}
              </a>
            );
          })}
          {!list.length && <p className="dim">No operators match.</p>}
        </div>
      )}
    </div>
  );
}
