import { useState } from 'react';
import { blurbs } from '../content';
import { useOps, docsUrl } from '../lib/opsData';
import { opUsage } from '../lib/courseIndex';
import { FAMILY_COLOR, FAMILY_NAME } from '../lib/families';
import { familyOf, fallbackLabel } from '../lib/opdb';
import { href } from '../lib/router';
import { Markdown } from '../components/Markdown';
import { Icon } from '../components/Icon';
import { NotFound } from './NotFound';

export function OpPage({ type }: { type: string }) {
  const db = useOps();
  const [showCommon, setShowCommon] = useState(false);
  if (!db) return <p className="page loading">Loading…</p>;
  const info = db[type];
  if (!info) return <NotFound />;
  const fam = familyOf(type);
  const b = blurbs[type];
  const uses = opUsage().get(type) || [];
  const label = info.label ?? fallbackLabel(type);
  return (
    <div className="page oppage" style={{ ['--fam' as string]: FAMILY_COLOR[fam] }}>
      <div className="lesson-crumbs">
        <a href={href('atlas')}>Operators</a>
        <Icon name="right" size={12} />
        <span>{fam}</span>
      </div>
      <header className="op-head">
        <span className={`famtag fam-${fam}`}>{fam}</span>
        <h1>{label}</h1>
        <code className="op-type">{type}</code>
        <p className="op-family">{FAMILY_NAME[fam]}</p>
      </header>
      <div className="op-grid">
        <div className="op-main">
          {b ? (
            <>
              <Markdown md={b.what} className="prose op-what" />
              {b.tip && (
                <aside className="callout tone-tip">
                  <div className="callout-icon">
                    <Icon name="bulb" size={18} />
                  </div>
                  <div>
                    <div className="callout-title">Tip</div>
                    <Markdown md={b.tip} className="prose prose-sm" />
                  </div>
                </aside>
              )}
            </>
          ) : (
            <p className="dim">No course notes for this operator yet — see its parameters below and the official documentation.</p>
          )}
          <h2 className="op-section">Parameters</h2>
          <p className="dim op-params-note">Labels as they appear in the parameter dialog, with Python names. Menu options are listed under each menu.</p>
          {info.pages
            .filter((p) => showCommon || p.page !== 'Common')
            .map((pg) => (
              <section key={pg.page} className="op-page">
                <h3>{pg.page}</h3>
                <table className="op-params">
                  <tbody>
                    {pg.params.map((p, i) => (
                      <tr key={p.name + i}>
                        <td className="op-p-label">{p.label || <i>(unlabeled)</i>}</td>
                        <td className="op-p-name">
                          <code>{p.name}</code>
                        </td>
                        <td className="op-p-type">
                          {p.type}
                          {p.menu && (
                            <div className="op-p-menu">
                              {p.menu.map((m, j) => (
                                <span key={j}>{m}</span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          {info.pages.some((p) => p.page === 'Common') && (
            <button className="btn btn-ghost btn-sm" onClick={() => setShowCommon(!showCommon)}>
              {showCommon ? 'Hide' : 'Show'} the Common page
            </button>
          )}
        </div>
        <aside className="op-side">
          <a className="btn btn-block" href={docsUrl(label)} target="_blank" rel="noopener noreferrer">
            Official documentation <Icon name="external" size={13} />
          </a>
          <div className="op-uses">
            <h3>Used in the course</h3>
            {uses.length ? (
              <ul>
                {uses.map((u) => (
                  <li key={u.graphId}>
                    <a href={href('lesson', u.slug, u.graphId)}>
                      <small>{u.code}</small> {u.lessonTitle}
                    </a>
                    <span className="dim">
                      {u.graphTitle} · {u.nodeIds.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="dim">Not used in a lesson network yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
