# TD Learning — POP-first TouchDesigner

An interactive course that teaches TouchDesigner the modern way: POPs (the GPU point/geometry
family introduced in TouchDesigner 2025) at the center, with CHOPs, TOPs, DATs and COMPs around
them. Lessons go from a first POP network to GLSL compute shaders, simulations, data
visualization and a finished installation.

* **Interactive network graphs** — every lesson network is drawn like TouchDesigner's network
  editor: family-colored nodes, wires, reference links, nested COMPs you can dive into, and an
  inspector that lists exactly which parameters to change.
* **Build-along steps** — rebuild each network node by node, ticking off what you've built.
* **Verified parameter names** — every operator, parameter label and menu value in the content is
  checked against a database generated from the official documentation.
* **Operator Atlas** — every POP plus every operator used in the course, with parameter listings.
* **Build scripts (beta)** — generate a TouchDesigner Python script that recreates a lesson graph.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run validate   # check all lesson content against the operator database
npm run build      # generate data, typecheck, build static site into dist/
```

The build is a static, relocatable site (`dist/`), hash-routed — host it anywhere (GitHub Pages,
Netlify, a file server).

## Content

* Lessons: `src/content/lessons/*.ts` (typed by `src/content/types.ts`), ordered in
  `src/content/curriculum.ts`.
* Operator descriptions: `src/content/blurbs/*.ts`. Reference sheets: `src/content/reference.ts`.
* Writing guide: [AUTHORING.md](AUTHORING.md).
* `scripts/opinfo.ts` looks up operators and parameters: `npx tsx scripts/opinfo.ts "Noise POP"`.

## Operator database

`data/opdata.json` holds parameter metadata (labels, Python names, types, menu entries — no
prose) for ~560 operators, extracted from the official TouchDesigner wiki with
`scripts/opdata/build_opdata.py` (see `scripts/opdata/README.md`). `npm run gen` writes the
subset the site needs to `src/generated/ops.json`.

TouchDesigner is a trademark of Derivative Inc. This project is independent and not affiliated
with Derivative.
