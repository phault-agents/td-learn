import { useEffect, useMemo, useRef, useState } from 'react';
import { allLessons, blurbs } from '../content';
import { useOps } from '../lib/opsData';
import { familyOf } from '../lib/opdb';
import { href, navigate } from '../lib/router';
import { REFERENCE } from '../content/reference';
import { Icon } from './Icon';

interface Item {
  kind: 'lesson' | 'op' | 'ref';
  title: string;
  sub: string;
  to: string;
  fam?: string;
  hay: string;
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const db = useOps();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = useMemo(() => {
    const out: Item[] = [];
    for (const l of allLessons) {
      out.push({
        kind: 'lesson',
        title: l.lesson.title,
        sub: `Lesson ${l.code} · ${l.module.title}`,
        to: href('lesson', l.lesson.slug),
        hay: `${l.lesson.title} ${l.lesson.subtitle} ${(l.lesson.tags || []).join(' ')} ${l.lesson.summary}`.toLowerCase(),
      });
    }
    for (const r of REFERENCE) out.push({ kind: 'ref', title: r.title, sub: 'Reference', to: href('reference', r.id), hay: `${r.title} ${r.blurb}`.toLowerCase() });
    if (db) {
      for (const [type, o] of Object.entries(db)) {
        out.push({ kind: 'op', title: o.label, sub: blurbs[type]?.what?.replace(/\[\[|\]\]|`/g, '').slice(0, 90) ?? o.family, to: href('atlas', type), fam: familyOf(type), hay: `${o.label} ${type}`.toLowerCase() });
      }
    }
    return out;
  }, [db]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return items.filter((i) => i.kind !== 'op').slice(0, 12);
    const scored = items
      .map((it) => {
        let s = 0;
        for (const t of terms) {
          const ti = it.title.toLowerCase().indexOf(t);
          if (ti === 0) s += 6;
          else if (ti > 0) s += 4;
          else if (it.hay.includes(t)) s += 1;
          else return null;
        }
        if (it.kind === 'lesson') s += 1;
        return { it, s };
      })
      .filter(Boolean) as { it: Item; s: number }[];
    return scored.sort((a, b) => b.s - a.s).slice(0, 14).map((x) => x.it);
  }, [q, items]);

  useEffect(() => setSel(0), [q]);

  const go = (it?: Item) => {
    if (!it) return;
    navigate(it.to);
    onClose();
  };

  return (
    <div className="modal-backdrop palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={q}
            placeholder="Search lessons, operators, reference…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSel(Math.min(results.length - 1, sel + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSel(Math.max(0, sel - 1));
              } else if (e.key === 'Enter') go(results[sel]);
              else if (e.key === 'Escape') onClose();
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list">
          {results.map((r, i) => (
            <li key={r.to + i}>
              <button className={`palette-item ${i === sel ? 'is-sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
                <span className={`palette-kind kind-${r.kind} ${r.fam ? `fam-${r.fam}` : ''}`}>{r.kind === 'op' ? r.fam : r.kind === 'lesson' ? 'Lesson' : 'Ref'}</span>
                <span className="palette-text">
                  <b>{r.title}</b>
                  <small>{r.sub}</small>
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="palette-empty">No matches.</li>}
        </ul>
      </div>
    </div>
  );
}
