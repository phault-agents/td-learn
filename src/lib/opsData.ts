import { useEffect, useState } from 'react';
import type { OpDB } from './opdb';

/** The generated operator database is large-ish, so it is lazy-loaded once. */
let cache: OpDB | null = null;
let pending: Promise<OpDB> | null = null;

export function loadOps(): Promise<OpDB> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = import('../generated/ops.json').then((m) => {
      cache = (m.default ?? m) as unknown as OpDB;
      return cache;
    });
  }
  return pending;
}

export function useOps(): OpDB | null {
  const [db, setDb] = useState<OpDB | null>(cache);
  useEffect(() => {
    if (!db) loadOps().then(setDb);
  }, [db]);
  return db;
}

export function docsUrl(label: string) {
  return `https://docs.derivative.ca/${label.replace(/ /g, '_')}`;
}
