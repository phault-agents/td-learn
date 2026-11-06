/** Reference sheets. Original text; facts checked against the official TouchDesigner docs. */
export interface RefPage {
  id: string;
  title: string;
  blurb: string;
  md: string;
}

export const REFERENCE: RefPage[] = [
  {
    id: 'pop-essentials',
    title: 'POP Essentials',
    blurb: 'Points, primitives, vertices, and the rules that decide what renders.',
    md: `
POPs (Point Operators) are TouchDesigner's GPU geometry family, introduced as the official replacement-and-rethink of SOPs in the **2025.30000** builds. Every POP cooks as compute shaders on the graphics card, so a network of POPs can push millions of points without the data ever leaving the GPU.

## The three lists inside every POP

| List | What it holds | Example |
|---|---|---|
| **Points** | One entry per point, each with attributes (\`P\` is the position) | 10 000 points of a point cloud |
| **Primitives** | Shapes that connect points | 400 quads of a grid |
| **Vertices** | For each primitive, the indices of the points it uses | a quad's 4 vertices → points 6, 7, 8, 9 |

A vertex is *not* a point — it's an index into the point list. Several primitives can share a point through their vertices.

## Primitive types

POPs keep it simple: **Point**, **Line** (2 points), **Line Strip** (any number of points, optionally closed), **Triangle** and **Quad**. There are no n-sided polygons, NURBS or "mesh" primitives — surfaces are triangles and quads, and structured grids are described by *Dimensions* instead.

> Internally, primitives are always ordered triangles → quads → line strips → lines → points.

## What actually renders

* POPs reach the screen through a [[Geometry COMP]] (render + display flags on the POP inside it), a material, a [[Camera COMP]] and a [[Render TOP]].
* **A point with no primitive is invisible to the renderer.** If you want dots, give the points *point primitives* (most generators have a Connectivity / Create Point Primitives option), or draw them with the [[Line MAT]]'s point drawing, or instance geometry onto them.
* Instancing only reads the **point list** — primitives don't matter for it.
* Line strips render as lines (great with the [[Line MAT]]); a closed line strip is still a loop of line, not a filled surface.

## Attribute classes

Attributes can live on **points**, **vertices** or **primitives**. Most work happens on points. Put attributes on vertices when a shared point needs different values per face (texture seams, hard-edged normals). Many POPs have an *Attribute Class* menu to choose which class they operate on, and the [[Attribute Convert POP]] moves values between classes.

## Memory: references, not copies

A POP only allocates memory for attributes it creates or changes. Everything else is a *reference* to the upstream buffer — in the middle-click info popup these show up with an \`(r)\` suffix, and the bottom-left of a POP viewer lists which attributes that node touched. This is why long POP chains stay cheap.

## Direct vs indirect POPs

Some operations (deleting by a condition, proximity tests, some facet/convert operations) only know the resulting point or primitive count *on the GPU*. Those POPs over-allocate to a maximum size and pass counts downstream through GPU buffers ("indirect dispatch"). It's fast, but asking the CPU for the real count (Python \`numPoints()\`, [[POP to DAT]], info popups) forces a GPU→CPU download and can stall a frame. The [[Topology POP]] and the *Copy Topology Info Back to CPU* toggles exist to manage this.

## Groups and Dimensions

* **Groups** are bit flags (up to 32 per POP) on points, vertices or primitives, created with the [[Group POP]] and respected by many filters.
* **Dimensions** describe implied structure in the point list — the columns × rows (× slices) of a [[Grid POP]], or copies × points from a [[Copy POP]]. They travel with the data so downstream POPs (and GLSL code via \`_DimI[]\`) know where each point sits in the grid.
`,
  },
  {
    id: 'attributes',
    title: 'Attributes & Built-ins',
    blurb: 'Standard attribute names, types, swizzling and the read-only _built-ins.',
    md: `
## Reserved and common attribute names

Use these names when they fit — materials, instancing and many POPs look for them automatically.

| Attribute | Type | Meaning / who uses it |
|---|---|---|
| \`P\` | float3 | Position. Almost every POP reads it. |
| \`N\` | float3 | Normal — lighting, extrusions, "translate along normal". Made by the [[Normal POP]] and generators. |
| \`Color\` | float4 (RGBA) | Point/vertex/primitive color. Called \`Cd\` in SOPs. |
| \`Tex\` | float3 | Texture coordinates (third value for 3D textures). Called \`uv\` in SOPs. |
| \`PointScale\` | float | Per-point size (instancing scale, point drawing). |
| \`LineWidth\` | float | Per-point line thickness for the [[Line MAT]]. |
| \`T\` | float4 | Tangent (4th component = handedness). |
| \`Weight\` | float | 0–1 influence, e.g. from the [[Field POP]]; used by the [[Transform POP]] and others. |
| \`Dist\`, \`Dir\`, \`Disp\`, \`Tan\` | various | Distances/directions, e.g. from the [[Line Metrics POP]]. |
| \`PartVel\`, \`PartForce\`, \`PartMass\`, \`PartAge\`… | various | Particle attributes from the [[Particle POP]] (\`Part\` prefix). |
| \`Nebr\`, \`NumNebrs\` | uint array / uint | Neighbor indices and counts from the [[Neighbor POP]]. |
| \`LineBreak\`, \`LineStripIndex\` | int | Where line strips split ([[Line Break POP]]). |

**Naming rules:** letters and digits only, starting with a letter. Derivative's names start with a capital; start your own with a lowercase letter (\`speed\`, \`heat\`) so they never collide with future built-ins.

## Types and sizes

* Data types: \`float\` (32-bit), \`double\` (64-bit), \`int\` and \`uint\` (32-bit). Counters (neighbors, rays) are usually \`uint\`.
* Sizes: scalar (1), vector (2–4 components), matrix (2×2 … 4×4), and **arrays** of any of these (\`MyArray[0]\` … \`MyArray[n]\`).
* **Qualifiers** tag intent: *Color*, *Direction*, *Quaternion*. Set them in the [[Attribute POP]].

## Choosing components (swizzling)

Anywhere a POP asks for an attribute scope you can pick components:

| You type | Means |
|---|---|
| \`P(1)\` or \`P.y\` | the Y component |
| \`P(0) P(2)\` or \`P.xz\` | X then Z |
| \`P.zyx\` / \`P(2,1,0)\` | reordered — great for swapping axes |
| \`Color.rgb\`, \`Color.a\` | color channels |
| \`MyAttr.i0123\` | generic index form for any attribute |

Component order on input and output matters: reading \`P.yx\` and writing \`P.xy\` swaps X and Y.

## Read-only built-in attributes

These start with an underscore, are computed on the fly, can be used in scope fields (Math, Math Mix, Lookup, Delete, Group…), and are never passed downstream. Find them under the **>** at the bottom of attribute menus.

| Built-in | Value |
|---|---|
| \`_PointI\` | integer point index |
| \`_PointU\` | point index normalized 0→1 (first → last) |
| \`_PointCy\` | cyclic normalized index: 0 → (N-1)/N |
| \`_PrimI\`, \`_PrimU\`, \`_PrimCy\` | the same for primitives |
| \`_VertI\`, \`_VertU\`, \`_VertCy\` | the same for vertices |
| \`_DimI[n]\` | the point's coordinate in dimension n (e.g. its row in a grid) |
| \`_StepSeconds\`, \`_StepFrames\` | time since the last cook — use for frame-rate-independent motion |
| \`_ArrayI\`, \`_ArrayU\`, \`_ArrayCy\` | index while iterating array attributes |
| \`pi\` | 3.14159… |

## Index vs id

*Index* is just a position in a list (point 0, 1, 2…) — it isn't an attribute and can't be written. An *id* (like the Particle POP's \`PartId\`) is an attribute that stays attached to the same point for its lifetime, even when points are born, die, or get re-sorted. Trails and smoothing that must follow a specific particle need an id.
`,
  },
  {
    id: 'expressions',
    title: 'Expressions Cheat Sheet',
    blurb: 'The Python one-liners you will type into parameters again and again.',
    md: `
Parameters have three modes you'll use constantly: **constant** (a typed value), **expression** (Python, shown in blue) and **export/reference** (driven from elsewhere). Click the small mode button left of a parameter's value field to switch.

## Time

| Expression | Gives you |
|---|---|
| \`absTime.seconds\` | seconds since TouchDesigner started — never loops, keeps running when the timeline stops |
| \`absTime.frame\` | frames since start |
| \`me.time.seconds\` | this component's timeline time (loops with the timeline) |
| \`absTime.stepSeconds\` | seconds since the previous frame |

> Prefer \`absTime.seconds\` for continuous motion (noise offsets, rotation); it won't jump when the timeline loops.

## Reading CHOP channels

| Expression | Gives you |
|---|---|
| \`op('lfo1')['chan1']\` | current value of channel *chan1* |
| \`op('null1')[0]\` | the first channel |
| \`op('null1')['tx'].eval()\` | explicit float value |
| \`op('analyze1')['chan1'] * 2 + 0.5\` | any math on top |

Tip: end CHOP chains in a [[Null CHOP]] and reference the Null. You can then change what feeds it without breaking every expression.

## Math helpers

| Expression | Notes |
|---|---|
| \`math.sin(absTime.seconds * 2)\` | the \`math\` module is available in expressions |
| \`tdu.remap(v, 0, 1, -180, 180)\` | remap a value between ranges |
| \`tdu.clamp(v, 0, 1)\` | clamp |
| \`max(a, b)\`, \`min(a, b)\`, \`abs(v)\` | Python built-ins |

## Operators, parents and tables

| Expression | Gives you |
|---|---|
| \`me.digits\` | the number at the end of this node's name (\`noise3\` → 3) |
| \`parent().par.Speed\` | a custom parameter on the parent component |
| \`op('table1')[1, 'value']\` | a table cell by row index and column name |
| \`op('table1').numRows\` | number of rows |
| \`op('pop1').numPoints()\` | point count of a POP (CPU download — see Performance) |

## Python for POP data (in scripts, not per-frame expressions)

\`\`\`python
pop = op('null1')
pop.numPoints()                         # size of the point list
pop.points('P')                         # list of positions (GPU→CPU download!)
[a.name for a in pop.pointAttributes]   # attribute names
pop.points('P', delayed=True)           # one frame late, but no stall
\`\`\`
`,
  },
  {
    id: 'sop-to-pop',
    title: 'Coming from SOPs',
    blurb: 'Which POP replaces which SOP, and what works differently.',
    md: `
POPs are not a 1:1 port of SOPs — they borrow ideas from CHOPs and TOPs too (multi-input math, per-component parameters, GPU textures). Here's how familiar SOP habits translate.

| You used… | For… | In POPs use… |
|---|---|---|
| Add SOP | making points by hand | [[Point POP]] |
| Facet SOP / Attribute Create SOP | computing normals and tangents | [[Normal POP]] |
| Point SOP | per-point math | [[Math POP]], [[Math Mix POP]] |
| Limit SOP | CHOP channels → points | [[CHOP to POP]] |
| Copy SOP | stamping geometry on points | [[Copy POP]] (or instancing) |
| Texture SOP | UVs | [[Texture Map POP]], [[Projection POP]], [[Normalize POP]], [[Line Metrics POP]] |
| Trace SOP | outlines from images | [[Trace POP]] |
| Attribute SOP | rename / delete attributes | [[Attribute POP]] |
| Vertex SOP | vertex attributes | [[Math Mix POP]], [[Attribute POP]] |
| Deform SOP | skinning | [[Skin Deform POP]] |
| particlesGPU (TOP-based) | GPU particles | [[Particle POP]] + [[Feedback POP]] |
| TOP point-cloud tricks | XYZ stored in RGB | native point attributes, [[TOP to POP]], [[Point File In POP]] |

## Things that are different

* **GPU first.** POPs run as compute shaders. Avoid round-trips to the CPU ([[POP to CHOP]], [[POP to DAT]], Python point access) inside per-frame chains.
* **Surfaces are triangles and quads only.** No n-gons, NURBS, meshes or booleans.
* **Normals come from the [[Normal POP]]**, not a Facet operator.
* **Any attribute, any type.** Integers, doubles, arrays and matrices are first-class.
* **Math without code.** Math Mix / Math Combine cover what used to need a Point SOP expression or a GLSL TOP.
* **SOPs and POPs can coexist.** Both render through Geometry COMPs into the same Render TOP, and [[SOP to POP]] / [[POP to SOP]] convert when you need to.
`,
  },
  {
    id: 'glsl-pop',
    title: 'GLSL POP Quick Reference',
    blurb: 'The function names you need to write compute shaders for points.',
    md: `
The [[GLSL POP]] runs your compute shader once per element (point, vertex or primitive — set by *Attribute Class*). It can't change the element count; the [[GLSL Advanced POP]] can, and the [[GLSL Copy POP]] runs code per copy.

## The skeleton

\`\`\`glsl
void main() {
    const uint id = TDIndex();
    if (id >= TDNumElements())
        return;               // threads are rounded up to the workgroup size

    vec3 p = TDIn_P();        // read P of this element from input 0
    P[id] = p;                // write output (P must be listed in Output Attributes)
}
\`\`\`

## Reading

| Function | Reads |
|---|---|
| \`TDIn_Attr()\` | \`Attr\` of the current element, input 0 |
| \`TDIn_Attr(i, elementId)\` | from input *i*, element *elementId* |
| \`TDIn_Attr(i, elementId, arrayIndex)\` | an element of an array attribute |
| \`TDInPoint_Attr(...)\`, \`TDInVert_Attr(...)\`, \`TDInPrim_Attr(...)\` | an attribute of another class |
| \`TDInputNumPoints(i)\` / \`TDInputNumPrims(i)\` / \`TDInputNumVerts(i)\` | element counts (input 0 if omitted) |
| \`TDInputPointIndex(i, vertIndex)\` | which point a vertex uses |

Reads are bounds-checked: out-of-range indices return the last element.

## Writing

* Add attributes you want to change to **Output Attributes**, or create new ones on the **Create Attributes** page.
* Write them as arrays indexed by the element id: \`P[id] = ...;\`, \`Color[id] = vec4(...);\`
* *Initialize Output Attributes* (on by default) copies input values first. Turn it off for speed when your shader writes every element.

## Uniforms

Values declared on the Vectors / Colors / Samplers / Arrays / Matrices pages become uniforms automatically — drive them with expressions such as \`absTime.seconds\` or CHOP channels. Samplers give you textures from TOPs.

## Dimensions

\`\`\`glsl
uint[cTDDimSize] coords = TDDimCoords(id);  // e.g. column, row of a grid point
uint other = TDDimPointIndex(coords);       // back to a point index
\`\`\`

## Multi-pass

The GLSL POP can run several passes (the *Passes* parameter) — useful for iterative relaxation or simple solvers without building a feedback loop.
`,
  },
  {
    id: 'debugging',
    title: 'Debugging POP Networks',
    blurb: 'Where to look when the screen is black or the numbers are wrong.',
    md: `
## First aid for a black render

1. **Is anything flagged?** Inside the Geometry COMP, the POP you want must have its **render** (and usually **display**) flag on.
2. **Are there primitives?** Points without primitives don't render. Turn on point primitives in the generator, or render with the [[Line MAT]]'s point drawing, or instance onto the points.
3. **Is the camera looking at it?** Check the Camera COMP's position, and that the [[Render TOP]]'s *Camera* and *Geometry* fields match your node names.
4. **Is there light?** Phong/PBR materials need a [[Light COMP]] (or an environment light). A [[Constant MAT]] never does — it's the fastest way to rule out lighting.
5. **Is the material assigned?** Geometry COMP → *Render* page → *Material*.

## Inspecting data

* **Middle-click** a POP for the info popup: point/prim/vert counts, attribute names, types, \`(r)\` references, qualifiers, CPU vs GPU topology info.
* The **bottom-left of a POP viewer** lists attributes created or modified by that node.
* A [[POP to DAT]] shows points, vertices or primitives as a table — perfect for checking values (but it downloads from the GPU, so delete it when done).
* [[Math Mix POP]] and [[Math Combine POP]] show pseudo-code in their info popup; an Info DAT on them shows the generated GLSL.
* For feedback systems, an [[Info CHOP]] on a [[Feedback POP]] or [[Particle POP]] shows *initializing / ready / running / done* states.

## When it's slow

* Turn on cook-time display, use the Probe palette tool, and read the [[Perform CHOP]].
* Look for accidental GPU→CPU downloads: POP to CHOP/DAT, Python \`points()\` calls, info popups left open.
* Check for over-allocation from indirect POPs (Delete, Proximity…) feeding big chains — see [[Topology POP]].
* Prefer instancing over [[Copy POP]] when you don't need to deform the copies.
`,
  },
  {
    id: 'reading-graphs',
    title: 'Reading the Graphs',
    blurb: 'How the interactive network diagrams on this site map to TouchDesigner.',
    md: `
Every lesson network on this site is an interactive diagram of a real TouchDesigner network.

## Nodes

* The **header** shows the operator type (e.g. *NOISE POP*); the **bottom bar** shows the node's name (*noise1*). Name your nodes the same way so expressions like \`op('lfo1')\` work when you copy them.
* Colors follow the operator family: **POP** orange, **TOP** purple, **CHOP** green, **DAT** pink, **COMP** grey, **MAT** yellow (SOPs blue).
* Small dots at the bottom right are the **display** (blue) and **render** (purple) flags.
* A **⤵ button** in the corner means the node is a component with a network inside — double-click it (or press Enter) to dive in. The path bar above the canvas works like TouchDesigner's.

## Lines

* **Solid lines** are wires: output on the right → input on the left. Input order matters; it's listed in the inspector.
* **Dashed lines** are references: a parameter on the receiving node points at the other node (an OP field like *Camera*, or an expression like \`op('lfo1')['chan1']\`). The label names the parameter.

## The inspector

Click a node to see what it's for and **only the parameters you need to change** — anything not listed stays at its default. Values look like TouchDesigner's parameter dialog:

* plain values are typed in as-is; ▾ values are menu choices;
* **ƒx** values are Python expressions (switch the parameter to expression mode first);
* linked names are OP references — click them to jump to that node. Paths are written exactly as they resolve in TouchDesigner: relative to the *inside* of the operator that owns the parameter. For most operators a sibling is just \`name\`; for a **component's** own parameters (Material, Look At, Instance OP…) a sibling is \`../name\`. Dragging a node onto a parameter always writes the right path.

Click a parameter's label to reveal its Python name (useful for scripting).

## Build along

Graphs with steps have a **Build along** bar. Each step reveals the next nodes, highlights them, and opens the first one in the inspector. Faint outlines show where future nodes will go. Tick **I've built this** as you go to track progress (stored in your browser only).

## Build scripts (beta)

The **</>** button generates a Python script that recreates the network in TouchDesigner. Parameter names and menu tokens come from the official docs, and every assignment is protected so one mismatch never stops the build — anything that couldn't be applied is printed to the Textport. Building by hand is the better way to learn; use the script to check your work or jump ahead.
`,
  },
];
