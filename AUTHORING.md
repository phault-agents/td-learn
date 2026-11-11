# Authoring guide

How lessons are written for TD Learning. Read this fully before writing or editing content.

## Audience and voice

* The learner **already knows the TouchDesigner UI**: panes, network editor, parameter dialogs, creating and wiring operators, display/render flags, operator families. Never explain those basics.
* The goal is fluency with **operators** and the ability to build **non-trivial** art and data visualization. Explain *why* a network is shaped the way it is, not just *what* to click.
* **Modern, POP-first.** Geometry and point data use POPs (TouchDesigner 2025.30000+). Mention SOPs only as contrast. CHOPs for time/control/audio, TOPs for images/post, DATs for data/code, COMPs as containers.
* Voice: direct, warm, expert. Second person. Short paragraphs. No filler ("In this lesson we will…" once is plenty). Original wording only — never paste text from the official docs.

## Accuracy rules (most important)

Learners will reproduce every graph in TouchDesigner. Wrong parameter names destroy trust.

1. **Every operator type and parameter label must come from the database.** Look them up:
   ```
   npx tsx scripts/opinfo.ts "Noise POP"        # pages, labels, python names, menu entries
   npx tsx scripts/opinfo.ts --search lookup     # find operators
   npx tsx scripts/opinfo.ts --family POP        # list a family
   ```
2. **Read the official description** before using an operator whose behaviour you're not certain of. The raw docs are cached locally (see the path given in your task, `docs/<Op_Name>.wiki`), or at `https://docs.derivative.ca/<Op_Name>`.
3. **Menu values** must be the menu *label* exactly as listed (e.g. `'Simplex 4D (GPU)'`).
4. If a label appears on more than one page, prefix the page: `'Xform:Translate'`, `'Output:Combine Operation'`.
5. If a label appears **twice on the same page** (e.g. Math Mix's uniform *Name* fields), use the Python name shown by `opinfo` as the key instead (`'vec0name'`).
6. **Sequential parameter blocks** (Math Mix *Combine* blocks, Map page blocks, Uniform blocks…) use a 0-based block suffix: `'Operation[0]'`, `'Scope A[0]'`, `'Operation[1]'`… Block 0 can also be written without the suffix.
7. Don't state default values, exact point counts, or exact visual results you can't verify. Prefer "try values around…", "roughly".
8. Removed operators (e.g. Line Thick POP, GLSL Create POP) must not be used. The validator enforces this.
9. Run `npm run validate -- --lesson <slug>` until it reports **0 errors and 0 warnings**, and `npx tsc --noEmit` until clean.

## Lesson file

One file per lesson in `src/content/lessons/`, default-exporting a `Lesson` (see `src/content/types.ts`). The reference example is `src/content/lessons/m1-first-pop-network.ts` — match its depth and structure.

Suggested structure:

1. `md` — hook: what we'll build and why it matters (1–2 short paragraphs).
2. `md` / `callout` (concept) — the key ideas, explained properly.
3. `graph` — the main network with **build-along steps**.
4. `md` — deeper explanation of the interesting parts (how/why it works, variations).
5. Optional second/third `graph` — a variation or an extension.
6. `callout`s — tips, performance notes, warnings, "make it yours" (tone `art`).
7. `challenge` × 2–3 — with hints and a solution.
8. `quiz` — 4–5 questions with explanations.

Targets: **1800–3000 words** of prose per lesson; main graph **8–25 nodes** with **5–10 steps**; total of 1–3 graphs.

### Markdown

* GitHub-flavored markdown in all `md` fields (template literals). Tables are fine.
* Operator chips: `[[Noise POP]]` or `[[Noise POP|the noise]]` → colored link to the Atlas. Use the exact operator label. Use chips the first time an operator appears in a section, not on every mention.
* Attributes and code in backticks: `` `P` ``, `` `Color.rgb` ``, `` `absTime.seconds` ``.
* Keys: `<kbd>i</kbd>`.
* Inside template literals escape backticks as `` \` ``.

## Graphs

```ts
{
  kind: 'graph',
  graph: {
    id: 'unique-in-lesson',
    title: 'Short title',
    root: '/project1',            // network path label
    height: 520,                  // optional
    caption: 'markdown under the graph',
    nodes: [ ... ],
    comments: [{ x, y, w, text }], // optional sticky notes (grid units)
    boxes: [{ title, nodes: [...ids], tone }], // optional network boxes
    steps: [{ title, body, nodes: [...introduced ids], focus: [...ids] }],
  },
}
```

### Nodes

```ts
{
  id: 'noise1',                  // the TD node name — learners will name theirs the same
  type: 'noisePOP',              // TD op type (Python create name), from opinfo
  x: 1, y: 0,                    // grid: x = columns (left→right flow), y = rows (down). Fractions ok.
  inputs: ['sphere1'],           // wires into input 0..n; same network, same family
  params: {                      // ONLY parameters that differ from default
    Type: 'Simplex 4D (GPU)',
    Amplitude: 0.3,
    'Translate 4D': { expr: 'absTime.seconds * 0.15' },   // expression
    Material: { ref: 'pbr1' },                            // OP reference (draws a dashed line)
    'Xform:Rotate': [0, { expr: 'absTime.seconds * 12' }, 0], // tuple, components may be expressions
    'Compute Point Normals': true,                        // toggle
    Weight: [true, 'w'],                                  // toggle + its output-name field (comps)
  },
  note: 'Markdown: why this node is here, what to look for.',
  flags: { display: true, render: true },
  children: [ ... ],             // COMPs: the network inside (ids unique across the whole graph)
  childComments: [ ... ],
  code: { lang: 'glsl', text: '...' },  // DAT text content (Text DAT, GLSL shader DAT, callbacks)
  table: [['name','value'], ['a','1']], // Table DAT contents
}
```

Conventions:

* **Name nodes like TouchDesigner would** (`noise1`, `lfo1`, `geo1`) unless a descriptive name genuinely helps (`spectrum`, `emitter`, `final`). Expressions reference names, so they must match.
* End chains in **Null** operators; put render/display flags on the Null POP inside a Geometry COMP.
* Layout: data flows left→right. Keep the root network compact: a Geometry COMP with its POPs inside (`children`), cameras/lights/materials below, render + post to the right. Avoid overlapping nodes (one node per grid cell).
* **Paths resolve from the network the operator sits in** (verified in TouchDesigner): a sibling is `'name'`, a node one level up is `'../name'`, a node inside a component is `'geo1/name'`. This applies to COMPs' own parameters too (Material, Look At, Default Instance OP, Window Operator, expressions on their Xform…): a Geometry COMP's sibling material is `'pbr1'`, not `'../pbr1'`. The validator checks every path and suggests the right one.
* **Expressions** that read other operators (`op('lfo1')['chan1']`) automatically draw a dashed reference line — use them instead of CHOP exports.
* **Every node gets a `note`** explaining its role (1–3 sentences).
* Steps: each introduces 1–3 nodes. The body says exactly what to create, name, set and wire. Use `focus` to revisit existing nodes. Nodes inside a COMP must be introduced in the same or a later step than the COMP.
* Every node should be introduced in exactly one step (the validator warns about unintroduced nodes).

## Operator blurbs

Every operator type used in a graph needs a blurb (validator warns otherwise). Core blurbs are in `src/content/blurbs/core.ts`; add missing ones to **your module's** blurb file (`src/content/blurbs/m<N>.ts`):

```ts
noisePOP: { what: 'One or two sentences in this course\'s voice.', tip: 'Optional practical tip.' },
```

## Values that equal the default

List parameters whose value matters to the lesson even when it's the default — the inspector shows
those under "Already the default — just check" (once `data/td_param_defaults.json` exists). Leave out
parameters that genuinely don't matter. `npm run validate -- --defaults` lists every value that equals
its TouchDesigner default so you can decide which to keep.

## Checks before you're done

```
npm run validate -- --lesson <slug>   # 0 errors, 0 warnings
npx tsc --noEmit                      # clean
```
