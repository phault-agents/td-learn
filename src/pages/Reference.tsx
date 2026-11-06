import { useEffect } from 'react';
import { REFERENCE } from '../content/reference';
import { Markdown } from '../components/Markdown';
import { href } from '../lib/router';

export function Reference({ id }: { id?: string }) {
  const page = REFERENCE.find((r) => r.id === id) ?? REFERENCE[0];
  useEffect(() => window.scrollTo(0, 0), [page.id]);
  return (
    <div className="page reference">
      <aside className="ref-nav" aria-label="Reference topics">
        <h2>Reference</h2>
        {REFERENCE.map((r) => (
          <a key={r.id} href={href('reference', r.id)} className={r.id === page.id ? 'is-current' : ''}>
            <b>{r.title}</b>
            <small>{r.blurb}</small>
          </a>
        ))}
      </aside>
      <article className="ref-body">
        <h1>{page.title}</h1>
        <p className="section-lede">{page.blurb}</p>
        <Markdown md={page.md} className="prose" />
      </article>
    </div>
  );
}
