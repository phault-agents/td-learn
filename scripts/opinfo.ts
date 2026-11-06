/**
 * Look up operators and their parameters in the official-docs-derived database.
 *   npx tsx scripts/opinfo.ts "Noise POP"         # full parameter listing (pages, labels, menus)
 *   npx tsx scripts/opinfo.ts noisePOP            # same, by type
 *   npx tsx scripts/opinfo.ts --search lookup     # find operators by name
 *   npx tsx scripts/opinfo.ts --family POP        # list a family
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { labelIndex, type OpDB } from '../src/lib/opdb';

const here = dirname(fileURLToPath(import.meta.url));
const db: OpDB = JSON.parse(readFileSync(resolve(here, '../data/opdata.json'), 'utf8'));
const labels = labelIndex(db);
const args = process.argv.slice(2);

if (args[0] === '--search') {
  const q = (args[1] || '').toLowerCase();
  for (const [t, o] of Object.entries(db)) if (o.label.toLowerCase().includes(q) || t.toLowerCase().includes(q)) console.log(`${t.padEnd(28)} ${o.label}${o.removed ? '  [REMOVED]' : ''}`);
} else if (args[0] === '--family') {
  const f = (args[1] || '').toUpperCase();
  for (const [t, o] of Object.entries(db)) if (o.family === f) console.log(`${t.padEnd(28)} ${o.label}${o.removed ? '  [REMOVED]' : ''}`);
} else {
  for (const a of args) {
    const type = db[a] ? a : labels.get(a.toLowerCase());
    if (!type) { console.log(`?? ${a} — try --search`); continue; }
    const o = db[type];
    console.log(`\n=== ${o.label}  (type: ${type})${o.removed ? '  ** REMOVED **' : ''}`);
    for (const pg of o.pages) {
      if (pg.page === 'Common' && !args.includes('--common')) { console.log(`  [Common] (${pg.params.length} params, pass --common to show)`); continue; }
      console.log(`  [${pg.page}]`);
      for (const p of pg.params) {
        let s = `    ${p.label}  (${p.name}, ${p.type})`;
        if (p.menu) s += `\n        menu: ${p.menu.map((m) => `${m}`).join(' | ')}`;
        if (p.comps) s += `  comps: ${p.comps.join(',')}`;
        console.log(s);
      }
    }
  }
}
