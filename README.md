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

## Curriculum

**Module 1 — Thinking in Points** (foundations)

- 1.1 **Your First POP Network** — Build a living, lit noise sculpture — and learn the full path from points to pixels.
- 1.2 **Attributes: The Data on Every Point** — Read, write and reshape the numbers every point carries, then turn a noise field into a hand-tinted relief map.
- 1.3 **Driving POPs with CHOPs** — Oscillators, smoothing and integration feed your geometry — one value per frame, or one value per point.
- 1.4 **The Render Stack** — Materials, cameras, multiple objects, a feedback loop and a glow pass — from raw render to a finished, full-screen image.

**Module 2 — Shape, Repeat, Pattern** (intermediate)

- 2.1 **Fields & Weights** — Give every point a 0–1 "how much" — then use it to bend, tint and carve geometry.
- 2.2 **Instancing from POPs** — One box, two thousand buildings: let a POP point list place, size and color copies of a shape.
- 2.3 **Math Without Code: Generative Patterns** — A sunflower, a rose and a spirograph — built from point indices and a stack of Math Mix blocks.
- 2.4 **Lines, Curves & Strokes** — Draw with math: a harmonograph as one tapered, gradient-colored stroke — plus splines and ridgelines.

**Module 3 — Motion & Simulation** (intermediate)

- 3.1 **Audio-Reactive Geometry** — Turn a song into a ring of light that listens — every point owns a frequency band, the whole image glows with loudness.
- 3.2 **Particle Systems with the Particle POP** — Births, lifespans, forces and curl noise — build a column of embers that rises, swirls and burns out.
- 3.3 **Feedback Loops & Trails** — Write your own simulation step, keep it stable, and let thousands of seeds draw glowing lines through a curl-noise flow.
- 3.4 **Images & Video as Point Clouds** — Sample pixels into points, extrude them by brightness, cull the darkness and make a portrait glitter in 3D.

**Module 4 — Data Visualization** (intermediate)

- 4.1 **From Table to Geometry: 3D Bar Charts** — Turn rows into points, columns into attributes, and attributes into honest, animated bars.
- 4.2 **Time Series & Live Streams** — Record a live signal, turn its history into line strips and keep a scrolling chart honest and readable.
- 4.3 **Geo Data on a Globe** — Latitude and longitude to XYZ, spikes along the normal, and a live earthquake feed refreshed every minute.
- 4.4 **Networks, Proximity & Plexus** — Connect points by distance or by data: a living plexus, hubs sized by degree, and a graph built from an edge list.

**Module 5 — Advanced Techniques** (advanced)

- 5.1 **Compute Shaders with the GLSL POP** — Write your own per-point GPU code, and learn when it beats a stack of Math Mix blocks.
- 5.2 **Strange Attractors** — Integrate chaos on the GPU: thousands of particles tracing the Aizawa attractor, with glowing trails.
- 5.3 **Flocking with Neighbors** — Three local rules, one GPU loop: a few thousand boids that swirl, split and regroup on their own.
- 5.4 **TOP Simulations on POP Surfaces** — Grow a reaction-diffusion pattern in a GLSL TOP feedback loop, then wrap it around a breathing sphere.

**Module 6 — Production** (advanced)

- 6.1 **Performance & Profiling** — Measure first, then make it fast: frame budgets, CPU vs GPU time, POP memory and the stalls that eat your frame rate.
- 6.2 **Reusable Components & Custom Parameters** — Turn a particle effect into a tool: one component with its own controls, behaviour and version number, ready to drop into any project.
- 6.3 **Interaction & Live Control** — Mouse, keys, MIDI and OSC: turn raw input into smooth, reliable control — and build a field of points that parts around your hand.
- 6.4 **Capstone: An Audio-Reactive Installation** — Everything at once: listen to a room, move fifty thousand particles to it, glow, and run unattended all night.


## Develop

```bash
npm install
npm run dev        # local dev server
npm run validate   # check all lesson content against the operator database
npm run build      # generate data, typecheck, build static site into dist/
```

The build is a static, relocatable site (`dist/`), hash-routed — host it anywhere (GitHub Pages,
Netlify, a file server). `.github/workflows/deploy.yml` publishes it to GitHub Pages on pushes to
`main` once Pages is enabled with "GitHub Actions" as the source.

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
