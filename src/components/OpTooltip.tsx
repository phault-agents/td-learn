import { useEffect, useState } from 'react';
import { blurbs } from '../content';
import { renderMarkdown } from '../lib/markdown';
import { familyOf } from '../lib/opdb';

/** Global hover card for [[Op]] chips in prose. */
export function OpTooltip() {
  const [tip, setTip] = useState<{ type: string; x: number; y: number } | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const over = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.('a.opchip') as HTMLElement | null;
      window.clearTimeout(timer);
      if (!a) {
        timer = window.setTimeout(() => setTip(null), 80);
        return;
      }
      const type = a.dataset.op!;
      if (!blurbs[type]) return;
      const r = a.getBoundingClientRect();
      timer = window.setTimeout(() => setTip({ type, x: Math.min(r.left, window.innerWidth - 340), y: r.bottom + 8 }), 220);
    };
    document.addEventListener('mouseover', over);
    window.addEventListener('scroll', () => setTip(null), { passive: true });
    return () => {
      document.removeEventListener('mouseover', over);
      window.clearTimeout(timer);
    };
  }, []);
  if (!tip) return null;
  const b = blurbs[tip.type];
  return (
    <div className={`optip fam-${familyOf(tip.type)}`} style={{ left: Math.max(8, tip.x), top: tip.y }} role="tooltip">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(b.what, true) }} />
    </div>
  );
}
