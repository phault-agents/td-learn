import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'fields-and-weights',
  title: 'Fields & Weights',
  subtitle: 'Give every point a 0–1 "how much" — then use it to bend, tint and carve geometry.',
  minutes: 40,
  summary:
    'A Field POP measures how far inside a shape each point is and stores it as a `Weight`. Feed that weight to a Transform POP, a Math Mix POP and a Delete POP to build a magnetic cursor that bulges and recolors a dense grid, then carve a point lattice with two combined fields.',
  objectives: [
    'Explain what a field is and what the `Weight` attribute means',
    'Shape a field with Mode, Radius, Transition Range, Transition Align and Transition Type',
    'Use a weight to drive a partial transform (Transform POP *Weight Attribute*)',
    'Blend two colors per point with the Math Mix `mix(A, B, C)` operation',
    'Animate a field from CHOP channels with `op()` expressions',
    'Combine fields with min/max/subtract logic and cut points away with the Delete POP',
  ],
  requires: ['attributes', 'chops-drive-pops'],
  tags: ['field', 'weight', 'transform', 'math mix', 'delete', 'masking'],
  blocks: [
    {
      kind: 'md',
      md: `
Picture a sheet of fabric stretched flat, and an invisible magnet gliding underneath it. Wherever the magnet passes, the fabric lifts into a soft bump and glows hot orange; behind it the surface settles back to cool blue. That's what you'll build: a **magnetic cursor** moving over a 48 000-point grid.

The trick behind it is one of the most reusable ideas in POPs. Instead of moving points directly, you first compute a number per point that says *how much* each point should be affected — a **weight** between 0 and 1. Every other operator then just reads that number. Bend by weight, tint by weight, delete by weight, scale forces by weight. Change the shape of the weight, and every effect follows.

## Fields: masks for geometry

If you've used a matte or alpha channel in TOPs, you already know the idea. A mask doesn't do anything by itself; it tells a *later* operation where to act. The [[Field POP]] is a mask generator for points. It places a shape in space — a sphere, box, torus, tube, capsule, a plane or a paraboloid — and writes an attribute called \`Weight\`: **1** for points inside the shape, **0** for points outside.

A hard 0/1 edge is useful for cutting, but for deformation you want a gradient. That's what the *Transition* parameters do:

* **Transition Range** — the distance over which the weight fades from 1 to 0. At 0 the edge is razor sharp.
* **Transition Align** — where that fade sits relative to the shape's surface. At its default the weight is 0.5 right on the surface; push it to −0.5 and the fade finishes *at* the surface (the shape shrinks); push it to 0.5 and the fade starts at the surface and extends outward (the shape grows).
* **Transition Type** — the curve of the fade: **Linear**, **Smooth Step** or **Ease In Ease Out**. Smooth Step is the one that makes bumps look organic instead of conical.

Then there are a few post-processing switches: *Invert* flips inside and outside, *Absolute Value* folds negative results, and *To Range* remaps the 0–1 result (try 0.2–1 so nothing is ever fully unaffected).
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Weight vs. signed distance',
      md: `A Field POP can output two different measurements (Output page):

* **Weight** — the shaped 0–1 mask described above. This is what most operators want: the [[Transform POP]] has a dedicated *Weight Attribute* field for it.
* **Signed Distance** — the raw distance from each point to the field's surface, with the sign telling inside from outside. It isn't clamped, so it keeps growing as you move away. Use it when you need *distance*, not membership: contour rings, falloffs you shape yourself in a [[Math Mix POP]], or "push away harder the closer you are".

Both outputs are just attributes. The text field to the right of each toggle names the attribute it writes — rename them whenever you use more than one field.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'magnetic-cursor',
        title: 'Magnetic cursor',
        root: '/project1',
        height: 540,
        caption:
          'Dive into **geo1** to see the field chain. The Noise CHOP wanders in two channels and `field1` reads them with `op(\'cursor\')` expressions (the dashed line). Everything downstream of the field only ever reads `Weight`.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: 'pbr1' } },
            note: 'Holds the whole field chain. Only `null1` inside has render/display flags.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Quadrilaterals',
                  Size: [6, 6],
                  Columns: 220,
                  Rows: 220,
                  Rotate: [-90, 0, 0],
                  Normal: 'Point',
                },
                note: 'The fabric: about 48 000 points connected as quads, rotated flat onto the XZ "floor". It has to be dense — a field can only bend the points that exist, so a coarse grid gives a faceted bump.',
              },
              {
                id: 'field1',
                type: 'fieldPOP',
                x: 1,
                y: 0,
                inputs: ['grid1'],
                params: {
                  Mode: 'Sphere',
                  Radius: [0.9, 0.9, 0.9],
                  'Transition Range': 1.0,
                  'Transition Type': 'Smooth Step',
                  Translate: [{ expr: "op('cursor')['tx']" }, 0, { expr: "op('cursor')['tz']" }],
                },
                note: 'The magnet. Adds `Weight` to every point: 1 near the cursor, fading smoothly to 0 about half a unit beyond the radius. Its *Transform* page moves the field itself — the points stay put.',
              },
              {
                id: 'transform1',
                type: 'transformPOP',
                x: 2,
                y: 0,
                inputs: ['field1'],
                params: { 'Weight Attribute': 'Weight', Translate: [0, 0.7, 0] },
                note: 'Lifts points by up to 0.7 units — but only as much as their weight allows. Weight 1 moves the full amount, weight 0 not at all, in between proportionally. That\'s the bump.',
              },
              {
                id: 'normal1',
                type: 'normalPOP',
                x: 3,
                y: 0,
                inputs: ['transform1'],
                params: { 'Normals Action': 'Always Compute' },
                note: 'Rebuilds `N` for the deformed surface. Without it the bump keeps the flat grid\'s straight-up normals and the lighting can\'t see it.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 4,
                y: 0,
                inputs: ['normal1'],
                params: {
                  color0name: 'calm',
                  'RGB[0]': [0.06, 0.1, 0.24],
                  'color0name[1]': 'hot',
                  'RGB[1]': [1, 0.42, 0.12],
                  Operation: 'mix(A, B, C)',
                  'Scope A': 'calm',
                  'Scope B': 'hot',
                  'Scope C': 'Weight',
                  'Result Scope': 'Color',
                },
                note: 'Two color uniforms (*Uniforms* page) and one Combine block: `Color = mix(calm, hot, Weight)`. Where the weight is 0 you get *calm*, where it\'s 1 you get *hot*, and a smooth blend in between.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['mathmix1'],
                flags: { display: true, render: true },
                note: 'End of the chain, flags on.',
              },
              {
                id: 'noise1',
                type: 'noiseCHOP',
                x: 0,
                y: 1.3,
                params: {
                  'Channel Names': 'tx tz',
                  Period: 5,
                  Amplitude: 2.2,
                  'Time Slice': true,
                },
                note: 'Two smooth, never-repeating curves become the cursor\'s X and Z. *Time Slice* makes the CHOP compute only the current moment, so it keeps flowing forever instead of looping over a fixed range.',
              },
              {
                id: 'cursor',
                type: 'nullCHOP',
                x: 1,
                y: 1.3,
                inputs: ['noise1'],
                note: 'The stable name every expression points at. Swap the Noise CHOP for a Mouse In CHOP or an LFO later and nothing downstream needs to change.',
              },
            ],
            childComments: [
              { x: 2, y: 0.85, w: 3, text: 'The field computes `Weight`; everything to its right just *reads* it.' },
              { x: 2, y: 1.45, w: 2.6, text: 'The cursor position lives in CHOPs, so you can swap its source freely.' },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.15,
            params: { 'Xform:Translate': [0, 4.2, 6], 'Xform:Rotate': [-35, 0, 0] },
            note: 'Up and back, tilted down about 35° so you look across the surface — a low angle shows the bump\'s silhouette.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 0,
            y: 2.3,
            params: { 'Xform:Translate': [-3, 5, 2] },
            note: 'A light from the side rakes across the surface, so the bump casts a clear bright/dark gradient.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 2.3,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.45, Metallic: 0 },
            note: 'A white base color lets the point `Color` from the Math Mix come through untinted (the PBR MAT applies point color by default).',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 1,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              Lights: { ref: 'light1' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.02, 0.03, 1],
            },
            note: 'The usual render stack from lesson 1.1.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 3,
            y: 1,
            inputs: ['render1'],
            note: 'The final image.',
          },
        ],
        comments: [{ x: 1, y: -0.55, w: 2.4, text: 'Field, deformation, color and the CHOP cursor all live inside geo1.' }],
        steps: [
          {
            title: 'A dense floor',
            body: `Create a **Geometry COMP** \`geo1\`, dive in and delete its default contents. Add a **Grid POP** \`grid1\`:

* *Connectivity* **Quadrilaterals**, *Size* **6, 6**, *Columns* and *Rows* **220**
* *Rotate* **-90, 0, 0** so the grid lies flat on XZ
* *Normal* **Point**

Middle-click it: roughly 48 000 points. That density is the "resolution" of every effect you'll add.`,
            nodes: ['geo1', 'grid1'],
          },
          {
            title: 'Drop in a field',
            body: `Append a **Field POP** \`field1\`. Set *Mode* **Sphere** and *Radius* **0.9, 0.9, 0.9**. Leave it at the origin for now.

Middle-click it: there's a new \`Weight\` attribute. With *Transition Range* at 0 it's binary — 1 inside the sphere, 0 outside. Set *Transition Range* to **1** and *Transition Type* to **Smooth Step** to turn the hard edge into a soft falloff. Scrub *Transition Align* between −0.5 and 0.5 to feel how it moves the fade inward or outward, then put it back to 0.`,
            nodes: ['field1'],
          },
          {
            title: 'Bend by weight',
            body: `Append a **Transform POP** \`transform1\`. Set *Translate* to **0, 0.7, 0**. With *Weight Attribute* empty, the whole grid jumps up. Now type \`Weight\` into *Weight Attribute* (or pick it from the menu): only the region around the field rises, in a smooth dome.

Append a **Normal POP** \`normal1\` with *Normals Action* **Always Compute** so the new shape gets correct normals.`,
            nodes: ['transform1', 'normal1'],
          },
          {
            title: 'Color by weight',
            body: `Append a **Math Mix POP** \`mathmix1\`. On its **Uniforms** page add two **Color** blocks: name the first \`calm\` with *RGB* **0.06, 0.1, 0.24**, the second \`hot\` with *RGB* **1, 0.42, 0.12**.

On the **Combine** page, block 0: *Operation* **mix(A, B, C)**, *Scope A* \`calm\`, *Scope B* \`hot\`, *Scope C* \`Weight\`, *Result Scope* \`Color\`.

Finish with a **Null POP** \`null1\`, render and display flags on.`,
            nodes: ['mathmix1', 'null1'],
          },
          {
            title: 'Camera and light',
            body: `Back in \`/project1\`, create a **Camera COMP** \`cam1\` (*Translate* **0, 4.2, 6**, *Rotate* **-35, 0, 0**) and a **Light COMP** \`light1\` (*Translate* **-3, 5, 2**).`,
            nodes: ['cam1', 'light1'],
          },
          {
            title: 'Material and render',
            body: `Create a **PBR MAT** \`pbr1\` (*Base Color* white, *Roughness* **0.45**, *Metallic* **0**) and assign it on \`geo1\`'s Render page. Add a **Render TOP** \`render1\` pointing at \`cam1\`, \`geo1\` and \`light1\`, with *Anti-Alias* **4x** and a near-black background, and a **Null TOP** \`out1\` after it.

You should see a dark blue floor with an orange bump in the middle.`,
            nodes: ['pbr1', 'render1', 'out1'],
          },
          {
            title: 'Set the magnet loose',
            body: `Still inside \`geo1\`, create a **Noise CHOP** \`noise1\`: *Channel Names* \`tx tz\`, *Period* **5**, *Amplitude* **2.2**, and on the Common page turn on **Time Slice**. Wire it into a **Null CHOP** named \`cursor\`. CHOPs can live in any network — keeping them next to the field makes \`geo1\` a self-contained piece you could save as a .tox.

Now in \`field1\` → *Transform* page, put *Translate X* in expression mode with \`op('cursor')['tx']\` and *Translate Z* with \`op('cursor')['tz']\`. (If the CHOP lived up in \`/project1\`, the path would be \`op('../cursor')\` — relative paths start from the network the expression's node is in.)

The bump and its glow now drift across the floor. Nothing in the deformation or coloring chain changed — they only ever read \`Weight\`.`,
            nodes: ['noise1', 'cursor'],
            focus: ['field1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why this network is shaped the way it is

**One measurement, many consumers.** The field runs once, and three operators read its output. If you later want a box-shaped magnet, a tube, or a field that pulses, you edit *one* node. This separation — *compute a mask, then apply effects through it* — scales to big networks better than any amount of clever per-node math.

**The Transform POP blends, it doesn't threshold.** With a *Weight Attribute* set, each point is moved by its own fraction of the transform: weight 0.25 gets a quarter of the 0.7-unit lift. The same is true for rotation and scale. Try *Uniform Scale* **0.6** instead of the translate and set the transform's *Pivot* with the same two \`op('cursor')\` expressions: points near the cursor now get pulled toward its center like a lens.

**mix() is a crossfade.** \`mix(A, B, C)\` returns A when C is 0, B when C is 1, and a straight-line blend in between — the same as a crossfade slider. Because \`Weight\` already has a smooth-step shape, the color fade inherits that softness for free. Middle-click \`mathmix1\` to see the pseudo-code it generated.

**Normals come after deformation.** Any time you move points in a way that changes the surface's slope, recompute normals afterwards. Order matters: put the [[Normal POP]] *after* the Transform, or it computes normals for the flat grid.

## The field shapes

The *Mode* menu holds twelve shapes:

| Mode | Think of it as |
|---|---|
| **Sphere** | a ball — an ellipsoid if the three *Radius* values differ |
| **Box** | a cuboid region sized by *Size* |
| **Torus** | a ring |
| **Tube Infinite / Tube Capped / Tube Rounded**, **Capsule** | cylinders and pills; *Height* sets the tube length, *Roundness* the rounding |
| **X-Plane / Y-Plane / Z-Plane** | everything on one side of a plane |
| **Parabola** | a bowl-shaped region, curved by *Exponent* |
| **Line Projection** | a two-point shape (*Point A*, *Point B*) worth exploring on your own |

Only some Field page parameters apply to each mode, so watch which ones respond when you switch. All shapes can be moved, rotated and scaled on the *Transform* page, and every Transform parameter can be animated. The planes are underrated: an animated **Y-Plane** with a transition range is a perfect "reveal" wipe.
`,
    },
    {
      kind: 'md',
      md: `
## Combining fields

Real scenes rarely need just one mask. There are three ways to get several fields into one network, and they suit different jobs.

**1. Many fields of the same kind: the Specification POP.** A Field POP can read a whole list of fields from another POP, one field per point. Point its *Specification POP* parameter at, say, a [[Point POP]] where each point carries attributes named after the Field POP's parameter *Python names* (\`radx\`, \`transitionrange\`…). The point's \`P\` overrides the field's translate. The resulting weights are merged screen-style, so overlapping fields add up but never exceed 1. Ten moving magnets for the price of one node — and because the specification is just points with attributes, you can generate it procedurally too: from particles, or from CHOP or table data converted to points.

**2. Fold a field into another attribute: Combine Operation.** On the Field POP's Output page, *Combine Operation* (**Add** or **Multiply**) applies the weight (or signed distance, via *Combine Entity*) to another attribute directly. Multiplying a force or a \`PointScale\` by a field confines it to a region without any extra nodes.

**3. Different shapes, explicit logic: name the weights and do the math.** Give each Field POP its own output name, then combine them in a Math Mix POP with the operation that matches the boolean you want:

| You want | Math Mix operation | Reads like |
|---|---|---|
| Union (either shape) | **max(A, B)** | "inside A *or* B" |
| Intersection (both shapes) | **min(A, B)** or **A * B** | "inside A *and* B" |
| Subtraction | **A - B** | "inside A but not B" |

This third approach is the most transparent, so it's what the next build uses: a solid ball of points with a rotating square tunnel carved through it.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'carve',
        title: 'Carving with two fields',
        root: '/project1',
        height: 440,
        caption:
          'Render it with the camera and Render TOP from the main build: set `render1`\'s *Geometry* to `geo2` (or `geo*` to see both). The Delete POP only keeps points whose `keep` value is 0.5 or more.',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: 'linemat1' } },
            note: 'A second object: a 3D lattice of point primitives, rendered as dots by the Line MAT.',
            children: [
              {
                id: 'grid2',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Point Primitives',
                  Size: [3, 3, 3],
                  Columns: 36,
                  Rows: 36,
                  Slices: 36,
                },
                note: 'A cube of roughly 46 000 points. *Slices* makes the grid three-dimensional; point primitives make each point drawable.',
              },
              {
                id: 'field2',
                type: 'fieldPOP',
                x: 1,
                y: 0,
                inputs: ['grid2'],
                params: { 'Output:Weight': [true, 'wball'], Mode: 'Sphere', Radius: [1.4, 1.4, 1.4] },
                note: 'The ball. Output page: rename the *Weight* output to `wball`. No transition range — booleans want crisp 0/1 edges.',
              },
              {
                id: 'field3',
                type: 'fieldPOP',
                x: 2,
                y: 0,
                inputs: ['field2'],
                params: { 'Output:Weight': [true, 'wbox'],
                  Mode: 'Box',
                  Size: [0.8, 0.8, 4],
                  Rotate: [0, { expr: 'absTime.seconds * 20' }, 0],
                },
                note: 'The tunnel: a long thin box that spins about Y. Output page: rename its *Weight* output to `wbox`, so it doesn\'t overwrite the ball\'s weight.',
              },
              {
                id: 'mathmix2',
                type: 'mathmixPOP',
                x: 3,
                y: 0,
                inputs: ['field3'],
                params: { Operation: 'A - B', 'Scope A': 'wball', 'Scope B': 'wbox', 'Result Scope': 'keep' },
                note: '`keep = wball - wbox`: 1 inside the ball and outside the tunnel, 0 or below everywhere else.',
              },
              {
                id: 'delete1',
                type: 'deletePOP',
                x: 4,
                y: 0,
                inputs: ['mathmix2'],
                params: { Operation: 'Delete Selected', Entity: 'Points', attr0inattr: 'keep', Function: '<', Value: 0.5 },
                note: 'Attribute page, first block: select points where `keep < 0.5` and delete them. Point primitives that lose their point go with it.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['delete1'],
                flags: { display: true, render: true },
                note: 'Flags on.',
              },
            ],
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 0,
            y: 1.2,
            params: {
              'Draw Points': true,
              'Point Type': 'Circle (Polygon)',
              'Distance Near': 4,
              'Distance Far': 9,
              'Width Near': 4,
              'Width Far': 1.5,
              'Point Near Color': [1, 0.78, 0.45],
              'Specify Point Far Color': true,
              'Point Far Color': [0.15, 0.25, 0.6],
            },
            note: 'Draws each point as a dot. Near dots are bigger and warm, far dots smaller and cool — cheap depth cueing that makes a dense point cloud readable.',
          },
        ],
        steps: [
          {
            title: 'A lattice of points',
            body: `Create a **Geometry COMP** \`geo2\` and, inside it, a **Grid POP** \`grid2\`: *Connectivity* **Point Primitives**, *Size* **3, 3, 3**, *Columns*, *Rows* and *Slices* **36**.`,
            nodes: ['geo2', 'grid2'],
          },
          {
            title: 'Two named fields',
            body: `Append a **Field POP** \`field2\` (*Mode* **Sphere**, *Radius* **1.4**). On its **Output** page, change the name in the text field next to the *Weight* toggle to \`wball\`.

Append a second **Field POP** \`field3\`: *Mode* **Box**, *Size* **0.8, 0.8, 4**, and on the Transform page *Rotate Y* = \`absTime.seconds * 20\`. Rename its weight output to \`wbox\`. Middle-click it: both weights now coexist.`,
            nodes: ['field2', 'field3'],
          },
          {
            title: 'Subtract and delete',
            body: `Append a **Math Mix POP** \`mathmix2\`: *Operation* **A - B**, *Scope A* \`wball\`, *Scope B* \`wbox\`, *Result Scope* \`keep\`.

Append a **Delete POP** \`delete1\`: *Operation* **Delete Selected**, *Entity* **Points**. On its **Attribute** page, first block: *Attribute* \`keep\`, *Function* **<**, *Value* **0.5**. End with a **Null POP** \`null2\`, flags on.`,
            nodes: ['mathmix2', 'delete1', 'null2'],
          },
          {
            title: 'Dots with depth',
            body: `In \`/project1\` create a **Line MAT** \`linemat1\` with *Draw Points* on and *Point Type* **Circle (Polygon)**. Set *Distance Near/Far* to **4 / 9**, *Width Near/Far* to **4 / 1.5**, a warm *Point Near Color*, and turn on *Specify Point Far Color* with a deep blue. Assign it as \`geo2\`'s *Material*, then add \`geo2\` to \`render1\`'s *Geometry*.`,
            nodes: ['linemat1'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Deleting is "indirect"',
      md: `The Delete POP can't know on the CPU how many points survive — that's decided on the GPU every frame. It allocates for the worst case and passes the real count along on the GPU, which is fast as long as nothing asks the CPU for it. Leaving an info popup open or reading \`numPoints()\` from Python forces a download and can cost you frames. See the **POP Essentials** reference for the details. If all you want is "remove points with zero weight", the Field POP's own *Delete Zeros* toggle does it in the same node.`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Swap \`mix()\` for a [[Lookup Texture POP]] reading a [[Ramp TOP]] with \`Weight\` as the lookup index — a full gradient instead of two colors.
* Lift along the normal instead of world Y on a [[Sphere POP]]: a blob that grows a tumour wherever the magnet passes.
* Drive *Radius* from an audio level and the magnet breathes with the music (Module 3).`,
    },
    {
      kind: 'challenge',
      title: 'Follow the mouse',
      md: 'Make the magnet follow your mouse instead of the Noise CHOP — moving left/right across the screen should move it across X, up/down along Z.',
      hints: [
        'The [[Mouse In CHOP]] outputs the pointer position as two channels. Check its *Output Coordinates* menu and look at the values in its viewer while you move the mouse.',
        'The grid spans −3 to 3. Put a [[Math CHOP]] after the Mouse In CHOP and use its *Range* page (*From Range* → *To Range*) to map the mouse range onto that.',
        'Your field expressions read channels named `tx` and `tz`. Either rename the channels, or change the expressions to the Mouse In CHOP\'s channel names.',
      ],
      solution:
        'Create a Mouse In CHOP → Math CHOP → wire the Math CHOP into `cursor` in place of `noise1`. In the Math CHOP set *From Range* to the range you see in the Mouse In viewer and *To Range* to **-3, 3**. Then edit the two expressions in `field1` to read the mouse channel names (the X channel into *Translate X*, the Y channel into *Translate Z*; put a minus sign in front if the direction feels inverted). Add a [[Lag CHOP]] before the Null if the motion feels too twitchy.',
    },
    {
      kind: 'challenge',
      title: 'Contour rings',
      md: 'Instead of a single glow, draw concentric bands around the cursor — like contour lines on a map — using the Field POP\'s **Signed Distance** output.',
      hints: [
        'Turn on *Signed Distance* on `field1`\'s Output page and give it a clear name such as `sdist`.',
        'Stripes come from repeating a value: `fract()` keeps only the part after the decimal point, so a distance multiplied by 6 repeats six times per unit.',
        'You can stack several Combine blocks in `mathmix1`. Write intermediate results to temporary attributes and feed them into later blocks.',
      ],
      solution:
        'In `field1` turn on **Signed Distance** and name it `sdist`. In `mathmix1` insert blocks before the color block: block 0 **A * B** with `sdist` and `6` → `rings`; block 1 **fract(A)** with `rings` → `rings`. Then use `rings` (instead of, or multiplied with, `Weight`) as *Scope C* of the `mix(A, B, C)` block. To fade the rings out with distance, add a block **A * B** with `rings` and `Weight` before the mix. Because `fract()` only cares about the fractional part, the sign of the distance doesn\'t matter here.',
    },
    {
      kind: 'challenge',
      title: 'A scanning wipe',
      md: 'Make a horizontal "scanner" that sweeps up through the carved ball from the second build, revealing points as it passes and hiding them again on the way back down.',
      hints: [
        'One of the Field POP modes splits space with a horizontal plane.',
        'Animate the plane\'s height on the Transform page with a sine of `absTime.seconds`.',
        'Fold the new weight into `keep` with a **min(A, B)** block — intersection means "inside the carved ball *and* below the plane".',
      ],
      solution:
        'Add a third Field POP after `field3` with *Mode* **Y-Plane**, output name `wscan`, and *Translate Y* = `1.6 * math.sin(absTime.seconds * 0.7)`. In `mathmix2` add a second block: **min(A, B)** with Scope A `keep`, Scope B `wscan`, Result Scope `keep`. If the wrong half is revealed, turn on the plane field\'s *Invert*. Give the plane a small *Transition Range* and color by `wscan` for a glowing scan edge.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'A Field POP has *Transition Range* 0. What values can `Weight` take?',
          options: ['Any value from 0 to 1', 'Only 0 or 1', 'Only negative values', 'The distance to the surface'],
          answer: 1,
          explain: 'With no transition range the edge is hard: inside is 1, outside is 0. The range is what creates in-between values.',
        },
        {
          q: 'A Transform POP translates Y by 0.7 with *Weight Attribute* set to `Weight`. Roughly how far does a point with weight 0.5 move?',
          options: ['0 — weights below 1 are ignored', 'About 0.35', '0.7', '1.4'],
          answer: 1,
          explain: 'The weight scales the transform per point, so half the weight gives about half the move.',
        },
        {
          q: 'You animate `field1`\'s *Translate* on its Transform page. What moves?',
          options: [
            'The grid points',
            'The field shape — the points stay where they are and their weights change',
            'The camera',
            'Only the color, never the geometry',
          ],
          answer: 1,
          explain: 'The Field POP\'s Transform page places the *field*, not the points. Moving it changes which points get high weights, and everything that reads `Weight` follows.',
        },
        {
          q: 'You have weights `wa` and `wb`. Which Math Mix operation keeps points inside **either** shape?',
          options: ['A * B', 'min(A, B)', 'max(A, B)', 'A - B'],
          answer: 2,
          explain: 'max() is a union: if either weight is 1, the result is 1. min() and multiply give an intersection; subtraction cuts one shape out of the other.',
        },
        {
          q: 'Why is the Normal POP placed after the Transform POP rather than before it?',
          options: [
            'Normal POPs must always be second-to-last',
            'Normals have to describe the shape after it\'s been bent, or the lighting ignores the bump',
            'The Transform POP deletes normals',
            'It makes the Field POP faster',
          ],
          answer: 1,
          explain: 'Lighting uses `N`. Computed before the deformation, the normals would describe the flat grid.',
        },
      ],
    },
  ],
};

export default lesson;
