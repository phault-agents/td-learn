/**
 * Loads the operator database used by the scripts: data/opdata.json (from the official docs),
 * merged with data/td_param_defaults.json (recorded from TouchDesigner) when that file exists.
 * Set TDL_DEFAULTS=<path> to use a different dump file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpDB } from '../../src/lib/opdb';
import { mergeDump, type MergeStats, type TDDump } from '../../src/lib/defaults';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function loadDB(): { db: OpDB; stats: MergeStats | null; dumpPath: string | null } {
  const db: OpDB = JSON.parse(readFileSync(resolve(root, 'data/opdata.json'), 'utf8'));
  const dumpPath = process.env.TDL_DEFAULTS ? resolve(process.env.TDL_DEFAULTS) : resolve(root, 'data/td_param_defaults.json');
  if (!existsSync(dumpPath)) return { db, stats: null, dumpPath: null };
  const dump: TDDump = JSON.parse(readFileSync(dumpPath, 'utf8'));
  const merged = mergeDump(db, dump);
  return { db: merged.db, stats: merged.stats, dumpPath };
}
