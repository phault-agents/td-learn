import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'attributes',
  title: 'Attributes: The Data on Every Point',
  subtitle: 'Read, write and reshape the numbers every point carries, then turn a noise field into a hand-tinted relief map.',
  minutes: 45,
  summary:
    'Points, primitives and vertices; standard attributes and classes; creating attributes, per-attribute math, swizzles and read-only built-ins. You build a procedural island whose height picks its colors from a [[Ramp TOP]] palette.',
  objectives: [
    'Tell points, primitives and vertices apart and choose the right attribute class',
    'Create attributes with the [[Attribute POP]] or by naming a new output attribute',
    'Target single components with swizzles such as `P.y`, `P.xz` and `Color.r`',
    'Use read-only built-ins like `_PointU` and `_PointI` as inputs to POP math',
    'Normalize an attribute and use it to look up colors from a palette with the [[Lookup Texture POP]]',
    'Inspect point data with a [[POP to DAT]] and explain what that costs',
  ],
  requires: ['first-pop-network'],
  tags: ['attributes', 'swizzling', 'built-ins', 'color', 'terrain', 'lookup'],
  blocks: [
    {
      kind: 'md',
      md: `
In the last lesson the Noise POP's viewer listed two letters, \`P N\`, and that was the whole story: a POP is a list of points, and every point carries named values. Position and normal are just the first two. Color, size, age, velocity, a country's population, the loudness of a frequency band — in POPs they are all the same kind of thing, an **attribute**, and the operators you'll use for the rest of this course mostly read some attributes and write others.

This lesson makes you fluent in that. The project is a procedural island: a flat grid gets a radial mask, noise lifts land out of a flat sea, and each point's height picks a color from a palette you can edit like a gradient in a paint program. The result reads like a hand-tinted relief map — and every single step is attribute work.

## Three lists inside every POP

| List | One entry per… | What it holds |
|---|---|---|
| **Points** | point | attributes such as \`P\`, \`N\`, \`Color\` |
| **Primitives** | shape (point, line, line strip, triangle, quad) | a type, plus optional attributes such as a per-face \`Color\` |
| **Vertices** | corner of a primitive | an *index* into the point list, plus optional attributes |

A vertex is not a point: it's a reference to one. On a grid of quads, each interior point is shared by four quads, so it appears in four vertices. Middle-click any POP and the info popup gives you all three counts.

That sharing is why attributes come in three **classes**. Most of the time you work on **point** attributes. You reach for **vertex** attributes when a shared point needs a different value on each face that uses it — a texture seam, or a hard edge where normals must differ. **Primitive** attributes give one value to a whole face or line, like a flat-shaded color per triangle. Many POPs have an *Attribute Class* menu to pick which list they operate on, and the [[Attribute Convert POP]] moves values between classes.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'What an attribute is made of',
      md: `Every attribute has a **name** (\`P\`, \`Color\`, \`height\`), a **type** (\`float\`, \`double\`, \`int\`, \`uint\`), a **size** (1 to 4 components, a matrix, or an array of any of those) and a **class** (point, vertex or primitive). Some also carry a *qualifier* — Color, Direction or Quaternion — that tells downstream operators how to treat them. The middle-click info popup shows all of this for every attribute on a node.`,
    },
    {
      kind: 'md',
      md: `
## The names that mean something

You can invent any attribute name made of letters and digits, but a handful are reserved because materials, instancing and many POPs look for them automatically:

| Attribute | Size | Who uses it |
|---|---|---|
| \`P\` | float3 | Position. Nearly every POP reads it. |
| \`N\` | float3 | Normal: lighting, "move along the normal", extrusion. |
| \`Color\` | float4 (RGBA) | Point color. Lit and unlit materials can multiply it in. |
| \`Tex\` | float3 | Texture coordinates (the third value is for 3D textures). |
| \`PointScale\` | float | Per-point size for instancing and point drawing. |
| \`LineWidth\` | float | Per-point stroke width for the [[Line MAT]]. |

Derivative's names start with a capital letter. Start yours with a **lowercase** letter — \`height\`, \`speed\`, \`island\` — and they can never collide with a built-in added in a future release. The full list lives on the [Attributes & Built-ins](#/reference/attributes) reference sheet.

## Three ways to create an attribute

1. **Explicitly, with the [[Attribute POP]].** You choose a name (a reserved one or your own), a type, a number of components, an initial value — even arrays and matrices. Use it when you want an attribute to exist with a known value before anything writes to it.
2. **By naming a new output.** Most POPs that compute something have an *Output Attribute Scope* field. Type a name that doesn't exist yet and the POP creates it, picking a sensible type. If you need to control the type yourself, expand the **>>>** button next to the field: *Override Automatic Attribute*, *Attribute Type* and *Components* appear.
3. **As a side effect.** The [[Normal POP]] writes \`N\`; the Noise POP can output raw \`Noise\`, \`NoiseGradient\` or \`NoiseCurl\`; generators can add \`N\` and \`Tex\`. Check the viewer's bottom-left list to see what a node added.

## Choosing components: swizzles

Wherever a POP asks for an attribute you can hand it *part* of one. These are equivalent ways to say "the Y component of P":

* \`P(1)\` — index form, counting from 0
* \`P.y\` — swizzle form (\`x y z w\`, or \`r g b a\` for colors)

You can pick several components and reorder them: \`P.xz\` is X then Z, \`Color.rgb\` is the three color channels without alpha, \`P.zyx\` reverses the axes, and the general form \`MyAttr.i012\` works on any attribute. Order is meaningful: if a POP reads \`P.yx\` and writes \`P.xy\`, it has just swapped X and Y.

The rule for matching input to output is simple: the number of components going in must equal the number coming out, **or** the input is a single value that gets copied into every output component.

## Read-only built-ins

Some values aren't stored anywhere — they're computed for each element as a POP cooks. Their names start with an underscore, you'll find them under the **>** at the bottom of attribute menus, and you can use them anywhere a POP *reads* an attribute:

| Built-in | Value per point |
|---|---|
| \`_PointI\` | the point's index: 0, 1, 2… |
| \`_PointU\` | the index normalized from 0 (first point) to 1 (last point) |
| \`_PointCy\` | a cyclic version that stops just short of 1 — handy for closed loops |
| \`_PrimI\`, \`_VertI\`… | the same idea for primitives and vertices |
| \`_DimI[0]\`, \`_DimI[1]\` | the point's column and row in a grid |

Built-ins are never written to and never passed downstream. If you want to keep one, copy it into a real attribute — which is exactly what the small lab below does.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'attribute-lab',
        title: 'Attribute lab: a twelve-point clock',
        root: '/project1/lab',
        height: 420,
        caption:
          'A tiny data set you can read row by row. `lab` is a plain [[Base COMP]]: POPs cook in any network, you only need a Geometry COMP to *render* them. Watch the [[POP to DAT]] table change as you build.',
        nodes: [
          {
            id: 'circle1',
            type: 'circlePOP',
            x: 0,
            y: 0,
            params: { Connectivity: 'Point Primitives', Orientation: 'XY Plane', Divisions: 12 },
            note: 'Twelve points around a circle, each with its own point primitive so the viewer draws them as dots. Twelve rows is small enough to read every value in a table.',
          },
          {
            id: 'attribute1',
            type: 'attributePOP',
            x: 1,
            y: 0,
            inputs: ['circle1'],
            params: { 'Name[0]': 'Color', 'Value[0]': [0.1, 0.2, 0.8, 1] },
            note: 'Creates the reserved `Color` attribute on every point with one fixed value: a deep blue. The Attribute POP is the explicit way to say "this attribute exists, and starts here".',
          },
          {
            id: 'math1',
            type: 'mathPOP',
            x: 2,
            y: 0,
            inputs: ['attribute1'],
            params: { 'Input Attribute Scope': '_PointU', 'Output Attribute Scope': 'Color.r' },
            note: 'Reads the built-in `_PointU` (0 → 1 around the circle) and writes it into **only the red channel** of `Color`. Green, blue and alpha keep the values from `attribute1`, so the dots fade from blue to magenta.',
          },
          {
            id: 'math2',
            type: 'mathPOP',
            x: 3,
            y: 0,
            inputs: ['math1'],
            params: { 'Input Attribute Scope': '_PointU', Multiply: 0.6, 'Output Attribute Scope': 'P.z' },
            note: 'Same built-in, different destination: `_PointU × 0.6` replaces just the Z component of `P`. X and Y are untouched, so the flat circle becomes one turn of a helix. Tumble the viewer to see it.',
          },
          {
            id: 'null1',
            type: 'nullPOP',
            x: 4,
            y: 0,
            inputs: ['math2'],
            note: 'The stable end of the chain — the DAT below points here, so you can rewire anything upstream without breaking it.',
          },
          {
            id: 'poptodat1',
            type: 'poptoDAT',
            x: 4,
            y: 1.3,
            params: { POP: { ref: 'null1' }, Attributes: 'P Color' },
            note: 'Turns the point list into a table: one row per point, one column per attribute component. It copies data from the GPU to the CPU every time it updates, so use it to check your work, then delete it or turn off *Active*.',
          },
        ],
        steps: [
          {
            title: 'Twelve points',
            body: `Create a **Base COMP** named \`lab\` and go inside. Add a **Circle POP** \`circle1\`: *Connectivity* **Point Primitives**, *Orientation* **XY Plane**, *Divisions* **12**.

Middle-click it. Note the point count, the primitive count (one point primitive per point) and the attributes it already has.`,
            nodes: ['circle1'],
          },
          {
            title: 'Create an attribute explicitly',
            body: `Append an **Attribute POP** \`attribute1\`. In its first *New Attribute* block set *Name* to **Color** and *Value* to **0.1, 0.2, 0.8, 1**.

The viewer's bottom-left list now shows \`Color\`: this node created it. Middle-click and you'll see it listed with four components.`,
            nodes: ['attribute1'],
          },
          {
            title: 'A built-in into one channel',
            body: `Append a **Math POP** \`math1\`. Set *Input Attribute Scope* to \`_PointU\` (type it, or pick it from the **>** at the bottom of the menu) and *Output Attribute Scope* to \`Color.r\`.

One input component, one output component: the normalized index lands in red, and the other three channels pass through.`,
            nodes: ['math1'],
          },
          {
            title: 'Swizzle into position',
            body: `Append another **Math POP** \`math2\`: *Input Attribute Scope* \`_PointU\`, *Multiply* **0.6**, *Output Attribute Scope* \`P.z\`.

Only Z changes. Rotate the viewer: the circle is now a ramp that climbs as it goes round.`,
            nodes: ['math2'],
          },
          {
            title: 'Read the numbers',
            body: `End with a **Null POP** \`null1\`. Next to it create a **POP to DAT** \`poptodat1\`, set its *POP* to \`null1\` and *Attributes* to \`P Color\`.

There's one row per point and one column per component. Read down them: red climbs from 0 to 1, blue stays at 0.8, Z climbs from 0 to 0.6. Every claim made in the steps above is visible as data.`,
            nodes: ['null1', 'poptodat1'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Looking at data has a price',
      md: `POP data lives on the GPU; DAT tables live on the CPU. A [[POP to DAT]] (or [[POP to CHOP]], or a Python call like \`points('P')\`) has to download the buffer, and by default it shows the result a frame late to avoid stalling the GPU — its *Download Type* menu trades that delay for an immediate, slower read. On twelve points it's nothing. On a million it can cost you frames.

For big geometry turn on *Thin Out Range* and use *Thin Step* to show only every *n*-th point, or set *Thin Range Start* / *Thin Range Length* to inspect a slice. Turn *Active* off (or delete the DAT) once you've checked what you needed.`,
    },
    {
      kind: 'md',
      md: `
## The main build: a procedural island

Now the real project. The plan, attribute by attribute:

1. A flat grid in the ground plane — \`P\` only.
2. \`dist\`: each point's distance from the center, computed from \`P.xz\`.
3. \`island\`: that distance flipped and reshaped into a mask — high in the middle, negative at the edges.
4. Noise added to **only** \`P.y\`, with the mask lifting the middle and sinking the rim.
5. A clamp at height 0 that turns everything below it into flat sea.
6. Fresh normals so light rakes across the relief.
7. \`height\`: \`P.y\` rescaled to 0–1.
8. \`Color\`: looked up from a palette image using \`height\`.

Notice that only steps 4 and 5 change the shape. Everything else is bookkeeping that makes the next step possible — that's normal in POP work, and cheap, because each POP only allocates what it writes.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'island',
        title: 'Procedural island',
        root: '/project1',
        height: 560,
        caption:
          'Dive into **geo1** to see the attribute pipeline. The two boxes mark the shape stage and the color stage. Dashed lines inside are references: the Ramp TOP reads its keys from the `palette` table, and the Lookup Texture POP samples the ramp.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 4' }, 0],
              Material: { ref: '../pbr1' },
            },
            note: 'Holds the whole island network. A very slow turntable spin (4° per second) lets the raking light travel across the slopes.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Quadrilaterals',
                  Size: [4, 4],
                  Columns: 300,
                  Rows: 300,
                  Rotate: [-90, 0, 0],
                },
                note: 'A 4 × 4 sheet of roughly 90 000 points joined by quads. The Grid POP builds in the XY plane; rotating it −90° around X lays it flat in XZ so that `P.y` can mean "height".',
              },
              {
                id: 'math1',
                type: 'mathPOP',
                x: 1,
                y: 0,
                inputs: ['grid1'],
                params: {
                  'Input Attribute Scope': 'P.xz',
                  'Pre Operation': 'length(A)',
                  'Output Attribute Scope': 'dist',
                  'Override Automatic Attribute': true,
                  'Attribute Type': 'float',
                  Components: '1',
                },
                note: 'Reads two components of `P` (X and Z), and `length(A)` collapses them into one number: the distance from the island\'s center. The **>>>** overrides make `dist` an explicit single float.',
              },
              {
                id: 'normalize1',
                type: 'normalizePOP',
                x: 2,
                y: 0,
                inputs: ['math1'],
                params: {
                  'Input Attribute Scope': 'dist',
                  'Parameter Size': '1',
                  Exponent: 1.5,
                  'Map to Low': 0.4,
                  'Map to High': -0.8,
                  'Output Attribute Scope': 'island',
                },
                note: 'Rescales `dist` to 0 (center) … 1 (farthest corner), bends it with an exponent so the middle stays broad, then re-ranges it to **0.4 … −0.8**. The result, `island`, is positive near the center and negative toward the rim.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 3,
                y: 0,
                inputs: ['normalize1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  'Noise Size': '1',
                  Period: 1.3,
                  Harmonics: 4,
                  Amplitude: 0.3,
                  'Translate 4D': { expr: 'absTime.seconds * 0.02' },
                  'Combine Attribute Scope': 'P.y',
                  'Output Attribute Scope': 'P.y',
                  'Element[0]': 'island',
                  'Target Parameter[0]': 'offset',
                  'Map:Combine Operation[0]': 'Set',
                },
                note: 'A single noise value per point, added to `P.y` **only** — X and Z stay put. On the *Map* page, `island` replaces the *Offset* parameter point by point, so the center is lifted and the rim pushed down before the noise ripples on top.',
              },
              {
                id: 'limit1',
                type: 'limitPOP',
                x: 4,
                y: 0,
                inputs: ['noise1'],
                params: {
                  'Input Attribute Scope': 'P.y',
                  'Limit Type Minimum': 'Clamp',
                  'Limit Type Maximum': 'Off',
                  'Minimum Value': 0,
                  'Output Attribute Scope': 'P.y',
                },
                note: 'Sea level. Any height below 0 is clamped to exactly 0, which flattens valleys and the rim into calm water. The maximum is left unlimited so peaks keep their shape.',
              },
              {
                id: 'normal1',
                type: 'normalPOP',
                x: 1,
                y: 1.35,
                inputs: ['limit1'],
                params: { 'Normals Action': 'Always Compute' },
                note: 'Rebuilds `N` from the deformed quads. *Always Compute* matters: if the grid brought its own flat normals along, the other actions could leave them in place and the lighting would ignore the hills.',
              },
              {
                id: 'normalize2',
                type: 'normalizePOP',
                x: 2,
                y: 1.35,
                inputs: ['normal1'],
                params: { 'Input Attribute Scope': 'P.y', 'Parameter Size': '1', 'Output Attribute Scope': 'height' },
                note: 'Copies height into a new attribute rescaled to 0 … 1: sea is exactly 0, the highest peak is exactly 1, whatever the noise amplitude happens to be. `P` itself is not changed.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 3,
                y: 1.35,
                inputs: ['normalize2'],
                params: {
                  TOP: { ref: 'ramp1' },
                  'Lookup Index Attribute U': 'height',
                  'Output Attribute Scope': 'Color',
                },
                note: 'For each point, uses `height` as a horizontal position in `ramp1` (0 = left edge, 1 = right edge) and writes the pixel\'s RGBA into `Color`.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 4,
                y: 1.35,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'Display and render flags live here. Middle-click: you should see `dist`, `island`, `height` and `Color` alongside `P` and `N`.',
              },
              {
                id: 'palette',
                type: 'tableDAT',
                x: 2,
                y: 2.6,
                table: [
                  ['pos', 'r', 'g', 'b', 'a'],
                  ['0', '0.06', '0.2', '0.4', '1'],
                  ['0.02', '0.86', '0.8', '0.6', '1'],
                  ['0.12', '0.36', '0.56', '0.26', '1'],
                  ['0.4', '0.2', '0.38', '0.18', '1'],
                  ['0.65', '0.46', '0.37', '0.26', '1'],
                  ['0.85', '0.62', '0.6', '0.58', '1'],
                  ['1', '0.97', '0.97', '1', '1'],
                ],
                note: 'The palette as data: each row is a color key with a position (0–1) and RGBA. Sea, sand, lowland, forest, rock, scree, snow. Edit numbers here and the ramp updates live.',
              },
              {
                id: 'ramp1',
                type: 'rampTOP',
                x: 3,
                y: 2.6,
                params: {
                  Type: 'Horizontal',
                  DAT: { ref: 'palette' },
                  'Output Resolution': 'Custom Resolution',
                  Resolution: [256, 1],
                },
                note: 'Turns the keys into a 256 × 1 image: a palette strip. It must be **Horizontal**, because the lookup walks along U (left → right). One pixel tall is all a 1D lookup needs.',
              },
            ],
            childComments: [
              { x: 0, y: 2.55, w: 1.8, text: 'Shape stage on top, color stage below. Only noise1 and limit1 move points.' },
            ],
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 1.2,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.8 },
            note: 'A white, matte PBR material. *Apply Point Color* (Advanced page) is on by default, so each point\'s `Color` tints the surface while the lighting still shows the relief.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.2,
            params: { 'Xform:Translate': [0, 2.8, 4.4], 'Look At': { ref: '../geo1' } },
            note: 'Raised and pulled back for a three-quarter aerial view. *Look At* keeps it aimed at the island\'s center however you move it.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 0,
            y: 2.4,
            params: { 'Xform:Translate': [-4, 5, 2] },
            note: 'A light low on one side rakes across the terrain, so slopes facing it brighten and the far sides fall into shade — the classic hill-shading look of a relief map.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0.6,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              Lights: { ref: 'light1' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.03, 0.05, 1],
            },
            note: 'The same render setup as lesson 1.1, pointed at the island.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 3,
            y: 0.6,
            inputs: ['render1'],
            note: 'The finished image.',
          },
        ],
        boxes: [
          { title: 'Shape', nodes: ['grid1', 'math1', 'normalize1', 'noise1', 'limit1'], tone: 'orange' },
          { title: 'Color', nodes: ['normalize2', 'lookuptex1', 'palette', 'ramp1'], tone: 'purple' },
        ],
        steps: [
          {
            title: 'A flat sheet in the ground plane',
            body: `Create a **Geometry COMP** \`geo1\`, dive in and delete its default contents. Add a **Grid POP** \`grid1\`: *Connectivity* **Quadrilaterals**, *Size* **4, 4**, *Columns* **300**, *Rows* **300**, *Rotate* **−90, 0, 0**.

Turn on its display flag for now and look at it from above: a dense, flat sheet. The rotation matters — from here on, "up" is Y.`,
            nodes: ['geo1', 'grid1'],
          },
          {
            title: 'Distance from the center',
            body: `Append a **Math POP** \`math1\`:

* *Input Attribute Scope* \`P.xz\` — two components, X and Z.
* *Pre Operation* **length(A)** — turns those two numbers into one.
* *Output Attribute Scope* \`dist\` — a new attribute.
* Click **>>>** beside the output field, turn on *Override Automatic Attribute*, and set *Attribute Type* **float**, *Components* **1**.

Middle-click: \`dist\` is now a float on every point, 0 at the center and largest in the corners.`,
            nodes: ['math1'],
          },
          {
            title: 'Shape the island mask',
            body: `Append a **Normalize POP** \`normalize1\`. *Input Attribute Scope* \`dist\`, then set *Parameter Size* to **1**, *Output Attribute Scope* \`island\`. Leave *Mode* at its default (a plain lowest-to-highest rescale), then set *Exponent* **1.5**, *Map to Low* **0.4** and *Map to High* **−0.8**.

Why *Parameter Size* **1**? It sets how many columns of parameters the node has, one per component it processes. The Normalize POP defaults to **3**, one column each for X, Y and Z, which only fits a 3-component attribute like \`P\`. \`dist\` is a single number per point, so it needs a single column. With a size of 1, one set of values applies to whatever you feed it.

Normalize first squeezes \`dist\` into 0–1, the exponent keeps small values small for longer (a broad middle), and the re-range flips and scales it. Yes, *Map to High* can be lower than *Map to Low*: that's how you invert a range.`,
            nodes: ['normalize1'],
          },
          {
            title: 'Noise on one component, driven by an attribute',
            body: `Append a **Noise POP** \`noise1\`.

**Noise page:** *Type* **Simplex 4D (GPU)**, *Noise Size* **1** (one value per point), *Period* **1.3**, *Harmonics* **4**, *Amplitude* **0.3**.

**Output page:** set *Combine Attribute Scope* and *Output Attribute Scope* both to \`P.y\`. The noise is now added to the Y component only.

**Map page:** in the first block (add one with **+** if the page is empty) set *Element* to \`island\`, *Target Parameter* to **offset (Offset)** and *Combine Operation* to **Set**. Every point now uses its own \`island\` value as the noise's Offset.

**Transform page:** *Translate 4D* = \`absTime.seconds * 0.02\` for a slow, geological drift.`,
            nodes: ['noise1'],
          },
          {
            title: 'Sea level and normals',
            body: `Append a **Limit POP** \`limit1\`: *Input Attribute Scope* \`P.y\`, *Limit Type Minimum* **Clamp**, *Minimum Value* **0**, *Limit Type Maximum* **Off**, *Output Attribute Scope* \`P.y\`. The sea goes flat.

Append a **Normal POP** \`normal1\` with *Normals Action* **Always Compute**. Compare its viewer with \`limit1\`'s: the shading finally follows the hills.`,
            nodes: ['limit1', 'normal1'],
          },
          {
            title: 'Height as a 0–1 attribute, and a palette',
            body: `Append a **Normalize POP** \`normalize2\`: *Input Attribute Scope* \`P.y\`, *Parameter Size* **1** (again a single component), *Output Attribute Scope* \`height\`.

Still inside \`geo1\`, create a **Table DAT** \`palette\`: a header row \`pos r g b a\`, then the seven color keys shown in the inspector — the same layout as the keys table a Ramp TOP keeps for its own ramp editor. Then create a **Ramp TOP** \`ramp1\`: *Type* **Horizontal**, *DAT* \`palette\`, and on its Common page *Output Resolution* **Custom Resolution**, *Resolution* **256 × 1**. You should see a thin strip running from sea blue to snow.`,
            nodes: ['normalize2', 'palette', 'ramp1'],
          },
          {
            title: 'Look up the color',
            body: `Append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`height\`, *Output Attribute Scope* **Color**.

Finish with a **Null POP** \`null1\`, move the display and render flags to it, and middle-click: \`Color\` is now a float4 on every point. The viewer already shows a tinted island.`,
            nodes: ['lookuptex1', 'null1'],
          },
          {
            title: 'Material, camera, light',
            body: `Back in \`/project1\`, create a **PBR MAT** \`pbr1\` with *Base Color* **1, 1, 1** and *Roughness* **0.8**, and assign it on \`geo1\`'s Render page. White base color means the point colors come through unchanged.

Create a **Camera COMP** \`cam1\` (*Translate* **0, 2.8, 4.4**, *Look At* \`../geo1\`) and a **Light COMP** \`light1\` (*Translate* **−4, 5, 2**). Give \`geo1\` a slow spin: *Rotate Y* = \`absTime.seconds * 4\`.`,
            nodes: ['pbr1', 'cam1', 'light1'],
            focus: ['geo1'],
          },
          {
            title: 'Render',
            body: `Create a **Render TOP** \`render1\` pointing at \`cam1\`, \`geo1\` and \`light1\`, *Anti-Alias* **4x**, near-black *Background Color*, and end in a **Null TOP** \`out1\`.

Now play: drag the rows of \`palette\`, change *Map to Low* on \`normalize1\` to grow or drown the island, raise *Harmonics* for craggier coasts.`,
            nodes: ['render1', 'out1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## How the island works

**The mask is just math on attributes.** \`math1\` and \`normalize1\` never move a point. They compute a number per point, store it, and pass it on. That's the core habit of POP work: build the data you need first, then let an operator consume it. Splitting the work this way also makes it debuggable — you can middle-click \`normalize1\` and check the range of \`island\` before any noise is involved.

**The Map page turns attributes into parameters.** Normally *Offset* is one number for the whole Noise POP. The *Map* page lets an input attribute replace it (**Set**), scale it (**Multiply**) or add to it (**Add**) individually for every point. Here the noise value per point is roughly *noise × Amplitude + island*, so the middle is pushed up by about 0.4 and the corners pulled down by about 0.8 before the ripples are applied. The same mechanism exists on the [[Transform POP]] and several others; you'll use it constantly.

**Scope makes the noise vertical.** By default the Noise POP adds a three-component offset to \`P\`, which would shove points sideways and tear the grid's even spacing. With *Noise Size* at 1 and both scopes set to \`P.y\`, it produces one value per point and adds it to one component. The same trick works on any attribute: \`Color.rgb\`, \`PointScale\`, or a custom one.

**Normalize before you look up.** A palette lookup expects an index between 0 and 1. Raw \`P.y\` might run from 0 to 0.62 today and 0 to 0.81 after you touch *Amplitude*. \`normalize2\` re-measures the range every cook, so the snow always lands on the highest peak. If you'd rather have *absolute* heights — snow only above a fixed altitude — swap \`normalize2\` for a Math POP with fixed *Map from* / *Map to* values.

**Why a texture for colors?** The [[Lookup Texture POP]] samples a TOP at a 0–1 coordinate and writes the pixel into any attribute. That makes any image a lookup table: a [[Ramp TOP]] gradient, a photo, a painted strip, even a live video. Its sister operators work the same way with other sources: the [[Lookup Channel POP]] samples CHOP channels (next lesson) and the [[Lookup Attribute POP]] samples another POP's attributes.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Read the attribute list like a recipe',
      md: `Middle-click \`null1\` and read its attribute list: alongside \`P\` and \`N\` you'll find \`dist\`, \`island\`, \`height\` and \`Color\`. On a Null every one is marked \`(r)\` — a reference to a buffer that some upstream node allocated. The list tells you the story of the network even if you've never seen it before. Name your attributes so that story is readable.`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Set \`ramp1\`'s *Interpolate Notches* to **Step** and the gradient turns into flat bands of color — the classic hypsometric-tint look of printed atlases.
* Replace the palette with two colors (ink and paper) and the island becomes a graphic print.
* Swap \`ramp1\` for a [[Movie File In TOP]] holding a photo: the colors now come from a row of real pixels.
* Change the mask: use \`P.x\` instead of \`P.xz\` in \`math1\` and the distance is measured from a line instead of a point — you get a long ridge of land instead of a round island.`,
    },
    {
      kind: 'challenge',
      title: 'Contour terraces',
      md: 'Turn the smooth island into a stepped "contour model" like an architect\'s layered cardboard terrain: heights should snap to flat terraces about 0.04 units apart, with the sea still flat.',
      hints: [
        'You need to quantize one component of `P`. The Limit POP has a second page you haven\'t used yet.',
        'Insert the new node after `limit1` and before `normal1`, so the normals see the terraces.',
      ],
      solution:
        'Insert a second **Limit POP** between `limit1` and `normal1`. Set *Input Attribute Scope* and *Output Attribute Scope* to `P.y`, leave the limit types as they are (heights are already between 0 and 1), and on the **Quantize** page set *Quantize* to **Floor** with *Value Step* **0.04**. Every height snaps down to a multiple of 0.04. Because `normal1` comes after it, the flat tops light evenly and the risers between them catch the light like cliffs. Try *Value Step* 0.1 for a bolder, more graphic look.',
    },
    {
      kind: 'challenge',
      title: 'Color by slope',
      md: 'Real maps often paint steep ground as rock and gentle ground as grass, regardless of altitude. Make a second version of the coloring where the lookup index is the steepness of the terrain instead of its height.',
      hints: [
        'Which existing attribute already knows how steep the surface is at each point? Think about which way it points on flat ground.',
        'A lookup index can be a single component: try a swizzle in *Lookup Index Attribute U*.',
      ],
      solution:
        'Use the normal. On flat ground `N` points straight up, so `N.y` is 1; on a cliff it tilts toward horizontal and `N.y` drops toward 0. Set `lookuptex1`\'s *Lookup Index Attribute U* to `N.y` (or `N(1)`), and edit `palette` so position 0 is grey rock and position 1 is green. Because `normal1` sits upstream of the lookup, the index is always up to date. For the best of both, keep the height lookup writing `Color` and add a second Lookup Texture POP after it that writes only `Color.rgb` from a slope palette, then compare the two with the Bypass flag.',
    },
    {
      kind: 'challenge',
      title: 'Audit the island',
      md: 'Without guessing, find out: (1) the type and size of `dist`, `island` and `height`; (2) whether any point has `height` exactly 0 that is *not* sea; (3) which node allocated `Color`.',
      hints: [
        'The middle-click info popup answers (1) and (3). Look for the `(r)` marks.',
        'For (2), a POP to DAT can show `P` and `height` side by side. On 90 000 points, thin it out.',
      ],
      solution:
        '(1) Middle-click `null1`: `dist`, `island` and `height` are single floats. (3) In the same popup, every attribute except those `null1` touched is marked `(r)`; middle-click upward until you find the node where `Color` appears *without* `(r)` — `lookuptex1`. (2) Point a POP to DAT at `geo1/null1` with *Attributes* `P height`, turn on *Thin Out Range* and set *Thin Step* to a few hundred. Rows with `height` 0 all have `P(1)` 0: after `limit1`, the lowest point of the terrain *is* the sea, so a height of exactly 0 can only be water. Turn the DAT\'s *Active* off when you\'re done.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'A grid of quads stores each quad as…',
          options: [
            'Four copies of the corner points',
            'Four vertices, each an index into the shared point list',
            'One point at its center plus a size',
            'A primitive attribute holding four positions',
          ],
          answer: 1,
          explain: 'Vertices reference points by index, so neighboring quads share their corner points instead of duplicating them.',
        },
        {
          q: 'You want a Noise POP to move points only up and down. What do you change?',
          options: [
            'Set Amplitude to 0 for X and Z on the Transform page',
            'Set Noise Size to 1 and both Combine and Output Attribute Scope to `P.y`',
            'Use a Perlin 2D noise type',
            'Turn on Compute Point Normals',
          ],
          answer: 1,
          explain: 'With a single noise value per point and both scopes set to the Y component, the noise is added to `P.y` only.',
        },
        {
          q: 'Which statement about `_PointU` is true?',
          options: [
            'It is stored on every point and can be overwritten with a Math POP',
            'It is computed on the fly, read-only, and not passed downstream unless you copy it into a real attribute',
            'It is the same as `Tex(0)`',
            'It only exists on Grid POPs',
          ],
          answer: 1,
          explain: 'Built-ins starting with `_` are calculated as each POP cooks. You can read them anywhere, but to keep the value you must write it to an attribute.',
        },
        {
          q: 'Why does the island normalize `P.y` into `height` before the Lookup Texture POP?',
          options: [
            'Lookup Texture only accepts integer indices',
            'Normalizing makes the lowest point sample the left edge of the palette and the highest the right edge, whatever the noise amplitude',
            'It recomputes the normals',
            'It moves the points into the 0–1 range so they fit the camera',
          ],
          answer: 1,
          explain: 'A lookup index runs from 0 to 1. Rescaling height to that range maps the full palette onto the terrain, and keeps doing so when you change the shape.',
        },
        {
          q: 'What is the cost of leaving a POP to DAT active on a large, animated POP?',
          options: [
            'None, DATs are free',
            'It doubles the GPU memory of the POP',
            'It downloads point data from the GPU to the CPU whenever it updates, which can cost frames',
            'It forces every upstream POP to run on the CPU',
          ],
          answer: 2,
          explain: 'POP data lives on the GPU. Showing it in a table means a GPU→CPU transfer; thin the data out while you inspect and switch the DAT off when you are done.',
        },
      ],
    },
  ],
};

export default lesson;
