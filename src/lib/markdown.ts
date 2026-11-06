import { Marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import glsl from 'highlight.js/lib/languages/glsl';
import json from 'highlight.js/lib/languages/json';
import plaintext from 'highlight.js/lib/languages/plaintext';
import { familyOf } from './opdb';

hljs.registerLanguage('python', python);
hljs.registerLanguage('glsl', glsl);
hljs.registerLanguage('json', json);
hljs.registerLanguage('plaintext', plaintext);

export function highlight(code: string, lang: string): string {
  const l = lang === 'csv' || lang === 'text' ? 'plaintext' : lang;
  try {
    if (hljs.getLanguage(l)) return hljs.highlight(code, { language: l }).value;
  } catch {
    /* fall through */
  }
  return escapeHtml(code);
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** 'Noise POP' → 'noisePOP' (mirrors scripts/opdata/build_opdata.py) */
export function typeFromLabel(label: string): string {
  const fam = label.trim().split(/\s+/).pop() || '';
  const base = label.trim().slice(0, label.trim().length - fam.length);
  return base.toLowerCase().replace(/[^a-z0-9]/g, '') + fam;
}

export function opChipHtml(label: string, text?: string) {
  const t = /\s/.test(label) ? typeFromLabel(label) : label;
  const fam = familyOf(t);
  return `<a class="opchip fam-${fam}" href="#/atlas/${t}" data-op="${t}"><span class="opchip-dot"></span>${escapeHtml(text || label)}</a>`;
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const l = (lang || 'plaintext').trim();
      return `<pre class="md-code"><code class="hljs language-${escapeHtml(l)}">${highlight(text, l)}</code></pre>`;
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const ext = /^https?:/.test(href);
      return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>${inner}</a>`;
    },
    table(token) {
      // wrap tables so they can scroll horizontally on phones
      let header = '';
      for (const cell of token.header) header += this.tablecell(cell);
      let body = '';
      for (const row of token.rows) {
        let r = '';
        for (const cell of row) r += this.tablecell(cell);
        body += `<tr>${r}</tr>`;
      }
      return `<div class="md-table"><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
    },
  },
});

const CHIP = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Render course markdown. Supports [[Op Label]] / [[Op Label|text]] operator chips. */
export function renderMarkdown(md: string, inline = false): string {
  const pre = md.replace(CHIP, (_, label: string, text?: string) => opChipHtml(label.trim(), text?.trim()));
  return inline ? (marked.parseInline(pre) as string) : (marked.parse(pre) as string);
}
