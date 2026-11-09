/**
 * Writes scripts/td/dump_td_defaults.py — a script you run once inside TouchDesigner to record
 * every operator's parameter defaults and menu entries (the official docs don't list defaults).
 *
 *   npx tsx scripts/td/make-dump-script.ts
 *
 * The operator list is embedded so the script covers exactly the types in data/opdata.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpDB } from '../../src/lib/opdb';

const here = dirname(fileURLToPath(import.meta.url));
const db: OpDB = JSON.parse(readFileSync(resolve(here, '../../data/opdata.json'), 'utf8'));
const types = Object.entries(db)
  .filter(([, o]) => !o.removed && !o.experimental)
  .map(([t]) => t)
  .sort();

const lines: string[] = [];
for (let i = 0; i < types.length; i += 6) lines.push('    ' + types.slice(i, i + 6).map((t) => `'${t}'`).join(', ') + ',');

const py = `# TD Learning — parameter defaults dump
#
# Records the default value, menu entries, page and label of every parameter of every operator
# type the course site knows about, straight from your TouchDesigner build. The official docs
# don't list defaults, so this file is what lets the site mark "already the default" values.
#
# How to run (takes a few seconds; TouchDesigner pauses while it works):
#   1. Start a NEW, empty project (File > New) so nothing of yours is affected.
#   2. Create a Text DAT, paste this whole script into it, right-click the DAT > Run Script.
#   3. It writes td_param_defaults.json next to the project file and prints the path in the
#      Textport (Alt+T). Add that file to the repository as data/td_param_defaults.json.
#
# Operators are created inside a temporary Base COMP with cooking disabled, read, and destroyed
# again, so devices, network ports and windows are never opened.

import json

OP_TYPES = [
${lines.join('\n')}
]

# Add type names here to skip them if one ever causes trouble on your machine.
SKIP = []

def _plain(v):
    """Make parameter values JSON-friendly."""
    if isinstance(v, (bool, int, float, str)) or v is None:
        return v
    return str(v)

def _par_info(p):
    info = {'d': _plain(p.default)}
    for key, attr in (('label', 'label'), ('style', 'style'), ('tuplet', 'tupletName')):
        try:
            info[key] = _plain(getattr(p, attr))
        except Exception:
            pass
    try:
        info['page'] = p.page.name if p.page is not None else ''
    except Exception:
        pass
    try:
        mode = str(p.defaultMode)
        if 'EXPRESSION' in mode.upper():
            info['mode'] = 'expr'
            info['expr'] = p.defaultExpr
    except Exception:
        pass
    try:
        if p.isMenu:
            info['menuNames'] = [str(n) for n in p.menuNames]
            info['menuLabels'] = [str(n) for n in p.menuLabels]
    except Exception:
        pass
    return info

result = {
    'build': str(app.build),
    'version': str(app.version),
    'os': str(app.osName),
    'ops': {},
    'failed': {},
}

holder = me.parent().create(baseCOMP, 'tdl_defaults_scratch')
holder.allowCooking = False
try:
    for i, optype in enumerate(OP_TYPES):
        if optype in SKIP:
            continue
        try:
            o = holder.create(optype, initialize=False)
        except Exception as e:
            result['failed'][optype] = str(e)
            continue
        try:
            pars = {}
            for p in o.pars():
                if p.isCustom:
                    continue
                pars[p.name] = _par_info(p)
            result['ops'][optype] = pars
        except Exception as e:
            result['failed'][optype] = 'reading parameters: %s' % e
        finally:
            try:
                o.destroy()
            except Exception:
                pass
        if i % 50 == 0:
            print('[TD Learning] %d / %d operator types...' % (i, len(OP_TYPES)))
finally:
    holder.destroy()

path = project.folder + '/td_param_defaults.json'
with open(path, 'w') as f:
    json.dump(result, f, separators=(',', ':'))

print('[TD Learning] wrote %s' % path)
print('[TD Learning] %d operator types recorded, %d failed (build %s)' % (len(result['ops']), len(result['failed']), result['build']))
for k, v in result['failed'].items():
    print('    could not create %s: %s' % (k, v))
`;

writeFileSync(resolve(here, 'dump_td_defaults.py'), py);
console.log(`wrote scripts/td/dump_td_defaults.py (${types.length} operator types)`);
