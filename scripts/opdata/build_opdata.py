"""Build a compact operator/parameter database from TouchDesigner wiki raw pages.
Only factual parameter metadata is kept (labels, python names, types, menu entries) - no prose."""
import re, json, sys, os, glob
DOCS, TMPL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
FAMS = ['POP','TOP','CHOP','SOP','DAT','COMP','MAT']
SKIP = {'POP','CHOP','TOP','SOP','DAT','COMP','MAT', 'Write a GLSL POP', 'Write GLSL POPs'}
tmpl = {}
for f in glob.glob(TMPL + '/*.wiki'):
    tmpl[os.path.basename(f)[:-5].replace('_', ' ').lower()] = open(f).read()
def expand(text, depth=0):
    if depth > 3: return text
    def rep(m):
        key = m.group(1).replace('_', ' ').strip().lower()
        return expand(tmpl[key], depth + 1) if key in tmpl else ''
    return re.sub(r'\{\{:([^}|]*)\}\}', rep, text)
def clean(s):
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"'''?", "", s); s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', s).strip()
def templates(text, name, nested=False):
    """yield inner text of each top-level-or-nested {{name ...}} occurrence with balanced braces"""
    out = []; i = 0
    pat = re.compile(r'\{\{' + name + r'(?=[\s|])')
    while True:
        m = pat.search(text, i)
        if not m: break
        depth = 0; j = m.start()
        while j < len(text):
            if text.startswith('{{', j): depth += 1; j += 2; continue
            if text.startswith('}}', j):
                depth -= 1; j += 2
                if depth == 0: break
                continue
            j += 1
        out.append(text[m.end():j-2]); i = m.end() if nested else j
    return out
def fields(inner):
    """top-level |key=value fields of a template body"""
    res = {}; depth = 0; cur = ''; parts = []
    k = 0
    while k < len(inner):
        if inner.startswith('{{', k): depth += 1; cur += '{{'; k += 2; continue
        if inner.startswith('}}', k): depth -= 1; cur += '}}'; k += 2; continue
        c = inner[k]
        if c == '|' and depth == 0: parts.append(cur); cur = ''
        else: cur += c
        k += 1
    parts.append(cur)
    for p in parts:
        if '=' in p:
            key, val = p.split('=', 1); res[key.strip()] = val.strip()
    return res
def typename(label, family):
    return re.sub(r'[^a-z0-9]', '', label.lower()) + family
ops = {}
for f in sorted(glob.glob(DOCS + '/*.wiki')):
    title = os.path.basename(f)[:-5].replace('_', ' ')
    fam = title.split(' ')[-1]
    if fam not in FAMS or title in SKIP: continue
    raw = open(f).read()
    if raw.startswith('#REDIRECT'): continue
    text = re.sub(r'<!--.*?-->', '', expand(raw), flags=re.S)
    label = title
    removed = False
    summ = templates(raw, 'Summary')
    if summ:
        long = clean(fields(summ[0]).get('long', ''))
        if re.search(r'has been removed|is (now )?obsolete|has been deprecated|been replaced by', long[:500], re.I): removed = True
    pages = []; seen = {}
    for pb in templates(text, 'ParameterPage'):
        pf = fields(pb)
        pname = clean(pf.get('pageName', ''))
        params = []
        for par in templates(pb, 'Parameter', nested=True):
            ff = fields(par)
            name = ff.get('parName', '').strip()
            if not name:  # older format: parName only inside items
                m = re.search(r'\|parName=([A-Za-z0-9_]+)', par); name = m.group(1) if m else ''
            if not name: continue
            p = {'label': clean(ff.get('parLabel', '')), 'name': name, 'type': ff.get('parType', '').strip()}
            items = [fields(it) for it in templates(par, 'ParameterItem')]
            items = [it for it in items if it.get('itemLabel') is not None]
            if items:
                if 'Menu' in p['type'] or (p['type'] == '' and len(items) > 1):
                    p['menu'] = [clean(it.get('itemLabel', '')) for it in items]
                    p['menuNames'] = [clean(it.get('itemName', '')) for it in items]
                else:
                    p['comps'] = [clean(it.get('itemName', '')) for it in items]
            if 'Menu' in p['type'] and 'menu' not in p and re.search(r'unit', p['name'] + ' ' + p['label'], re.I):
                # unit menus are documented only in prose ("Samples, Frames, or Seconds")
                summ = clean(ff.get('parSummary', ''))
                found = [u for u in ('Samples', 'Frames', 'Seconds') if re.search(u, summ, re.I)]
                if found:
                    p['menu'] = found
                    p['menuNames'] = [u.lower() for u in found]
            params.append(p)
        if not params: continue
        if pname in seen: seen[pname]['params'] += params
        else:
            pg = {'page': pname, 'params': params}; seen[pname] = pg; pages.append(pg)
    t = typename(label[:-len(fam)].strip(), fam)
    ops[t] = {'label': label, 'family': fam, 'pages': pages}
    if removed or t in ('glslcreatePOP',): ops[t]['removed'] = True
    if title.startswith('Experimental'): ops[t]['experimental'] = True
json.dump(ops, open(OUT, 'w'), separators=(',', ':'))
print(len(ops), 'ops;', sum(1 for o in ops.values() if o.get('removed')), 'removed;', os.path.getsize(OUT)//1024, 'KB')
