import { useMemo } from 'react';
import { renderMarkdown } from '../lib/markdown';

export function Markdown({ md, className = 'prose', inline }: { md: string; className?: string; inline?: boolean }) {
  const html = useMemo(() => renderMarkdown(md, inline), [md, inline]);
  if (inline) return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
