import { useSyncExternalStore } from 'react';

/** Minimal hash router: routes look like #/lesson/attributes, #/atlas/noisePOP */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
function getHash() {
  return window.location.hash || '#/';
}

export interface Route {
  name: 'home' | 'learn' | 'lesson' | 'atlas' | 'op' | 'reference' | 'notfound';
  param?: string;
  /** optional sub-anchor, e.g. #/lesson/attributes/graph-id */
  sub?: string;
}

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (!parts.length) return { name: 'home' };
  switch (parts[0]) {
    case 'learn':
      return { name: 'learn' };
    case 'lesson':
      return parts[1] ? { name: 'lesson', param: parts[1], sub: parts[2] } : { name: 'learn' };
    case 'atlas':
      return parts[1] ? { name: 'op', param: parts[1] } : { name: 'atlas' };
    case 'reference':
      return { name: 'reference', param: parts[1] };
    default:
      return { name: 'notfound' };
  }
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash, () => '#/');
  return parseHash(hash);
}

export function href(...parts: string[]) {
  return '#/' + parts.map(encodeURIComponent).join('/');
}

export function navigate(h: string) {
  window.location.hash = h.replace(/^#/, '');
}
