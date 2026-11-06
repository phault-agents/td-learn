import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'dataviz-networks',
  title: 'Networks, Proximity & Plexus',
  subtitle: 'Connect points by distance or by data: a living plexus, hubs sized by degree, and a graph built from an edge list.',
  minutes: 45,
  summary:
    'Two kinds of networks. A plexus: drifting points connected by the [[Proximity POP]], lines that fade as they stretch, and nodes sized by how many neighbours the [[Neighbor POP]] finds. Then a graph built from data: node and edge tables turned into points and line primitives by the [[DAT to POP]], edge weight mapped to line width, labels from the same table.',
  objectives: [
    'Connect nearby points with the [[Proximity POP]] and control density with distance and line limits',
    'Move primitive attributes onto points with the [[Facet POP]] and [[Attribute Convert POP]] so the [[Line MAT]] can use them',
    'Count neighbours with the [[Neighbor POP]] and encode degree as node size',
    'Build nodes and edges from tables with the [[DAT to POP]]\'s Points and Primitives pages',
    'Know which visual properties of a network carry data — and which are just layout',
  ],
  requires: ['dataviz-tables', 'lines-and-curves'],
  tags: ['data viz', 'networks', 'proximity', 'neighbor', 'plexus', 'line mat', 'graphs'],
  blocks: [
    {
      kind: 'md',
      md: `
A network is the simplest structure that isn't a list: things, and connections between them. It's also one of the most seductive things to draw. A cloud of points with lines between the close ones — the "plexus" look — has been a motion-graphics staple for years, and the same machinery can draw real relationships: who talks to whom, which parts of a system depend on which.

This lesson builds both. First a **plexus**, where connections come from *space*: two points are linked because they're near each other. Then a **graph from data**, where connections come from a *table*: two nodes are linked because the data says so. Same operators, same rendering — very different meaning, and it's worth being clear which one you're showing.

## Points and lines, nothing else

POP geometry has exactly what a network needs. **Points** are the nodes. **Line primitives** — two vertices each — are the edges. A vertex is just an index into the point list, so an edge "from node 3 to node 7" is literally a line primitive whose vertices are 3 and 7. Attributes can live on either: a node's size on its point, an edge's weight on its primitive.

The catch is rendering. The [[Line MAT]] reads **point** attributes for per-line width and color. When an edge's information lives on the primitive, and its two points are shared with other edges, there's no point attribute that could hold "this edge's weight". You'll see how to solve that properly in a minute — it's the most reusable trick in this lesson.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'What carries meaning in a network picture',
      md: `* **Connections** — whether an edge exists. Always data (or, in a plexus, derived from distance).
* **Edge width or brightness** — weight, strength, traffic. Data, if you map it.
* **Node size** — often *degree*, the number of connections. Data, if you map it.
* **Position and edge length** — in a plexus, real distances. In a laid-out graph, mostly **layout**: an algorithm or a person put the nodes there. Don't read meaning into the distance between two nodes unless the layout was designed to make it meaningful.

Most network confusion comes from that last line.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'plexus',
        title: 'Living plexus',
        root: '/project1',
        height: 620,
        caption:
          '`geo_plexus` makes and connects the drifting points; `geo_nodes` reuses the same points (via a Select POP) to draw them as dots sized by their number of neighbours. Two Line MATs: one strokes lines only, one draws points only.',
        nodes: [
          {
            id: 'geo_plexus',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 4' }, 0],
              Material: { ref: '../mat_lines' },
            },
            note: 'Generates the cloud and the connecting lines. A slow spin shows off the depth; `geo_nodes` uses the same expression so dots and lines stay together.',
            children: [
              {
                id: 'ptgen1',
                type: 'pointgeneratorPOP',
                x: 0,
                y: 0,
                params: {
                  Shape: 'Box',
                  'Create Point Primitives': true,
                  'Number of Points': 400,
                  Distribution: 'Volume',
                  Random: true,
                  Size: [4, 2.4, 1.2],
                },
                note: '400 random points filling a flat box. Point primitives are on so the nodes can also be drawn as dots later.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['ptgen1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.5,
                  Amplitude: 0.35,
                  'Translate 4D': { expr: 'absTime.seconds * 0.08' },
                },
                note: 'Slow 4D noise makes every point wander in place. Because points drift, pairs keep crossing the connection distance — that\'s what makes a plexus feel alive.',
              },
              {
                id: 'proximity1',
                type: 'proximityPOP',
                x: 2,
                y: 0,
                inputs: ['noise1'],
                params: {
                  'Maximum Distance': 0.45,
                  'Max Lines per Point': 6,
                  'Duplicate Lines': 'Avoid',
                  'Line Length': true,
                },
                note: 'Connects every point to neighbours closer than *Maximum Distance*, at most 6 lines each, one line per pair. *Line Length* (Output page) stores each line\'s length as a primitive attribute, `LineLength`.',
              },
              {
                id: 'facet1',
                type: 'facetPOP',
                x: 3,
                y: 0,
                inputs: ['proximity1'],
                params: { Operation: 'Unique Points', 'Remove Unused Points': true },
                note: 'Gives every line its **own two points**. Before this, one point was shared by up to six lines, so it couldn\'t carry a per-line value.',
              },
              {
                id: 'attrconvert1',
                type: 'attributeconvertPOP',
                x: 4,
                y: 0,
                inputs: ['facet1'],
                params: { 'Convert Operation': 'Primitive to Point', 'Input Attributes': 'LineLength' },
                note: 'Copies each line\'s `LineLength` onto its two (now private) points. Primitive data is now point data the Line MAT can read.',
              },
              {
                id: 'rerange1',
                type: 'rerangePOP',
                x: 5,
                y: 0,
                inputs: ['attrconvert1'],
                params: {
                  'Input Attribute Scope': 'LineLength',
                  'Map from Low': 0,
                  'Map from High': { expr: "op('proximity1').par.maxdist" },
                  'Map to Low': 1,
                  'Map to High': 0,
                  'Output Attribute Scope': 'LineWidth',
                },
                note: 'Short lines → full width, lines at the connection limit → zero width. Lines now thin out smoothly before they disconnect, instead of popping. *Map from High* follows the Proximity distance by expression.',
              },
              {
                id: 'null_lines',
                type: 'nullPOP',
                x: 6,
                y: 0,
                inputs: ['rerange1'],
                flags: { display: true, render: true },
                note: 'Line primitives with a `LineWidth` per point.',
              },
            ],
          },
          {
            id: 'geo_nodes',
            type: 'geometryCOMP',
            x: 0,
            y: 1.3,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 4' }, 0],
              Material: { ref: '../mat_nodes' },
            },
            note: 'The same points drawn as dots. Separate COMP, separate material: one Line MAT draws only lines, the other only points.',
            children: [
              {
                id: 'select1',
                type: 'selectPOP',
                x: 0,
                y: 0,
                params: { POP: { ref: '../geo_plexus/noise1' } },
                note: 'Fetches the drifting points from the other Geometry COMP — no copy, just a reference.',
              },
              {
                id: 'neighbor1',
                type: 'neighborPOP',
                x: 1,
                y: 0,
                inputs: ['select1'],
                params: {
                  'Max Neighbors Distance': { expr: "op('../geo_plexus/proximity1').par.maxdist" },
                  'Max Neighbors': 16,
                  'Num Neighbors': true,
                },
                note: 'Counts, for every point, the other points within the same distance the Proximity POP uses: that\'s the node\'s *degree* in a proximity graph (before the 6-line cap). Stored in `NumNebrs`.',
              },
              {
                id: 'rerange2',
                type: 'rerangePOP',
                x: 2,
                y: 0,
                inputs: ['neighbor1'],
                params: {
                  'Input Attribute Scope': 'NumNebrs',
                  'Map from Low': 0,
                  'Map from High': 10,
                  'Map to Low': 0.5,
                  'Map to High': 2.5,
                  'Cast to': 'Float',
                  'Output Attribute Scope': 'PointScale',
                },
                note: 'Degree → dot size. Isolated points stay visible (0.5), hubs grow. `NumNebrs` is an unsigned integer, so cast the result to float.',
              },
              {
                id: 'null_nodes',
                type: 'nullPOP',
                x: 3,
                y: 0,
                inputs: ['rerange2'],
                flags: { display: true, render: true },
                note: 'Point primitives with `PointScale`.',
              },
            ],
          },
          {
            id: 'mat_lines',
            type: 'lineMAT',
            x: 1,
            y: 0,
            params: {
              'Distance Near': 3,
              'Distance Far': 7,
              'Width Near': 1.4,
              'Width Far': 0.6,
              'Line Width Attribute': 'LineWidth',
              'Line Near Color': [0.55, 0.78, 1],
              'Specify Line Far Color': true,
              'Line Far Color': [0.12, 0.18, 0.3],
            },
            note: 'Lines get thinner and darker with distance from the camera — a cheap, effective depth cue — and their per-point `LineWidth` tapers long connections away.',
          },
          {
            id: 'mat_nodes',
            type: 'lineMAT',
            x: 1,
            y: 1.3,
            params: {
              'Draw Lines': false,
              'Draw Points': true,
              'Point Type': 'Circle',
              'Point Size Multiplier': 2,
              'Point Size Attribute': 'PointScale',
              'Point Near Color': [0.95, 0.97, 1],
            },
            note: 'Points only: crisp camera-facing circles, sized by `PointScale`.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 2,
            y: -0.8,
            params: { 'Xform:Translate': [0, 0, 5] },
            note: 'A perspective camera: this is an atmospheric piece, and the depth is part of the look.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 3,
            y: 0.6,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo_plexus geo_nodes' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.025, 0.04, 1],
            },
            note: 'Both COMPs, no lights (Line MATs are unlit).',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 0.6,
            inputs: ['render1'],
            note: 'The finished plexus.',
          },
        ],
        steps: [
          {
            title: 'A drifting cloud',
            body: `Create a **Geometry COMP** \`geo_plexus\` and clear it. Inside, add a **Point Generator POP** \`ptgen1\`: *Shape* **Box**, *Number of Points* **400**, *Distribution* **Volume**, *Random* on, *Create Point Primitives* on, *Size* **4, 2.4, 1.2**.

Append a **Noise POP** \`noise1\`: *Type* **Simplex 4D (GPU)**, *Period* **1.5**, *Amplitude* **0.35**, *Translate 4D* = \`absTime.seconds * 0.08\`.`,
            nodes: ['geo_plexus', 'ptgen1', 'noise1'],
          },
          {
            title: 'Connect the close ones',
            body: `Append a **Proximity POP** \`proximity1\`: *Maximum Distance* **0.45**, *Max Lines per Point* **6**, *Duplicate Lines* **Avoid**; on the *Output* page turn on **Line Length**. Append a **Null POP** \`null_lines\` with render + display on.

Middle-click \`proximity1\`: line primitives, plus a \`LineLength\` primitive attribute. Try *Maximum Distance* 0.3 and 0.7 to feel how quickly density grows.`,
            nodes: ['proximity1', 'null_lines'],
          },
          {
            title: 'A material and a camera',
            body: `At the root, create a **Line MAT** \`mat_lines\` and assign it to \`geo_plexus\` (*Material* \`../mat_lines\` — paths on a COMP's own parameters start inside the COMP). For now set *Line Near Color* to a light blue.

Create a **Camera COMP** \`cam1\` at **0, 0, 5**.`,
            nodes: ['mat_lines', 'cam1'],
          },
          {
            title: 'Render',
            body: `Create a **Render TOP** \`render1\` (*Camera(s)* \`cam1\`, *Geometry* \`geo_plexus\`, *Anti-Alias* **4x**, near-black background) and a **Null TOP** \`out1\`. You have a plexus — but every line is equally heavy, and lines blink on and off at the distance limit.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'Fade long lines',
            body: `Between \`proximity1\` and \`null_lines\`, insert:

1. **Facet POP** \`facet1\`: *Operation* **Unique Points**, *Remove Unused Points* on.
2. **Attribute Convert POP** \`attrconvert1\`: *Convert Operation* **Primitive to Point**, *Input Attributes* \`LineLength\`.
3. **ReRange POP** \`rerange1\`: *Input* \`LineLength\`, from **0** to \`op('proximity1').par.maxdist\` (expression) → to **1** … **0**, *Output* \`LineWidth\`.

On \`mat_lines\` → *Attributes*, set *Line Width Attribute* to \`LineWidth\`. Lines now taper to nothing before they break.`,
            nodes: ['facet1', 'attrconvert1', 'rerange1'],
          },
          {
            title: 'Nodes from the same points',
            body: `Create a second Geometry COMP \`geo_nodes\`. Inside, a **Select POP** \`select1\` with *POP* \`../geo_plexus/noise1\`, then a **Null POP** \`null_nodes\` (render + display on). Add \`geo_nodes\` to the Render TOP's *Geometry*.`,
            nodes: ['geo_nodes', 'select1', 'null_nodes'],
          },
          {
            title: 'Size by degree',
            body: `Between \`select1\` and \`null_nodes\`, insert a **Neighbor POP** \`neighbor1\` (*Max Neighbors Distance* = \`op('../geo_plexus/proximity1').par.maxdist\`, *Max Neighbors* **16**, **Num Neighbors** on) and a **ReRange POP** \`rerange2\` (\`NumNebrs\` from **0–10** to **0.5–2.5**, *Cast to* **Float**, output \`PointScale\`).

Create a **Line MAT** \`mat_nodes\`: *Draw Lines* off, *Draw Points* on, *Point Type* **Circle**, *Point Size Multiplier* **2**, *Point Size Attribute* \`PointScale\`, near-white *Point Near Color*. Assign it to \`geo_nodes\`.`,
            nodes: ['neighbor1', 'rerange2', 'mat_nodes'],
          },
          {
            title: 'Depth and motion',
            body: `On \`mat_lines\`: *Distance Near* **3**, *Distance Far* **7**, *Width Near* **1.4**, *Width Far* **0.6**, turn on *Specify Line Far Color* and pick a dark blue. Lines at the back are now thinner and darker.

Finally give \`geo_plexus\` and \`geo_nodes\` the same *Rotate Y* expression, \`absTime.seconds * 4\`.`,
            focus: ['mat_lines', 'geo_plexus', 'geo_nodes'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## How the Proximity POP decides

For each point, the [[Proximity POP]] looks for other points between *Minimum Distance* and *Maximum Distance* and creates **line primitives** to them — two-vertex lines, not strips. Three settings shape the result:

* **Maximum Distance** is the big one. In a volume, the number of candidates grows with the *cube* of the distance, so small changes have large effects. Tune it with the point count: more points, shorter distance.
* **Max Lines per Point** caps the density and the memory. Without it, a dense cluster becomes a solid smear.
* **Duplicate Lines** — with *Avoid*, A–B and B–A don't both appear, which matters when lines are translucent or you count them.

*Uniform Distribution* picks a more even sample of the candidates instead of the first ones found — useful when the cap is low and you see lines bunching in one direction.

Its output size is only known on the GPU, so the Proximity POP reserves room for the maximum it *could* produce and passes the real count down through GPU buffers. That's why the info popup can look odd, and why you should avoid asking the CPU for its point or primitive count every frame (the *Copy Topology Info Back to CPU* toggle exists, at the price of a stall).

## The primitive → point trick

The Line MAT varies width and color per **point**. The Proximity POP describes each connection on its **primitive**. Bridging them takes two nodes, and you'll reuse the pair constantly:

1. [[Facet POP]] with *Unique Points*: every primitive gets its own copies of its points. A node shared by six lines becomes six coincident points, one per line.
2. [[Attribute Convert POP]] with *Primitive to Point*: each line's attribute is copied onto its two private points.

Now "this line's length" is a point attribute, and anything per-line — weight, type, age — can drive the stroke. The cost is more points (two per line), which is nothing at plexus scale.

## Degree and the Neighbor POP

The [[Neighbor POP]] answers "who is near me?" for every point at once. It can output the neighbours' indices (\`Nebr\`, an array), their count (\`NumNebrs\`), their distances, or the average of any of their attributes. Here only the count matters: within the Proximity POP's distance, the number of neighbours is the node's **degree** in the proximity graph — before the *Max Lines per Point* cap trims what's drawn. Mapping it to dot size makes hubs visible at a glance: denser regions of the cloud literally light up.

Its *Neighbors Type* menu has a second mode, **Connected**, where neighbours are points joined by an edge instead of points within a distance. That's how you'd compute degree on a graph built from data, which is next.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Plexus budgets',
      md: `* Cost grows with points × candidates, and candidates grow fast with *Maximum Distance*. Halving the distance is often better than halving the points.
* Set *Num Hash Buckets* (on both Proximity and Neighbor) roughly to your point count — the docs\' own rule of thumb.
* Keep *Max Lines per Point* as low as the look allows: memory is reserved for the maximum.
* Never put a [[POP to DAT]] or Python \`numPoints()\` on the Proximity output in a running show — each read waits for the GPU.`,
    },
    {
      kind: 'md',
      md: `
## A graph from tables

Now the connections come from data. The [[DAT to POP]] has a *Primitives* page for exactly this: give it a second table where each row is a primitive and one column lists that primitive's **vertex indices** — the row numbers of the nodes it connects. With *Prim Type* set to **Lines**, each row becomes one edge. Every other column on that table becomes a **primitive attribute**, so an edge weight arrives already attached to its edge.

The vertex column holds point indices separated by spaces, like \`0 3\`. That's the same layout a [[POP to DAT]] produces when it extracts primitives — if your build expects something different, extract the primitives of any Line POP with a POP to DAT and copy the format you see.

The dataset below is **invented**: a toy dependency map of a TouchDesigner project, where a weight counts how many references run between two parts.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'table-graph',
        title: 'Graph from an edge list',
        root: '/project1',
        height: 540,
        caption:
          'Two tables — nodes (with hand-made layout positions) and edges (vertex pairs plus a weight) — become one POP with points and line primitives. The same node table feeds the labels. Render it with the camera and Render TOP from the plexus (swap the *Geometry* field to `geo_graph geo_labels`), or build a separate pair.',
        nodes: [
          {
            id: 'nodes',
            type: 'tableDAT',
            x: 0,
            y: 0,
            table: [
              ['text', 'tx', 'ty'],
              ['audio', '-1.6', '0.6'],
              ['analyze', '-0.8', '0.95'],
              ['noise', '-1.4', '-0.5'],
              ['particles', '0', '0.2'],
              ['feedback', '0.2', '-0.8'],
              ['render', '1', '0.1'],
              ['post', '1.6', '0.75'],
              ['output', '1.75', '-0.45'],
              ['osc', '-0.55', '-1.05'],
              ['ui', '0.8', '1.05'],
            ],
            note: 'One row per node: a name and a **hand-made layout** position. Row order is the node index (audio = 0, analyze = 1, …). The same table drives the labels.',
          },
          {
            id: 'edges',
            type: 'tableDAT',
            x: 0,
            y: 1.2,
            table: [
              ['vertices', 'weight'],
              ['0 1', '5'],
              ['1 3', '4'],
              ['2 3', '3'],
              ['3 4', '2'],
              ['2 4', '2'],
              ['3 5', '5'],
              ['4 5', '1'],
              ['5 6', '4'],
              ['6 7', '5'],
              ['8 3', '1'],
              ['9 1', '1'],
              ['9 6', '2'],
            ],
            note: '**Invented sample data.** One row per edge: the two node indices it connects, and a weight (how many references link those parts).',
          },
          {
            id: 'geo_graph',
            type: 'geometryCOMP',
            x: 1,
            y: 0.6,
            params: { Material: { ref: '../mat_graph' } },
            note: 'Edges and node dots, drawn by one Line MAT.',
            children: [
              {
                id: 'dattopop1',
                type: 'dattoPOP',
                x: 0,
                y: 0,
                params: {
                  'Points DAT': { ref: '../nodes' },
                  'Points:Convert All Excluding': true,
                  'Primitives DAT': { ref: '../edges' },
                  'Prim Type': 'Lines',
                  'Vertices Column': 'vertices',
                  'Primitives:Convert All Excluding': true,
                },
                note: 'Points from `nodes` (exclude `text`), line primitives from `edges`. On the *Primitives* page, put `vertices` in *Exclude Columns* so only `weight` becomes a primitive attribute.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 1,
                y: 0,
                inputs: ['dattopop1'],
                params: {
                  'Operation[0]': 'A * B',
                  'Scope A[0]': '1 0 0',
                  'Scope B[0]': 'tx',
                  'Result Scope[0]': 'P',
                  'Operation[1]': 'A * B + C',
                  'Scope A[1]': '0 1 0',
                  'Scope B[1]': 'ty',
                  'Scope C[1]': 'P',
                  'Result Scope[1]': 'P',
                },
                note: 'Builds `P = (tx, ty, 0)` from the layout columns: `1 0 0 × tx`, then add `0 1 0 × ty`.',
              },
              {
                id: 'facet2',
                type: 'facetPOP',
                x: 2,
                y: 0,
                inputs: ['mathmix1'],
                params: { Operation: 'Unique Points' },
                note: 'Same trick as the plexus: private points per edge…',
              },
              {
                id: 'attrconvert2',
                type: 'attributeconvertPOP',
                x: 3,
                y: 0,
                inputs: ['facet2'],
                params: { 'Convert Operation': 'Primitive to Point', 'Input Attributes': 'weight' },
                note: '…so each edge\'s `weight` can live on its own two points.',
              },
              {
                id: 'rerange3',
                type: 'rerangePOP',
                x: 4,
                y: 0,
                inputs: ['attrconvert2'],
                params: {
                  'Input Attribute Scope': 'weight',
                  'Map from Low': 0,
                  'Map from High': 5,
                  'Map to Low': 0,
                  'Map to High': 3,
                  'Output Attribute Scope': 'LineWidth',
                },
                note: 'Weight → stroke width, starting from zero so width stays proportional to weight.',
              },
              {
                id: 'null_graph',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['rerange3'],
                flags: { display: true, render: true },
                note: 'Ten nodes, twelve weighted edges.',
              },
            ],
          },
          {
            id: 'mat_graph',
            type: 'lineMAT',
            x: 2,
            y: 0.6,
            params: {
              'Width Near': 1.5,
              'Width Far': 1.5,
              'Line Width Attribute': 'LineWidth',
              'Line Near Color': [0.6, 0.66, 0.75],
              'Draw Points': true,
              'Point Type': 'Circle',
              'Point Size Multiplier': 4,
              'Point Near Color': [0.98, 0.75, 0.35],
            },
            note: 'Edges as strokes whose width follows `LineWidth`; a dot at every point marks the nodes (coincident dots stack into one).',
          },
          {
            id: 'geo_labels',
            type: 'geometryCOMP',
            x: 1,
            y: 1.8,
            params: { 'Xform:Translate': [0, 0.1, 0], Material: { ref: '../constant1' } },
            note: 'Node labels, nudged up so they sit above the dots.',
            children: [
              {
                id: 'text1',
                type: 'textPOP',
                x: 0,
                y: 0,
                params: {
                  Mode: 'Specification DAT/CHOP',
                  'Specification DAT': { ref: '../nodes' },
                  'Font Size': 0.11,
                  'Horizontal Align': 'Center',
                  'Vertical Align': 'Bottom',
                },
                flags: { display: true, render: true },
                note: 'Reads `text`, `tx` and `ty` straight from the node table — the same numbers that placed the nodes.',
              },
            ],
          },
          {
            id: 'constant1',
            type: 'constantMAT',
            x: 2,
            y: 1.8,
            params: { Color: [0.85, 0.87, 0.92] },
            note: 'Flat, light label color.',
          },
        ],
        steps: [
          {
            title: 'Node and edge tables',
            body: `Create two **Table DAT**s. \`nodes\`: header \`text tx ty\` and ten rows of names and positions. \`edges\`: header \`vertices weight\` and twelve rows like \`0 1\` / \`5\`. These are **made-up** values.`,
            nodes: ['nodes', 'edges'],
          },
          {
            title: 'Points and lines in one POP',
            body: `Create a **Geometry COMP** \`geo_graph\` and clear it. Inside, a **DAT to POP** \`dattopop1\`:

* *Points* page: *Points DAT* \`../nodes\`, **Convert All Excluding** on, exclude \`text\`.
* *Primitives* page: *Primitives DAT* \`../edges\`, *Prim Type* **Lines**, *Vertices Column* \`vertices\`, **Convert All Excluding** on, exclude \`vertices\`.

Middle-click: 10 points with \`tx\`, \`ty\`; 12 line primitives with \`weight\`.`,
            nodes: ['geo_graph', 'dattopop1'],
          },
          {
            title: 'Positions from the layout columns',
            body: `Append a **Math Mix POP** \`mathmix1\`: block 0 **A * B** (\`1 0 0\`, \`tx\`) → \`P\`; block 1 **A * B + C** (\`0 1 0\`, \`ty\`, \`P\`) → \`P\`. Append a **Null POP** \`null_graph\` (render + display on).`,
            nodes: ['mathmix1', 'null_graph'],
          },
          {
            title: 'Weight to width',
            body: `Between \`mathmix1\` and \`null_graph\` insert a **Facet POP** \`facet2\` (**Unique Points**), an **Attribute Convert POP** \`attrconvert2\` (**Primitive to Point**, \`weight\`) and a **ReRange POP** \`rerange3\` (\`weight\` from **0–5** to **0–3**, output \`LineWidth\`).`,
            nodes: ['facet2', 'attrconvert2', 'rerange3'],
          },
          {
            title: 'Stroke it',
            body: `Create a **Line MAT** \`mat_graph\`: *Width Near/Far* **1.5**, *Line Width Attribute* \`LineWidth\`, a grey *Line Near Color*; *Draw Points* on, *Point Type* **Circle**, *Point Size Multiplier* **4**, a warm *Point Near Color*. Assign it to \`geo_graph\` and add the COMP to a Render TOP.`,
            nodes: ['mat_graph'],
          },
          {
            title: 'Labels from the same table',
            body: `Create a **Constant MAT** \`constant1\` and a Geometry COMP \`geo_labels\` using it (*Translate* **0, 0.1, 0**). Inside, a **Text POP** \`text1\`: *Mode* **Specification DAT/CHOP**, *Specification DAT* \`../nodes\`, *Font Size* **0.11**, *Horizontal Align* **Center**, *Vertical Align* **Bottom**. Add \`geo_labels\` to the Render TOP.`,
            nodes: ['geo_labels', 'text1', 'constant1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Layout is a design decision

The positions in \`nodes\` were placed by hand: sources on the left, output on the right, so the picture reads as a flow. That's a perfectly good layout method for ten nodes, and it's honest as long as nobody is invited to read meaning into exact distances.

For bigger graphs you'd compute a layout. **Force-directed** layouts treat edges as springs and nodes as mutually repelling charges, then let the system settle; connected nodes end up near each other and clusters emerge. In POPs, an iterative settle like that is a [[Feedback POP]] loop: each frame takes the previous positions, nudges them, and feeds them back. The third challenge sketches a simple version.

Whatever the method, a few rules keep node-link diagrams readable:

* **Small is beautiful.** Beyond a few hundred nodes, a node-link drawing becomes a hairball. Aggregate, filter, or switch to a matrix view.
* **Encode at most two things on edges** (say, width = weight, color = type). Edges are thin; they can't carry much.
* **Labels for the nodes that matter.** Label hubs and the nodes the story is about; let the rest stay dots.
* **Direction needs a mark.** A plain line says "connected", not "depends on". If direction matters, draw arrows (see the first challenge).
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Plexus (proximity graph)',
        md: 'Edges are **derived from position**: two points connect because they\'re close. Distance is real and line length means something. Great for revealing spatial structure — and for pure atmosphere.',
      },
      right: {
        title: 'Data graph (edge list)',
        md: 'Edges come **from the data**. Position is layout: chosen by you or an algorithm. Width, color and size can carry data; distance usually doesn\'t. Say which is which.',
      },
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Feed the plexus points from something meaningful: particles, a [[TOP to POP]] of a camera feed, the earthquakes from the globe lesson.
* Color lines by their *direction* (the Proximity POP can also output \`LineDir\`) for a woven, directional texture.
* Pulse \`Maximum Distance\` with audio: the network breathes with the music. Keep the line-width fade in place so the breathing is smooth.
* Sparingly, a [[Bloom TOP]] on the plexus gives the classic glow. It's art, not data — here that's fine.`,
    },
    {
      kind: 'challenge',
      title: 'Show direction',
      md: 'In the dependency graph, an edge from `audio` to `analyze` means "analyze uses audio". Make that direction visible.',
      hints: [
        'The Line MAT can draw caps at the start and end of each line, including arrows.',
        'A line primitive runs from its first vertex to its second — the order in the `vertices` column.',
        'The node dots sit exactly on the end points and can hide an arrowhead.',
      ],
      solution:
        'On `mat_graph` → *Line* page set *Line End Cap Type* to **Arrow** (keep the start cap **None** or **Round**). On the *Caps* page raise *End Caps Pullback* toward 1 so the arrow\'s tip lands on the end point rather than overshooting, and adjust *Arrow Width*/*Arrow Height*. If the dots cover the tips, reduce *Point Size Multiplier* or move the dots to their own Geometry COMP drawn first. Check one edge against the table to confirm the arrows point the way the data says.',
    },
    {
      kind: 'challenge',
      title: 'Connect to an attractor',
      md: 'Add a single moving point (driven by an LFO or the mouse) that sprouts lines to every plexus point within reach, like a probe sweeping through the cloud.',
      hints: [
        'The Proximity POP accepts a second input: then it connects points of the second input to points of the first that are in range.',
        'A [[Point POP]] or a one-point [[CHOP to POP]] makes a handy single point.',
        'You probably want more lines per point here than in the base plexus.',
      ],
      solution:
        'Inside `geo_plexus`, create a single point — for example a Point POP whose position is driven by expressions such as `math.sin(absTime.seconds * 0.5) * 2` on X. Add a second Proximity POP: input 0 = `noise1` (the cloud), input 1 = the probe. Give it its own *Maximum Distance* (try 0.9) and a higher *Max Lines per Point*. Run it through its own Facet → Attribute Convert → ReRange chain (mapping `LineLength` from 0–0.9 to `LineWidth` 1–0) and end it in its own Null POP. The cleanest way to style it differently is a separate Geometry COMP: create `geo_probe` with a Select POP pointing at that Null, give it its own Line MAT in a warm color, spin it with the same expression, and add it to the Render TOP.',
    },
    {
      kind: 'challenge',
      title: 'Relax the layout (advanced)',
      md: 'Instead of hand-placed positions, let the graph settle itself: each frame, pull every node a little toward the average position of the nodes it\'s connected to, while keeping the whole graph from collapsing.',
      hints: [
        'A [[Feedback POP]] loop: input = the starting positions, *Target POP* = the end of the loop. Press *Start* to run it.',
        'The [[Neighbor POP]] with *Neighbors Type* **Connected** and *Output* **Average** can average `P` over a point\'s connected neighbours.',
        'Pulling toward neighbours shrinks everything; a tiny outward scale each frame counteracts it.',
      ],
      solution:
        'Branch after `mathmix1` (before the Facet POP, so points are still shared between edges): **Feedback POP** `feedback1` (input `mathmix1`, *Target POP* `relax_out`) → **Neighbor POP** (*Neighbors Type* **Connected**, *Output* **Average**, *Neighbor Point Attributes* `P`) → **Math Mix**: **mix(A, B, C)** with `P`, the averaged position (with *Add Prefix* on its name starts with `Nebr` — check the info popup), and `0.05` → `P`; then **A * B** (`P`, `1.004`) → `P` → **Null POP** `relax_out`. Feed `relax_out` into the Facet chain. Press *Start* on `feedback1` and watch connected nodes drift together. This is Laplacian smoothing with a rescale, not a full force-directed layout (there\'s no node-node repulsion), and the labels won\'t follow — they read positions from the table. To make them follow, send `relax_out` through a [[POP to CHOP]], rename its X and Y channels to `tx` and `ty` with a [[Rename CHOP]], and use that as the Text POP\'s *Specification CHOP* — one sample per node, matching the rows of `nodes`.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Why put a Facet POP (Unique Points) before converting `LineLength` from primitives to points?',
          options: [
            'The Proximity POP outputs no points',
            'Shared points can\'t hold a different value for each of their lines; unique points give each line its own two points',
            'It makes the lines thicker',
            'The Attribute Convert POP only works on triangles',
          ],
          answer: 1,
          explain: 'A point shared by six lines can only store one value. After Unique Points, every line owns its end points, so per-line data can become per-point data.',
        },
        {
          q: 'Doubling the Proximity POP\'s *Maximum Distance* in a 3D cloud roughly…',
          options: [
            'Doubles the number of candidate connections',
            'Multiplies the candidates by about eight',
            'Has no effect if *Max Lines per Point* is set',
            'Halves the number of lines',
          ],
          answer: 1,
          explain: 'Candidates sit in a sphere around each point, whose volume grows with the cube of the radius. The line cap limits what\'s drawn, but the search still gets more expensive.',
        },
        {
          q: 'In this lesson, what does the Neighbor POP\'s `NumNebrs` encode once mapped to dot size?',
          options: ['The point\'s age', 'The point\'s degree in the proximity graph', 'The average line length', 'The point index'],
          answer: 1,
          explain: 'Counting neighbours within the connection distance gives each node\'s degree — a classic, readable encoding for node size.',
        },
        {
          q: 'How does the DAT to POP know which nodes an edge connects?',
          options: [
            'It connects consecutive rows automatically',
            'A column on the Primitives DAT lists the point indices (row numbers of the node table) for each primitive',
            'It matches node names in both tables',
            'It connects points closer than a threshold',
          ],
          answer: 1,
          explain: 'Set *Vertices Column* to the column holding the vertex indices, and *Prim Type* to Lines: each row becomes one edge between those points.',
        },
        {
          q: 'In a hand-laid-out or force-directed graph, which property should viewers NOT read as data by default?',
          options: ['Whether two nodes are connected', 'Edge width mapped from weight', 'The distance between two nodes', 'Node size mapped from degree'],
          answer: 2,
          explain: 'Layout positions are chosen to make the picture readable; distances are not measurements. In a plexus, by contrast, distance is exactly what creates the edges.',
        },
      ],
    },
  ],
};

export default lesson;
