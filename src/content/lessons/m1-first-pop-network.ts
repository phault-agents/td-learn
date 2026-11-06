import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'first-pop-network',
  title: 'Your First POP Network',
  subtitle: 'Build a living, lit noise sculpture — and learn the full path from points to pixels.',
  minutes: 30,
  summary:
    'The whole POP pipeline in one small project: a geodesic sphere deformed by 4D noise inside a Geometry COMP, lit and rendered through a camera into a TOP.',
  objectives: [
    'Explain what a POP is and how it differs from a SOP',
    'Build a POP chain inside a [[Geometry COMP]] and set render/display flags',
    'Wire up the render stack: camera, light, material and [[Render TOP]]',
    'Animate a POP parameter with `absTime.seconds`',
    "Read a POP's viewer and info popup to see which attributes it touched",
  ],
  tags: ['basics', 'render', 'noise', 'geometry comp'],
  blocks: [
    {
      kind: 'md',
      md: `
Every lesson in this course ends with something you can look at. This one is a slowly morphing, softly lit blob — the "hello world" of 3D in TouchDesigner. It's simple on purpose: the real goal is to get the **whole pipeline** into your hands, because every later lesson reuses it.

## What a POP actually is

A POP (Point Operator) takes geometry in, does one job, and passes geometry out — like any TouchDesigner operator. What's new is *where* and *how* that happens:

* **On the GPU.** Every POP cooks as a compute shader. A chain of POPs can process millions of points without the data ever going back to the CPU.
* **Points with attributes.** A POP's data is a list of points, each carrying named values called *attributes*: position \`P\`, normal \`N\`, \`Color\`, texture coordinates \`Tex\`, and anything else you invent. Primitives (triangles, quads, lines, line strips, points) connect those points into shapes.
* **Lean memory.** A POP only allocates the attributes it changes. Everything else is a reference to the upstream data, so long chains stay cheap.

If you've used SOPs: POPs are their GPU-era replacement. Same idea — procedural geometry — but faster, with far richer attributes, and with math tools that used to need CHOPs or GLSL.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The render path',
      md: `POPs never draw themselves. To see them in a final image they travel this route:

**POPs** (inside a [[Geometry COMP]], render flag on) → shaded by a **MAT** → seen through a [[Camera COMP]] → lit by a [[Light COMP]] → drawn by a [[Render TOP]] → a regular image you can post-process and output.

You'll build exactly this, once, in this lesson. After that it's muscle memory.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'noise-blob',
        title: 'Noise blob',
        root: '/project1',
        height: 500,
        caption:
          'Double-click **geo1** (or select it and press Enter) to see the POPs inside. Dashed lines are references: the Render TOP points at the camera, geometry and light; the Geometry COMP points at its material; the expressions point at nothing external here because they only use `absTime`.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 12' }, 0],
              Material: { ref: '../pbr1' },
            },
            note: 'The container that makes POPs renderable. Its *Xform* page moves the whole object; its *Render* page assigns the material. The slow spin comes from an expression on **Rotate Y** — see step 7.',
            children: [
              {
                id: 'sphere1',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: {
                  Type: 'Geodesic',
                  'Geodesic Connectivity': 'Triangles',
                  Frequency: 40,
                },
                note: 'A geodesic sphere spreads its points evenly, so the noise deforms it without pinching at the poles. Frequency 40 gives roughly 16 000 points — trivial for the GPU.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['sphere1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.4,
                  Harmonics: 2,
                  Amplitude: 0.3,
                  'Translate 4D': { expr: 'absTime.seconds * 0.15' },
                  'Compute Point Normals': true,
                },
                note: 'Adds a smooth noise offset to every point\'s `P`. Using a **4D** noise and sliding *Translate 4D* over time makes the shape *morph* in place rather than drift sideways. *Compute Point Normals* (Output page) rebuilds `N` so the lighting follows the new bumps.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 2,
                y: 0,
                inputs: ['noise1'],
                flags: { display: true, render: true },
                note: 'End every renderable chain in a Null and put the flags here. You can then insert or swap operators upstream without hunting for the flags again.',
              },
            ],
            childComments: [{ x: 0, y: 0.95, w: 3, text: 'Render + display flags live on the **last** POP. Everything upstream just cooks.' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.15,
            params: { 'Xform:Translate': [0, 0, 4.2] },
            note: 'Pulled back a little so the whole blob fits in frame with room for the noise to bulge.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 0,
            y: 2.3,
            params: { 'Xform:Translate': [3, 4, 5] },
            note: 'A single point light up and to the right gives readable shading. Lighting is where most of the "look" comes from — try moving it later.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 2.3,
            params: { 'Base Color': [0.95, 0.55, 0.3], Roughness: 0.35, Metallic: 0.1 },
            note: 'A physically based material. Moderate roughness keeps a soft highlight that shows off the curvature.',
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
              'Background Color': [0.03, 0.035, 0.05, 1],
            },
            note: 'Draws everything. *Camera(s)*, *Geometry* and *Lights* are just names (or patterns like `geo*`). Anti-aliasing smooths the silhouette.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 3,
            y: 1,
            inputs: ['render1'],
            note: 'The "final" image. Later lessons hang post-processing between the Render TOP and here.',
          },
        ],
        comments: [{ x: 1, y: -0.55, w: 2.2, text: 'A minimal but complete render stack.' }],
        steps: [
          {
            title: 'A Geometry COMP and a sphere',
            body: `In an empty network, create a **Geometry COMP** and rename it \`geo1\`. Dive inside (double-click or <kbd>i</kbd>) and delete whatever default operator it contains.

Add a **Sphere POP** named \`sphere1\`. Set *Type* to **Geodesic**, *Geodesic Connectivity* to **Triangles** and *Frequency* to **40**. Middle-click it: you should see around 16 000 points.`,
            nodes: ['geo1', 'sphere1'],
          },
          {
            title: 'Deform it with noise',
            body: `Append a **Noise POP** (\`noise1\`). Set *Type* to **Simplex 4D (GPU)**, *Period* **1.4**, *Harmonics* **2**, *Amplitude* **0.3**.

On the **Output** page turn on *Compute Point Normals* — without it the normals still point straight out of the original sphere and the lighting looks flat.

Look at the bottom-left of the Noise POP's viewer: it lists only \`P\` and \`N\` — the attributes this node created or changed. Everything else is referenced from \`sphere1\`.`,
            nodes: ['noise1'],
          },
          {
            title: 'Cap it with a Null and set the flags',
            body: `Append a **Null POP** (\`null1\`) and turn on its **display** and **render** flags (bottom-right corners of the node). Only flagged POPs get drawn by the Render TOP.`,
            nodes: ['null1'],
          },
          {
            title: 'Camera and light',
            body: `Go back up to \`/project1\` (<kbd>u</kbd>). Create a **Camera COMP** \`cam1\` with *Translate* **0, 0, 4.2**, and a **Light COMP** \`light1\` with *Translate* **3, 4, 5**.`,
            nodes: ['cam1', 'light1'],
          },
          {
            title: 'A material',
            body: `Create a **PBR MAT** \`pbr1\`: *Base Color* **0.95, 0.55, 0.3**, *Roughness* **0.35**, *Metallic* **0.1**.

Then open \`geo1\`'s **Render** page and drag \`pbr1\` onto the *Material* field. TouchDesigner writes \`../pbr1\`: a component's OP fields are looked up from *inside* the component, so a sibling sits one level up (\`..\`). A dashed reference line appears between them.`,
            nodes: ['pbr1'],
            focus: ['geo1'],
          },
          {
            title: 'Render it',
            body: `Create a **Render TOP** \`render1\`. Its *Camera(s)*, *Geometry* and *Lights* fields should read \`cam1\`, \`geo1\` and \`light1\` (adjust them if your names differ). Set *Anti-Alias* to **4x** and a near-black *Background Color*.

Finish with a **Null TOP** \`out1\`. Turn on its viewer — there's your blob.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'Bring it to life',
            body: `Two expressions turn the still image into motion:

1. In \`noise1\` → *Transform* page, put **Translate 4D** in expression mode and type \`absTime.seconds * 0.15\`. The shape now morphs continuously.
2. In \`geo1\` → *Xform* page, set **Rotate Y** to the expression \`absTime.seconds * 12\` for a slow turntable spin (12° per second).

\`absTime.seconds\` keeps counting forever, even when the timeline loops — ideal for continuous motion.`,
            focus: ['noise1', 'geo1'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Why the material is written ../pbr1',
      md: `Operator paths typed into a parameter are looked up relative to the **inside** of the operator that owns the parameter. For a TOP like \`render1\` that is simply the network it sits in, so \`cam1\` finds its sibling. For a **component** like \`geo1\`, "inside" means *inside geo1* — so a sibling MAT is one level up: \`../pbr1\`. The same goes for Python expressions on a component's parameters: \`op('../lfo1')\`, not \`op('lfo1')\`.

Dragging a node onto a parameter always writes the right path, which is why the steps keep telling you to drag.`,
    },
    {
      kind: 'md',
      md: `
## Reading a POP like a pro

Two habits will save you hours:

1. **Middle-click any POP.** The info popup lists point, primitive and vertex counts, every attribute with its type, and marks referenced (not copied) attributes with \`(r)\`. It also tells you whether topology is known on the CPU or only on the GPU — more on that in the performance lesson.
2. **Watch the viewer's attribute list.** Bottom-left of each POP viewer you'll see what *that node* created or modified. On \`noise1\` it's \`P N\`. On \`null1\` it's nothing — a Null references everything.

## Why the Noise POP morphs instead of sliding

Noise is a smooth random field filling space. Each point looks up the field at its own position and gets pushed by the value it finds. If you animate the *3D* translate, you move the whole field through the sphere and the bumps appear to slide across the surface. A **4D** noise adds a fourth axis, and sliding along *that* axis makes the field itself evolve — every bump grows and shrinks in place. Same parameter, very different feel.
`,
    },
    {
      kind: 'compare',
      left: {
        title: '3D noise, animated Translate Z',
        md: 'Bumps glide across the surface like weather on a planet. Good for a "scanning" or flowing look.',
      },
      right: {
        title: '4D noise, animated Translate 4D',
        md: 'The shape breathes and morphs in place. Good for organic, living forms — what we used here.',
      },
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Shortcut: POP → Geo in one click',
      md: 'Right-click any POP and choose **Geometry COMP**. TouchDesigner wraps it in a new Geo with the flags already set. Handy for quickly previewing a branch of your network.',
    },
    {
      kind: 'challenge',
      title: 'Make it breathe',
      md: 'Make the blob pulse: the noise *Amplitude* should swing between about 0.1 and 0.45, once every 4 seconds, while it keeps morphing.',
      hints: [
        'You need a value that oscillates over time. Python\'s `math.sin()` works inside expressions.',
        'A sine goes from -1 to 1. Scale it by half the range and add the midpoint.',
      ],
      solution:
        'Set **Amplitude** to the expression `0.275 + 0.175 * math.sin(absTime.seconds * 2 * math.pi / 4)`. The midpoint is 0.275, half the range is 0.175, and dividing by 4 seconds sets the period. (In the next lesson you\'ll do this with an [[LFO CHOP]] instead — easier to tweak live.)',
    },
    {
      kind: 'challenge',
      title: 'Points instead of skin',
      md: 'Change `sphere1`\'s *Geodesic Connectivity* to **Point Primitives**. What do you see, and why does it look so different from the triangle version?',
      hints: ['Think about what a point primitive is, and how big a point is when rendered without special settings.'],
      solution:
        'The surface disappears and you get a sparse cloud of tiny dots. Point primitives render as single-pixel points by default, and the PBR material has no surface to shade. Making points look good is its own craft — the [[Line MAT]] can draw them as sized circles or spheres, and instancing can put real geometry on every point. Both are coming up.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Where do POPs need to live so the Render TOP can draw them?',
          options: ['Anywhere in /project1', 'Inside a Geometry COMP, with the render flag on', 'Inside a Base COMP', 'They must be converted to SOPs first'],
          answer: 1,
          explain: 'A Geometry COMP is the renderable object; the POP(s) inside it with the render flag on define its shape.',
        },
        {
          q: 'The Noise POP\'s viewer lists `P N` in the bottom-left. What does that mean?',
          options: [
            'Those are the only attributes the geometry has',
            'Those attributes were created or modified by this node; the rest are referenced from upstream',
            'Those attributes failed to cook',
            'Those attributes will be sent to the CPU',
          ],
          answer: 1,
          explain: 'POPs only allocate what they change. Everything else flows through as a reference, marked `(r)` in the info popup.',
        },
        {
          q: 'Why turn on *Compute Point Normals* in the Noise POP?',
          options: ['To make it cook faster', 'So lighting follows the deformed surface', 'To add color', 'To enable 4D noise'],
          answer: 1,
          explain: 'After deformation the old normals still point out of the original sphere; recomputing them makes the shading match the new bumps.',
        },
        {
          q: 'Which expression gives smooth, never-looping motion?',
          options: ['`me.time.frame`', '`absTime.seconds`', '`me.digits`', '`project.cookRate`'],
          answer: 1,
          explain: '`absTime.seconds` counts real time since TouchDesigner started and ignores the timeline loop.',
        },
      ],
    },
  ],
};

export default lesson;
