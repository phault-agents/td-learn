import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'instancing',
  title: 'Instancing from POPs',
  subtitle: 'One box, two thousand buildings: let a POP point list place, size and color copies of a shape.',
  minutes: 40,
  summary:
    'A Geometry COMP can draw its geometry once per point of another POP. Build a noise-driven city where every point becomes a tower — position from `P`, height from a custom attribute, color from a ramp — then wrap towers around a planet with Rotate to Vector, and learn when the Copy POP is the better tool.',
  objectives: [
    'Explain what hardware instancing is and which data it reads from a POP',
    'Set up the Instance pages: Default Instance OP, Translate from `P(0) P(1) P(2)`, Scale from a custom attribute',
    'Give every instance its own color from a `Color` attribute (Instance 2 page)',
    'Orient instances along `N` with Rotate to Vector, and pick the right transform order',
    'Decide between instancing and the [[Copy POP]]',
  ],
  requires: ['attributes', 'fields-and-weights'],
  tags: ['instancing', 'geometry comp', 'noise', 'copy', 'city'],
  blocks: [
    {
      kind: 'md',
      md: `
A city seen from a drone: a grid of towers, tall in the center districts, low at the edges, color shifting with height. Modelling two thousand buildings would be absurd. Instead you'll model **one** box and hand TouchDesigner a list of points that says where each building goes, how tall it is and what color it has.

That's **instancing**. The Geometry COMP sends its geometry to the GPU once and asks it to draw that geometry again for every point of an *instance source*, each time with a different transform and color. Because nothing is duplicated in memory, ten thousand instances cost little more than ten. It's the standard way to render particles as real objects, build bar-chart cities from data, or scatter rocks over terrain.

## Two POPs, two jobs

An instanced Geometry COMP always involves two separate pieces of geometry, and keeping them apart in your head is most of the battle:

* **The shape** — what each instance looks like. In this lesson, a [[Box POP]]. It sits inside the Geo with its **render flag on**, like any geometry you'd render.
* **The instance source** — a POP whose **point list** says where the shapes go. It is *not* rendered: you point the Geo's *Default Instance OP* at it, and its render and display flags stay off.

Instancing only reads the instance source's points and their attributes. Its primitives are ignored, so a Grid POP with *Connectivity* **None** is a perfectly good source.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'How the Instance pages read a POP',
      md: `Every per-instance transform on the Geometry COMP's **Instance** page (Translate X/Y/Z, Rotate X/Y/Z, Scale X/Y/Z, Pivot X/Y/Z) and on **Instance 2** (Rotate to Vector, Color R/G/B/A, texture coordinates) is a text field that names **one attribute component** of the source POP:

* \`P(0)\`, \`P(1)\`, \`P(2)\` — the X, Y and Z of position
* \`N(0)\` … \`N(2)\` — the normal; \`Color(0)\` … \`Color(3)\` — RGBA
* a scalar attribute is just its name: \`height\`, \`PointScale\`

Use the **▸ menu** to the right of each field: it lists exactly what the source POP offers, spelled the way TouchDesigner wants it. A field left empty uses its neutral value (no offset, scale 1).

Each group also has its own OP field (*Translate OP*, *Scale OP*, *Color OP*…). Leave them empty and they fall back to the *Default Instance OP*, or fill one in to take, say, colors from a different POP than positions.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'noise-city',
        title: 'Noise city',
        root: '/project1',
        height: 540,
        caption:
          'Inside **geo1** there are two branches: the long chain on top builds the instance source (`city`, flags off), and `box1` below is the shape that gets drawn — the only node with its render flag on. geo1\'s Instance pages connect them.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: 'city' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
              'Scale Y': 'height',
              'Color Mode': 'Replace',
              R: 'Color(0)',
              G: 'Color(1)',
              B: 'Color(2)',
              Material: { ref: '../pbr1' },
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 6' }, 0],
            },
            note: 'The instancer. *Instance* page: source and per-instance translate/scale. *Instance 2* page: per-instance color. The *Xform* spin turns the whole city as one object.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: { Connectivity: 'None', Size: [8, 8], Columns: 48, Rows: 48, Rotate: [-90, 0, 0] },
                note: 'The building lots: 48 × 48 points on the ground plane, no primitives. Instancing only needs the point list.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['grid1'],
                params: {
                  Type: 'Simplex 3D (GPU)',
                  Period: 3,
                  Harmonics: 2,
                  Amplitude: 1,
                  Noise: true,
                  'Output:Combine Operation': 'None',
                },
                note: 'Writes a smooth random value into a new scalar attribute `Noise` — without moving the points (*Combine Operation* **None**). This is the city\'s "land value" map.',
              },
              {
                id: 'math1',
                type: 'mathPOP',
                x: 2,
                y: 0,
                inputs: ['noise1'],
                params: {
                  'Input Attribute Scope': 'Noise',
                  'Pre Add': 1,
                  Multiply: 0.5,
                  'Post Operation': 'A * A',
                  'Output Attribute Scope': 'h01',
                },
                note: '`h01 = ((Noise + 1) × 0.5)²`. The add-and-halve maps noise into roughly 0–1; squaring keeps most lots low and makes a few towers shoot up, like a real skyline.',
              },
              {
                id: 'ramp1',
                type: 'rampTOP',
                x: 3,
                y: 1.15,
                params: { Type: 'Horizontal' },
                note: 'The palette, left (low) to right (high). Try deep indigo → teal → warm white. Edit the keys by clicking the ramp bar in its parameters.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 3,
                y: 0,
                inputs: ['math1'],
                params: { TOP: { ref: 'ramp1' }, 'Lookup Index Attribute U': 'h01', 'Output Attribute Scope': 'Color' },
                note: 'Uses `h01` as a horizontal position in the ramp and writes the pixel it finds into `Color`.',
              },
              {
                id: 'math2',
                type: 'mathPOP',
                x: 4,
                y: 0,
                inputs: ['lookuptex1'],
                params: { 'Input Attribute Scope': 'h01', Multiply: 2.4, 'Post Add': 0.06, 'Output Attribute Scope': 'height' },
                note: 'Turns the 0–1 value into a building height in world units. The small post-add keeps every lot at least a sliver tall, so there are no invisible zero-height boxes.',
              },
              {
                id: 'city',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['math2'],
                flags: { display: false, render: false },
                note: 'The instance source. Flags **off** — you don\'t want to render these points, only use them. Middle-click it to see `P`, `Noise`, `h01`, `Color` and `height`.',
              },
              {
                id: 'box1',
                type: 'boxPOP',
                x: 5,
                y: 1.15,
                params: { Size: [0.13, 1, 0.13], Translate: [0, 0.5, 0] },
                flags: { display: true, render: true },
                note: 'The shape every instance draws: a 1-unit-tall column whose base sits at y = 0 (translated up by half its height). Scaling it in Y then grows it *upward* from the ground.',
              },
            ],
            childComments: [
              { x: 0, y: 1.05, w: 2.6, text: 'Top row: the instance source. Bottom right: the rendered shape.' },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.15,
            params: { 'Xform:Translate': [0, 6.5, 9], 'Xform:Rotate': [-34, 0, 0] },
            note: 'A drone\'s-eye view, high and tilted down.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 0,
            y: 2.3,
            params: { 'Light Type': 'Distant Light', 'Xform:Rotate': [-50, 35, 0] },
            note: 'A distant light behaves like the sun: parallel rays, so every tower is lit from the same direction and their faces read clearly.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 2.3,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.6, Metallic: 0 },
            note: 'White base color, so the instance color is what you see.',
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
              'Background Color': [0.03, 0.03, 0.05, 1],
            },
            note: 'Renders the Geo once — the GPU repeats the box for every instance.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 3,
            y: 1,
            inputs: ['render1'],
            note: 'Final image.',
          },
        ],
        steps: [
          {
            title: 'One building',
            body: `Create a **Geometry COMP** \`geo1\`, dive in, delete the default contents, and add a **Box POP** \`box1\`: *Size* **0.13, 1, 0.13**, *Translate* **0, 0.5, 0**. Render and display flags on.

The translate lifts the box so its base sits on y = 0. Remember that — it matters as soon as you scale it.`,
            nodes: ['geo1', 'box1'],
          },
          {
            title: 'Camera, sun and material',
            body: `In \`/project1\`: a **Camera COMP** \`cam1\` (*Translate* **0, 6.5, 9**, *Rotate* **-34, 0, 0**), a **Light COMP** \`light1\` with *Light Type* **Distant Light** and *Rotate* **-50, 35, 0**, and a **PBR MAT** \`pbr1\` with a white *Base Color* and *Roughness* **0.6**. Assign \`pbr1\` as \`geo1\`'s *Material*.`,
            nodes: ['cam1', 'light1', 'pbr1'],
          },
          {
            title: 'Render',
            body: `Add a **Render TOP** \`render1\` (\`cam1\`, \`geo1\`, \`light1\`, *Anti-Alias* **4x**, dark background) and a **Null TOP** \`out1\`. One lonely tower in the middle of the frame.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'A point list to instance onto',
            body: `Inside \`geo1\`, add a **Grid POP** \`grid1\`: *Connectivity* **None**, *Size* **8, 8**, *Columns* and *Rows* **48**, *Rotate* **-90, 0, 0**. Append a **Null POP** named \`city\` and make sure its render and display flags are **off**.

Now on \`geo1\`'s **Instance** page: turn on *Instancing*, set *Instance Count Mode* to **Instance OP(s) Length**, and drag \`city\` onto *Default Instance OP* (dragging writes the correct relative path for you). Set *Translate X / Y / Z* to \`P(0)\`, \`P(1)\`, \`P(2)\` — pick them from each field's ▸ menu.

The render now shows 2304 identical one-unit columns in a grid.`,
            nodes: ['grid1', 'city'],
            focus: ['geo1'],
          },
          {
            title: 'Heights from noise',
            body: `Insert between \`grid1\` and \`city\`:

1. A **Noise POP** \`noise1\`: *Type* **Simplex 3D (GPU)**, *Period* **3**, *Harmonics* **2**, *Amplitude* **1**. On its **Output** page turn on *Noise* (it writes an attribute called \`Noise\`) and set *Combine Operation* to **None** so it doesn't move the points.
2. A **Math POP** \`math1\`: *Input Attribute Scope* \`Noise\`, *Pre Add* **1**, *Multiply* **0.5**, *Post Operation* **A \\* A**, *Output Attribute Scope* \`h01\`.
3. A **Math POP** \`math2\`: *Input Attribute Scope* \`h01\`, *Multiply* **2.4**, *Post Add* **0.06**, *Output Attribute Scope* \`height\`.

On \`geo1\`'s Instance page set *Scale Y* to \`height\`. The skyline rises.`,
            nodes: ['noise1', 'math1', 'math2'],
            focus: ['geo1'],
          },
          {
            title: 'Color from a ramp',
            body: `Add a **Ramp TOP** \`ramp1\` inside \`geo1\` with *Type* **Horizontal** and give it a palette you like. Insert a **Lookup Texture POP** \`lookuptex1\` between \`math1\` and \`math2\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`h01\`, *Output Attribute Scope* \`Color\`.

On \`geo1\`'s **Instance 2** page: *Color Mode* **Replace**, and *R / G / B* = \`Color(0)\`, \`Color(1)\`, \`Color(2)\`.`,
            nodes: ['ramp1', 'lookuptex1'],
            focus: ['geo1'],
          },
          {
            title: 'Fly around it',
            body: `On \`geo1\`'s **Xform** page set *Rotate Y* to \`absTime.seconds * 6\`. The Geo's own transform moves the *whole* instanced city as one object — every tower keeps its place relative to the others.`,
            focus: ['geo1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## What just happened

**The instance source is a spreadsheet.** Middle-click \`city\`: 2304 points, each carrying \`P\`, \`Noise\`, \`h01\`, \`Color\` and \`height\` — think of it as a table with one row per point. The Instance pages are a mapping from columns of that spreadsheet onto transform channels. Nothing about instancing knows about noise or cities — any attribute you can compute can drive any channel. Data visualization lessons later in the course use exactly this: rows of a table become points, columns become attributes, attributes become height and color.

**Why the box is lifted.** Instance scale happens around the shape's own origin. A box centred on the origin would grow both up *and* down, sinking half of every building into the ground. Translating the Box POP by half its height puts its base on the origin, so a Y scale of 2.4 makes a tower exactly 2.4 units tall standing on its lot.

**Only Scale Y is mapped.** Empty fields mean "no change", so X and Z scales stay at 1 and the footprint stays the 0.13-unit square you modelled. Map *Scale X* and *Scale Z* to another attribute and you get buildings with varied footprints.

**Replace vs. Multiply.** *Color Mode* decides how the instance color combines with any \`Color\` the shape itself carries. Our box doesn't carry a \`Color\` attribute, so it behaves as white and both modes look the same here. With a colored shape, **Multiply** tints it while **Replace** throws its color away.

**Hiding instances.** The *Active* field on the Instance page takes an attribute too: instances where it's zero are skipped. Point it at a 0/1 attribute — a field weight from the last lesson, say — to switch buildings off without changing the point count.
`,
    },
    {
      kind: 'md',
      md: `
## Pointing instances somewhere: Rotate to Vector

On a flat grid every tower points up, so rotation never mattered. Put the lots on a sphere and each tower must stand along its own surface normal. You *could* compute three Euler angles per point, but the **Instance 2** page has a far simpler tool: **Rotate to Vector**. Give it a direction per instance (\`N\`, a velocity, a tangent…) and it rotates the shape so that its *Forward Direction* axis lines up with that vector. Our box is modelled pointing up, so its forward axis is **+Y**.

There's one subtlety, and it's a classic. *Rotate to Vector: Order* decides **when** that rotation happens relative to the regular translate/rotate/scale. In the **Default** order the rotate-to-vector is applied *first*, and the per-instance scale afterwards — along *world* axes. A tower on the equator, already tipped sideways, then gets stretched along world Y: it shears into a slanted slab. **Pre-Rot** puts the rotate-to-vector together with the regular rotation, *after* the scale, so each box is stretched along its own up-axis first and then stood on the surface. That's the one you want whenever you combine Rotate to Vector with non-uniform scale.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'tiny-planet',
        title: 'Tiny planet',
        root: '/project1',
        height: 420,
        caption:
          'Render with the stack from the main build: set `render1`\'s *Geometry* to `geo2` (or `geo*`). For a solid ground, put a plain slightly smaller sphere in a **separate** Geometry COMP — anything rendered inside geo2 gets instanced.',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: 'planet' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
              'Scale Y': 'height',
              'Rotate to Vector: Order': 'Pre-Rot',
              'Rotate to Vector: Forward Direction': '+Y',
              'Rotate to Vector X': 'N(0)',
              'Rotate to Vector Y': 'N(1)',
              'Rotate to Vector Z': 'N(2)',
              Material: { ref: '../pbr2' },
            },
            note: 'Same idea as geo1, plus *Rotate to Vector* from `N` on the Instance 2 page, applied **Pre-Rot** so the height scale happens along each tower\'s own axis.',
            children: [
              {
                id: 'sphere2',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: {
                  Type: 'Geodesic',
                  'Geodesic Connectivity': 'None',
                  Frequency: 18,
                  Radius: [1.5, 1.5, 1.5],
                  Normal: 'Point',
                },
                note: 'Evenly spaced lots on a ball, each with a point normal pointing straight out.',
              },
              {
                id: 'noise2',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['sphere2'],
                params: { Type: 'Simplex 3D (GPU)', Period: 0.9, Noise: true, 'Output:Combine Operation': 'None' },
                note: 'Same trick as the city: noise into a `Noise` attribute, positions untouched.',
              },
              {
                id: 'math3',
                type: 'mathPOP',
                x: 2,
                y: 0,
                inputs: ['noise2'],
                params: {
                  'Input Attribute Scope': 'Noise',
                  'Pre Add': 1,
                  Multiply: 0.25,
                  'Post Operation': 'A * A',
                  'Output Attribute Scope': 'height',
                },
                note: 'Short towers this time — the planet is small.',
              },
              {
                id: 'planet',
                type: 'nullPOP',
                x: 3,
                y: 0,
                inputs: ['math3'],
                flags: { display: false, render: false },
                note: 'Instance source, flags off.',
              },
              {
                id: 'box2',
                type: 'boxPOP',
                x: 3,
                y: 1.15,
                params: { Size: [0.07, 1, 0.07], Translate: [0, 0.5, 0] },
                flags: { display: true, render: true },
                note: 'A thinner column, base at the origin, modelled pointing up (+Y).',
              },
            ],
          },
          {
            id: 'pbr2',
            type: 'pbrMAT',
            x: 0,
            y: 1.15,
            params: { 'Base Color': [0.92, 0.86, 0.76], Roughness: 0.7 },
            note: 'A warm stone color — no instance color this time, so the material alone sets the look.',
          },
        ],
        steps: [
          {
            title: 'Lots on a sphere',
            body: `Create a **Geometry COMP** \`geo2\`. Inside: a **Sphere POP** \`sphere2\` (*Type* **Geodesic**, *Geodesic Connectivity* **None**, *Frequency* **18**, *Radius* **1.5**, *Normal* **Point**) and a **Null POP** \`planet\` with flags off. Add a **Box POP** \`box2\` (*Size* **0.07, 1, 0.07**, *Translate* **0, 0.5, 0**), flags on.`,
            nodes: ['geo2', 'sphere2', 'planet', 'box2'],
          },
          {
            title: 'Heights',
            body: `Insert a **Noise POP** \`noise2\` (*Type* **Simplex 3D (GPU)**, *Period* **0.9**, Output page: *Noise* on, *Combine Operation* **None**) and a **Math POP** \`math3\` (*Input Attribute Scope* \`Noise\`, *Pre Add* **1**, *Multiply* **0.25**, *Post Operation* **A \\* A**, *Output Attribute Scope* \`height\`) before \`planet\`.`,
            nodes: ['noise2', 'math3'],
          },
          {
            title: 'Instance and orient',
            body: `In \`/project1\` create a **PBR MAT** \`pbr2\` with a warm stone *Base Color* and assign it to \`geo2\`.

On \`geo2\`: *Instancing* on, *Default Instance OP* \`planet\`, *Translate X/Y/Z* \`P(0)\` \`P(1)\` \`P(2)\`, *Scale Y* \`height\`. Look: every tower sticks straight up, even on the equator.

On **Instance 2**: *Rotate to Vector X/Y/Z* = \`N(0)\` \`N(1)\` \`N(2)\`, *Forward Direction* **+Y**. Now flip *Rotate to Vector: Order* between **Default** and **Pre-Rot** and watch the equator towers: sheared slabs vs. clean columns.`,
            nodes: ['pbr2'],
            focus: ['geo2'],
          },
        ],
      },
    },
    {
      kind: 'compare',
      left: {
        title: 'Instancing (Geometry COMP)',
        md: 'The shape exists **once**; the GPU draws it N times with per-instance transform and color. Memory barely grows with the count, and changing the point list updates instantly. But the copies are not geometry you can touch: no POP can bend, noise or delete *parts* of an instance. Best for many rigid objects — particles as meshes, data bars, crowds of props.',
      },
      right: {
        title: 'Copying (Copy POP)',
        md: 'Creates real geometry: every copy\'s points exist in the output, with the template\'s attributes copied onto them if you ask. Downstream POPs can deform the result as a whole — noise across all copies, twist the entire city, delete half of a building. Costs memory proportional to copies × points. Best when you need to process the copies *after* placing them.',
      },
    },
    {
      kind: 'md',
      md: `
A useful rule of thumb from the POP documentation's own advice: **instance where possible; copy when you need to do something to the data after copying.** For small counts the difference hardly matters, so choose whichever is easier to reason about.

The Copy POP's setup mirrors what you just did. Its first input is the shape, its second input the template points; on its *Template* page you switch on *Template Translate*, *Template Rotate*, *Template Scale* or *Template Rotate to Vector* and name the attributes they read; the *Template Attributes* page decides which template attributes (like \`Color\`) land on the copies. The output also carries *Dimensions* — copies × points — which later lessons use to address "point 3 of copy 17".
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Where the cost goes',
      md: `Instancing removes the *memory* cost of copies, not the *drawing* cost: the GPU still shades instances × triangles. A plain six-sided box at 2304 instances is nothing; a subdivided rounded box at 200 000 instances is a lot. Keep instanced shapes as simple as the camera distance allows, and switch off instances you can't see with the *Active* field rather than drawing them invisibly small.`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Swap the box for a [[Sphere POP]] or a [[Torus POP]] — the instancing setup doesn't change.
* Map *Scale X* and *Scale Z* to a second noise for buildings of different footprints.
* Feed the grid through a [[Field POP]] first and use the weight in the height math: a "downtown" that follows a moving point.`,
    },
    {
      kind: 'challenge',
      title: 'A living skyline',
      md: 'Make the city change over time: towers should slowly grow and shrink, as if the city were breathing — without the whole pattern sliding sideways.',
      hints: [
        'Remember the difference between translating a 3D noise and moving through a 4D noise (lesson 1.1).',
        'The Noise POP\'s *Translate 4D* lives on its Transform page.',
      ],
      solution:
        'Set `noise1`\'s *Type* to **Simplex 4D (GPU)** and put *Translate 4D* in expression mode with `absTime.seconds * 0.1`. Heights and colors both update every frame, because the whole chain — `h01`, `Color`, `height` — recomputes from `Noise`. If you\'d rather have the city *scroll* (like flying over it), keep the 3D type and animate *Translate X* instead.',
    },
    {
      kind: 'challenge',
      title: 'Downtown follows the cursor',
      md: 'Combine this lesson with the previous one: a moving spherical field should push nearby towers much taller and tint them hot orange.',
      hints: [
        'A [[Field POP]] after `grid1` adds a `Weight` attribute to every lot. Give it a generous *Transition Range*.',
        'You need two changes: add the weight into the height, and blend the color toward orange by the weight. A [[Math Mix POP]] can do both in two Combine blocks.',
        'Put the new node just before `city`, after `math2` has written `height` and `lookuptex1` has written `Color`.',
      ],
      solution:
        'Insert a Field POP after `grid1` (*Mode* **Sphere**, *Radius* about **1.5**, *Transition Range* **1.5**, *Transition Type* **Smooth Step**, *Translate X/Z* driven by a Noise CHOP as in lesson 2.1). Insert a Math Mix POP between `math2` and `city`. Block 0: **A * B + C** with A `Weight`, B `2.5`, C `height` → `height`. Block 1: **mix(A, B, C)** with A `Color`, B `1 0.45 0.15 1`, C `Weight` → `Color`. The instancing parameters don\'t change at all — they still read `height` and `Color`.',
    },
    {
      kind: 'challenge',
      title: 'Jelly city',
      md: 'Rebuild the city with the [[Copy POP]] instead of instancing, then make all buildings wobble together like jelly with a Noise POP **after** the copy — something instancing cannot do.',
      hints: [
        'The Copy POP takes the shape in its first input and the template points in its second.',
        'Turn on *Template Translate* (reads `P`). For the heights you need a scale per axis: build a 3-component attribute that is `1, height, 1`.',
        'A [[Math Mix POP]] block **A * B + C** with A `0 1 0`, B `height`, C `1 0 1` produces exactly that vector.',
      ],
      solution:
        'Turn off *Instancing* on geo1 and switch `box1`\'s render flag off. Add a Math Mix POP after `math2`: **A * B + C**, A `0 1 0`, B `height`, C `1 0 1`, Result Scope `scl`. Create a Copy POP with `box1` in input 0 and that Math Mix in input 1. On its *Template* page turn on *Template Translate* (attribute `P`) and *Template Scale* (attribute `scl`); on *Template Attributes* turn on *Use Template Point Attribs* and copy `Color`. Append a Noise POP (*Type* **Simplex 4D (GPU)**, small *Amplitude* around 0.08, *Translate 4D* = `absTime.seconds * 0.3`) and a Null with the render flag. The towers now bend and ripple — every corner of every box is a real point the noise can move.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does the Geometry COMP read from the *Default Instance OP* when it is a POP?',
          options: [
            'Its triangles and quads',
            'Its point list and point attributes — one instance per point',
            'Only its bounding box',
            'Its render flag',
          ],
          answer: 1,
          explain: 'Instancing walks the point list. Primitives are ignored, which is why a Grid POP with Connectivity None works as a source.',
        },
        {
          q: 'Which value goes into *Translate Y* to place each instance at its point\'s height?',
          options: ['`ty`', '`P(1)`', '`P`', '`Y`'],
          answer: 1,
          explain: '`P(1)` is the second component (Y) of `P`. Each field takes one component; use the ▸ menu to see the options.',
        },
        {
          q: 'Why is the Box POP translated up by half its height?',
          options: [
            'So the box is lit from above',
            'So scaling in Y grows each tower upward from the ground instead of in both directions',
            'Instancing requires geometry above y = 0',
            'To make the render faster',
          ],
          answer: 1,
          explain: 'Instance scale happens around the shape\'s origin. Put the base at the origin and Y scale becomes "building height".',
        },
        {
          q: 'Towers on a sphere use Rotate to Vector from `N` and *Scale Y* from `height`. With the Default order the equator towers look sheared. What fixes it?',
          options: [
            'Set *Forward Direction* to +Z',
            'Set *Rotate to Vector: Order* to Pre-Rot so the scale happens before the rotation',
            'Normalize `N`',
            'Turn off *Instancing*',
          ],
          answer: 1,
          explain: 'In the Default order the rotate-to-vector is applied first and the scale afterwards along world axes. Pre-Rot scales in the box\'s own frame, then rotates.',
        },
        {
          q: 'When is the Copy POP the better choice than instancing?',
          options: [
            'Whenever there are more than 1000 copies',
            'When you need to modify the copied geometry afterwards, e.g. deform all copies with noise',
            'When the copies need different colors',
            'Never — instancing can do everything the Copy POP does',
          ],
          answer: 1,
          explain: 'Instances are drawn, not stored, so downstream POPs can\'t touch them. Per-instance color and transforms work fine with instancing.',
        },
      ],
    },
  ],
};

export default lesson;
