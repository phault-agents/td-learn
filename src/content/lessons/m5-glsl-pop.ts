import type { Lesson } from '../types';

const TWIST_SHADER = `// twist_glsl: runs once per point of the tube.
// These uniforms come from glsl1's Vectors, Colors and Samplers pages.
// TouchDesigner declares them for you, so there are no 'uniform' lines here.
//   uTime  (float)  seconds, from absTime.seconds
//   uTwist (float)  twist in radians per unit of height, from lfo1
//   uWave  (vec3)   x = amplitude, y = frequency along Y, z = speed
//   uColA, uColB    colors for "pulled in" and "pushed out"
//   sNoise          noise1, read through the tube's texture coordinates

void main() {
    const uint id = TDIndex();
    if (id >= TDNumElements())          // the last workgroup overhangs the point list
        return;

    vec3 p = TDIn_P();                  // rest position: input 0, this point

    // 1. Wave: a ripple that travels up the tube, scaled per point by the noise image.
    //    Compute shaders have no screen-space derivatives, so ask for mip level 0.
    float mask = textureLod(sNoise, TDIn_Tex().xy, 0.0).r;
    float wave = sin(p.y * uWave.y - uTime * uWave.z);
    float push = uWave.x * wave * mask;            // signed radial displacement
    vec3 q = vec3(p.x * (1.0 + push), p.y, p.z * (1.0 + push));

    // 2. Twist: rotate around Y by an angle that grows with height.
    float a = uTwist * p.y;
    float c = cos(a), s = sin(a);
    q.xz = vec2(c * q.x - s * q.z, s * q.x + c * q.z);

    P[id] = q;

    // 3. Color by displacement: -amplitude..+amplitude mapped to 0..1.
    float t = clamp(0.5 + 0.5 * push / max(uWave.x, 1e-5), 0.0, 1.0);
    Color[id] = vec4(mix(uColA.rgb, uColB.rgb, t), 1.0);
}
`;

const lesson: Lesson = {
  slug: 'glsl-pop',
  title: 'Compute Shaders with the GLSL POP',
  subtitle: 'Write your own per-point GPU code, and learn when it beats a stack of Math Mix blocks.',
  minutes: 45,
  summary:
    'The anatomy of the GLSL POP, built around a twist-and-ripple deformer: output attributes, uniforms from time and CHOPs, a TOP sampler, color by displacement, and a map of the rest of the GLSL POP family.',
  objectives: [
    'Decide when a [[GLSL POP]] is the right tool and when [[Math Mix POP]] blocks are enough',
    'Set up a GLSL POP: shader DAT, Attribute Class, Output Attributes and Initialize Output Attributes',
    'Feed uniforms from `absTime.seconds`, CHOP channels, color parameters and TOPs',
    'Read other elements, other inputs and other attribute classes safely, with a bounds check',
    'Know what the GLSL Advanced, GLSL Copy and GLSL Select POPs add',
  ],
  requires: ['first-pop-network', 'math-patterns'],
  tags: ['glsl', 'compute shader', 'deformer', 'uniforms', 'advanced'],
  blocks: [
    {
      kind: 'md',
      md: `
So far every point operation in this course has been a node you configure: Noise, Math Mix, Transform, Lookup. That toolkit goes a long way. Sooner or later, though, you'll want something no node offers: a deformer with its own logic, a loop over neighbours, a physics step. For that there's the [[GLSL POP]]. You write the per-point code, and TouchDesigner runs it on the GPU as a compute shader.

In this lesson you'll build a column that twists and ripples, colored by how far each point was pushed. You could *almost* build it with nodes, and that's deliberate. The deformer is simple enough to check by eye, so you can learn the operator's plumbing on it. The next three lessons (attractors, flocks and surface simulations) can then spend their time on ideas instead of setup.

## When GLSL beats nodes

POPs already run as compute shaders, so a GLSL POP isn't automatically faster than a [[Math Mix POP]]. Write code when you need something nodes can't express cleanly:

* **Control flow.** Loops and branches: ten integration substeps, a walk over each point's neighbours, a different rule above some threshold.
* **Random access.** Reading *any* element of *any* input (point 4 711 of input 1, the neighbour whose index is stored in an array) instead of only "the same point upstream".
* **Long math with scratch values.** Twenty intermediate values stay in GPU registers. With nodes, each one would become an attribute in memory.
* **Built-in helpers.** Simplex and Perlin noise, rotation matrices, quaternions and HSV conversion are all available as functions (\`TDSimplexNoise()\`, \`TDRotateOnAxis()\`, \`TDHSVToRGB()\` and more).
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Stay with Math Mix when…',
        md: 'The formula is a handful of operations per point, you want collaborators to tweak it with parameters, you want the pseudo-code in the info popup to document it, or you need it built in two minutes. Most per-point math falls in this group.',
      },
      right: {
        title: 'Reach for the GLSL POP when…',
        md: 'You need loops, branches, reads of *other* points or inputs, more than a few intermediate values, or a simulation step that must update several attributes together. Also when ten Math Mix blocks have become harder to read than twenty lines of code.',
      },
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'How a GLSL POP thinks',
      md: `* Your \`main()\` runs **once per element**: once per point, vertex or primitive, depending on *Attribute Class*. Thousands of copies run at the same time, in no guaranteed order.
* Each copy knows its own index, \`TDIndex()\`. It can **read** anything from the inputs, and it **writes** its own slot in each output array: \`P[id] = …\`.
* Threads are launched in workgroups (32 on NVIDIA, 64 on AMD, according to the docs), so the thread count is rounded up. **Always** return early when \`id >= TDNumElements()\`. Otherwise the overhanging threads write past the end of the buffers, which can produce garbage or a crash.
* Read from inputs and write to outputs. Don't try to read another thread's freshly written output in the same pass, because you can't know whether it has run yet.`,
    },
    {
      kind: 'md',
      md: `
## Anatomy of the GLSL POP

Open a GLSL POP's parameters and you'll find many pages. Here's what each one is for:

| Page | What lives there | Typical use |
|---|---|---|
| **GLSL** | *Compute Shader* (the DAT holding your code), *Attribute Class*, *Number of Threads*, *Output Attributes*, *Output Access*, *Initialize Output Attributes*, *Passes*, extra inputs (*In POPs*) | Wiring the shader and declaring what it may write |
| **Create Attributes** | Brand-new attributes: a name (a predefined one like \`Color\` or a custom one), a type, a component count, an optional array size and a default value | Attributes that don't exist upstream yet |
| **Colors** / **Vectors** | Named uniforms: colors with alpha, and float/vec/double/int/uint values of 1–4 components | Time, knobs, CHOP values |
| **Samplers** | A name, a TOP, extend modes and filtering | Reading images inside the shader |
| **Arrays** / **Matrices** | CHOP channels as a uniform array or texture buffer; matrix uniforms | Spectra, lookup tables, transforms |
| **Constants** | Specialization constants, values fixed when the shader pipeline is built | Rarely-changing switches and sizes |
| **Temp Buffers** | Named scratch buffers with an initial value | Advanced bookkeeping |
| **Collisions** | A POP turned into a ray-tracing acceleration structure | Ray queries against geometry |

Four parameters on the first page decide most of the behaviour:

* **Attribute Class.** Point, Vertex or Primitive: which list \`TDIndex()\` walks over and which class the output arrays belong to.
* **Output Attributes.** The input attributes you intend to overwrite, for example \`P Color\`. Only these get new memory. Everything else flows downstream as a reference, like in any other POP. An attribute you write must either be listed here (so it must already exist upstream) or be created on the *Create Attributes* page. Otherwise the shader won't compile.
* **Initialize Output Attributes.** When on, the POP first copies the input values into the outputs and fills new attributes with their defaults. That's a separate dispatch before your shader runs. It's a safety net for shaders that only write *some* elements. When your code writes every element of every output, turn it off and save the extra pass.
* **Output Access.** *Write Only* is the lean option. *Read-Write* lets the shader read its own outputs, which atomic operations need. Initialize the outputs first if you do this.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'twist-wave',
        title: 'Twist + ripple deformer',
        root: '/project1',
        height: 540,
        caption:
          'Everything the shader needs lives inside **geo1**: the shader DAT, the LFO that drives the twist and the Noise TOP it samples. That keeps every expression short (`op(\'lfo1\')`). The dashed lines show which parameters point at which node.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 8' }, 0],
              Material: { ref: 'pbr1' },
            },
            note: 'The renderable container. A slow turntable spin on *Rotate Y* shows the twist from every side.',
            children: [
              {
                id: 'tube1',
                type: 'tubePOP',
                x: 0,
                y: 0,
                params: {
                  Orientation: 'Y Axis',
                  Radius: [0.35, 0.35],
                  Height: 3,
                  Columns: 96,
                  Rows: 300,
                  Connectivity: 'Quadrilaterals',
                  'Texture Coordinates': 'Point',
                },
                note: 'A tall, finely divided tube: 96 × 300 points, enough rows for a smooth twist. *Texture Coordinates* is set to **Point** so the shader can read `Tex` with `TDIn_Tex()` (a vertex attribute would need `TDInVert_Tex()` instead).',
              },
              {
                id: 'attribute1',
                type: 'attributePOP',
                x: 1,
                y: 0,
                inputs: ['tube1'],
                params: { 'Name[0]': 'Color', 'Value[0]': [1, 1, 1, 1] },
                note: 'Creates `Color` so the GLSL POP can list it in *Output Attributes*. (The GLSL POP\'s own **Create Attributes** page could do the same. A separate node keeps the step visible while you learn.)',
              },
              {
                id: 'twist_glsl',
                type: 'textDAT',
                x: 2,
                y: 1,
                code: { lang: 'glsl', text: TWIST_SHADER },
                note: 'The compute shader, as plain text in a Text DAT. Edit it and the GLSL POP picks up the change and recompiles.',
              },
              {
                id: 'lfo1',
                type: 'lfoCHOP',
                x: 1,
                y: 1,
                params: { Frequency: 0.07, Amplitude: 1.4 },
                note: 'A slow sine between −1.4 and 1.4. It becomes the `uTwist` uniform, in radians per unit of height, so the column winds up one way, unwinds and winds the other way.',
              },
              {
                id: 'noise1',
                type: 'noiseTOP',
                x: 1,
                y: 2,
                params: {
                  Type: 'Simplex 3D (GPU)',
                  Period: 0.6,
                  Harmonics: 1,
                  Translate: [0, 0, { expr: 'absTime.seconds * 0.1' }],
                  Monochrome: true,
                },
                note: 'A soft, slowly evolving grey image. The shader samples it through each point\'s `Tex`, so some patches of the tube ripple strongly and others hardly move.',
              },
              {
                id: 'glsl1',
                type: 'glslPOP',
                x: 2,
                y: 0,
                inputs: ['attribute1'],
                params: {
                  'Compute Shader': { ref: 'twist_glsl' },
                  'Output Attributes': 'P Color',
                  'Initialize Output Attributes': false,
                  'Vectors:Name[0]': 'uTime',
                  'Vectors:Type[0]': 'float',
                  'Vectors:Value[0]': [{ expr: 'absTime.seconds' }],
                  'Vectors:Name[1]': 'uTwist',
                  'Vectors:Type[1]': 'float',
                  'Vectors:Value[1]': [{ expr: "op('lfo1')['chan1']" }],
                  'Vectors:Name[2]': 'uWave',
                  'Vectors:Type[2]': 'vec3',
                  'Vectors:Value[2]': [0.35, 5, 3],
                  'Colors:Name[0]': 'uColA',
                  'RGB[0]': [0.08, 0.16, 0.45],
                  'Colors:Name[1]': 'uColB',
                  'RGB[1]': [1, 0.62, 0.25],
                  'Samplers:Name[0]': 'sNoise',
                  'TOP[0]': { ref: 'noise1' },
                  'Extend U[0]': 'Repeat',
                  'Extend V[0]': 'Repeat',
                },
                note: 'The star. It runs `twist_glsl` once per point and writes `P` and `Color`. Uniforms: three on **Vectors**, two on **Colors**, one sampler on **Samplers**. *Initialize Output Attributes* is off because the shader writes every point of both outputs.',
              },
              {
                id: 'normal1',
                type: 'normalPOP',
                x: 3,
                y: 0,
                inputs: ['glsl1'],
                params: { 'Normals Action': 'Always Compute' },
                note: 'The shader moved the points but didn\'t touch `N`. Rebuilding the normals here makes the lighting follow the twisted, rippled surface. Let the GLSL POP do the custom work and let a standard POP do the cleanup.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['normal1'],
                flags: { display: true, render: true },
                note: 'The render/display flags sit on the end of the chain, as always.',
              },
            ],
            childComments: [
              { x: 0, y: 1.1, w: 1.6, text: 'Shader inputs: CHOP → uniform, TOP → sampler, DAT → code.' },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0, 6] },
            note: 'Far enough back to frame the 3-unit-tall column with room for the ripples.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 0,
            y: 2.4,
            params: { 'Xform:Translate': [4, 3, 5] },
            note: 'One point light up and to the side, so the grazing light picks out the twist.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 2.4,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.4, 'Apply Point Color': true },
            note: '*Apply Point Color* makes the material use the `Color` attribute the shader wrote. Without it, the displacement colors never reach the screen.',
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
        steps: [
          {
            title: 'A tall tube to deform',
            body: `Create a **Geometry COMP** \`geo1\`, dive in and replace its default contents with a **Tube POP** \`tube1\`: *Orientation* **Y Axis**, *Radius* **0.35 0.35**, *Height* **3**, *Columns* **96**, *Rows* **300**, *Connectivity* **Quadrilaterals**, *Texture Coordinates* **Point**.

Middle-click it and confirm \`Tex\` appears as a **point** attribute.`,
            nodes: ['geo1', 'tube1'],
          },
          {
            title: 'Give it a Color to write into',
            body: `Append an **Attribute POP** \`attribute1\`. In its first block set *Name* to **Color** and *Value* to **1 1 1 1**.

A GLSL POP can only write attributes that exist upstream (listed in *Output Attributes*) or that it creates itself (*Create Attributes* page). We'll go with the first route.`,
            nodes: ['attribute1'],
          },
          {
            title: 'A pass-through shader first',
            body: `Create a **Text DAT** \`twist_glsl\` and type this minimal shader into it:

\`\`\`glsl
void main() {
    const uint id = TDIndex();
    if (id >= TDNumElements())
        return;
    P[id] = TDIn_P();
    Color[id] = vec4(1.0, 0.5, 0.2, 1.0);
}
\`\`\`

Append a **GLSL POP** \`glsl1\` to \`attribute1\`. Set *Compute Shader* to \`twist_glsl\` and *Output Attributes* to \`P Color\`. Check that *Attribute Class* reads **Point** and *Number of Threads* reads **Auto**: one thread per point.

The node should show no error flag, and the attribute list at the bottom-left of its viewer should read \`P Color\`: this node wrote both. You've just checked the whole pipeline: the DAT compiles, both outputs are writable, and the bounds check is in place. Always start a new shader like this.`,
            nodes: ['twist_glsl', 'glsl1'],
          },
          {
            title: 'Uniforms: time, wave settings and two colors',
            body: `On \`glsl1\` → **Vectors**, use the **+** button to make three blocks:

| Name | Type | Value |
|---|---|---|
| \`uTime\` | float | expression \`absTime.seconds\` |
| \`uTwist\` | float | 0 for now |
| \`uWave\` | vec3 | 0.35, 5, 3 |

On **Colors** add \`uColA\` (**0.08 0.16 0.45**) and \`uColB\` (**1 0.62 0.25**).

Then replace the text in \`twist_glsl\` with the full shader shown in the inspector for that node, except for one line: the sampler doesn't exist yet, so write \`float mask = 1.0;\` instead of the \`float mask = textureLod(…)\` line for now. The column ripples in \`glsl1\`'s viewer. Once it's rendered, it will be blue where it's pulled in and orange where it's pushed out.`,
            focus: ['glsl1', 'twist_glsl'],
          },
          {
            title: 'Drive the twist from a CHOP',
            body: `Inside \`geo1\`, create an **LFO CHOP** \`lfo1\` with *Frequency* **0.07** and *Amplitude* **1.4**.

On \`glsl1\` set the \`uTwist\` value to the expression \`op('lfo1')['chan1']\`. A dashed reference line appears. The column now winds and unwinds every 14 seconds or so.

Any parameter expression works here: a [[Noise CHOP]], an audio analysis channel, a slider. The shader just sees a number that changes every frame.`,
            nodes: ['lfo1'],
            focus: ['glsl1'],
          },
          {
            title: 'Sample a TOP',
            body: `Create a **Noise TOP** \`noise1\`: *Type* **Simplex 3D (GPU)**, *Period* **0.6**, *Harmonics* **1**, *Monochrome* on, and *Translate* Z set to the expression \`absTime.seconds * 0.1\`.

On \`glsl1\` → **Samplers**, add a block: *Name* \`sNoise\`, *TOP* \`noise1\`, *Extend U* and *Extend V* **Repeat**. Now restore the \`float mask = textureLod(sNoise, …)\` line in the shader. The ripple breaks into drifting patches, because each point reads the noise image at its own \`Tex\` coordinate.`,
            nodes: ['noise1'],
            focus: ['glsl1'],
          },
          {
            title: 'Fix the normals, cap the chain',
            body: `Append a **Normal POP** \`normal1\` (*Normals Action* **Always Compute**) and a **Null POP** \`null1\` with display and render flags on.

Back on \`glsl1\`, turn **Initialize Output Attributes** off. The shader writes every point's \`P\` and \`Color\`, so the extra copy pass was wasted work.`,
            nodes: ['normal1', 'null1'],
            focus: ['glsl1'],
          },
          {
            title: 'Render it',
            body: `At \`/project1\` add **Camera COMP** \`cam1\` (*Translate* **0 0 6**), **Light COMP** \`light1\` (*Translate* **4 3 5**), **PBR MAT** \`pbr1\` with *Apply Point Color* on, a **Render TOP** \`render1\` and a **Null TOP** \`out1\`.

Assign \`pbr1\` on \`geo1\`'s **Render** page and give \`geo1\` a *Rotate Y* expression of \`absTime.seconds * 8\`.`,
            nodes: ['cam1', 'light1', 'pbr1', 'render1', 'out1'],
            focus: ['geo1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Reading the shader

Open \`twist_glsl\` in the inspector and follow along.

**The guard.** \`TDIndex()\` is this thread's point number. \`TDNumElements()\` is how many threads were *requested*, one per point with *Number of Threads* on **Auto** and *Attribute Class* on **Point**. More threads were actually launched (a whole number of workgroups), so the extras must leave immediately.

**Reading.** \`TDIn_P()\` is shorthand for \`TDIn_P(0, TDIndex())\`: attribute \`P\` from input 0 at this point's index. Every attribute of every input gets a reader named \`TDIn_\` + its name, so \`TDIn_Tex()\` exists because the tube has \`Tex\`. If you create an attribute called \`heat\` upstream, \`TDIn_heat()\` appears.

**Sampling.** \`textureLod(sNoise, uv, 0.0)\` reads the Noise TOP. In a pixel shader you'd use \`texture()\` and let the GPU choose a mip level from screen-space derivatives. A compute shader has no screen, so asking for level 0 explicitly is the safe habit.

**Deforming.** The ripple scales each point's distance from the Y axis by \`1 + push\`. The twist rotates X and Z by an angle proportional to the *rest* height \`p.y\`. Rest positions matter: every frame starts again from the input, so nothing accumulates or drifts. (In the next lesson we'll do the opposite on purpose, with a feedback loop.)

**Writing.** Outputs are plain arrays named after the attribute: \`P[id]\`, \`Color[id]\`. They're arrays rather than functions so that atomic operations can target them.

**Coloring by displacement.** \`push\` runs from about −amplitude to +amplitude. Remapping it to 0–1 and mixing two color uniforms makes the color a direct readout of the deformation. This is also a debugging trick: when a shader misbehaves, write the suspicious value into \`Color\` and look at it.

## Uniforms in practice

The GLSL POP declares uniforms **for you** from its pages. The *Name* you type becomes the variable name and the *Type* menu sets the GLSL type, so the shader has no \`uniform\` lines at all. That's different from the [[GLSL TOP]], where you declare uniforms yourself and the parameters fill them. If a name in your code doesn't match the parameter exactly, the compiler complains about an undeclared identifier. Read the error on the node.

Where values come from:

* **Time:** \`absTime.seconds\` for continuous motion, \`absTime.stepSeconds\` for "how long since last frame" when you integrate.
* **Single CHOP values:** any expression, like \`op('lfo1')['chan1']\`.
* **Whole CHOPs:** the **Arrays** page sends every sample of a CHOP channel as a uniform array or a texture buffer. Use it for a spectrum, a lookup curve or a list of attractor positions.
* **Colors:** the **Colors** page gives RGB + alpha. Use \`.rgb\` when you only need the color.
* **Images:** the **Samplers** page binds a TOP to a sampler name, with extend modes and filtering.

## Reading more than "this point"

The real power is random access:

* **Other inputs.** Wire more POPs into the GLSL POP, or list them under *In POPs* without wiring. \`TDIn_P(1, j)\` reads point *j* of input 1, and \`TDInputNumPoints(1)\` tells you how many there are.
* **Other classes.** While running on points you can still read vertex and primitive attributes with \`TDInVert_…()\` and \`TDInPrim_…()\`. \`TDInputPointIndex(i, vertIndex)\` tells you which point a vertex uses.
* **Array attributes.** \`TDIn_Nebr(0, id, k)\` reads element *k* of an array attribute, and the constant \`cTDArraySize_Nebr\` holds the array's size. The flocking lesson depends on this.
* **Grid structure.** \`TDDimCoords(id)\` turns a point index into grid coordinates (column, row…) and \`TDDimPointIndex()\` goes back. That gives you neighbours on a grid for free.

Input reads are bounds-checked: an index past the end returns the *last* element instead of crashing. That's safe, but it can hide bugs. If something looks stuck to one spot, suspect an out-of-range index.

## Several passes in one cook

*Passes* runs your shader several times per cook. With **Copy Previous Pass Output to Input** on, each pass reads what the previous one wrote. That's how you run iterative algorithms (relaxation, constraint solving, repeated smoothing) without building a loop network. Compare that with a [[Feedback POP]]: passes iterate *within* a frame, feedback carries state *across* frames. Simulations often use both.

## The rest of the family

* **[[GLSL Advanced POP]]** reads and writes point, vertex and primitive attributes in one shader (\`TDInPoint_P()\`, \`oTDPoint_P[id]\`), can **change the number of points and primitives**, can write the index buffer, and can fill *Extra Outputs*. A [[GLSL Select POP]] picks one of those extra outputs. It has no *Passes* parameter.
* **[[GLSL Copy POP]]** copies its input many times (or once per template point) and runs your code per copy, with \`TDCopyIndex()\` and \`TDTemplate_P()\` to tell copies apart. Use it to bend each instance differently, like flapping wings or growing leaves.
* **[[GLSL TOP]]** can read any POP's attributes through its **Buffers** page (\`TDBuffer_P(i)\`). Use that to draw POP data into an image. A **[[GLSL MAT]]** reads the attributes of the POP it renders once you list them on its **Attributes** page (\`TDAttrib_…()\`).
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Keeping shaders cheap',
      md: `* List only the attributes you actually change in *Output Attributes*. Everything else stays a free reference.
* Turn **Initialize Output Attributes** off when every element of every output is written.
* Branches are fine, but when neighbouring threads take very different paths, the GPU runs both paths. Prefer \`mix()\`/\`step()\` math for simple either/or choices.
* A [[POP to DAT]] is handy for checking numbers, but it downloads the data to the CPU. Delete it when you're done.`,
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'When it won\'t compile',
      md: 'A compile error puts an error flag on the GLSL POP. Hover it or middle-click the node to read the message, which names the line and the problem. The usual causes: an attribute missing from *Output Attributes*, a uniform name that doesn\'t match its parameter, a type mismatch (writing a `vec3` into the `vec4` `Color`), or a misspelled reader. Names are case-sensitive, so `TDIn_tex()` will not find `Tex`. If the message is cut off, try an [[Info DAT]] pointed at the GLSL POP for the full log.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Swap the tube for any POP that has `Tex`: a text outline extruded into a ribbon, a grid, a scanned point cloud. Replace the sine with `TDSimplexNoise(vec4(p * 2.0, uTime * 0.2))` for an organic wobble, or feed `uWave.x` from an audio envelope. The shader doesn\'t care where its numbers come from.',
    },
    {
      kind: 'challenge',
      title: 'Hue by height',
      md: 'Instead of the two-color mix, give every point a hue that cycles along the height of the tube and slowly scrolls over time, while the displacement still controls brightness.',
      hints: [
        'The GLSL helpers include `TDHSVToRGB(vec3 hsv)`, with hue, saturation and value all in the 0–1 range.',
        '`fract()` wraps any number into 0–1, which is perfect for a hue that cycles.',
      ],
      solution: `Replace the color line with:

\`\`\`glsl
float hue = fract(p.y * 0.25 + uTime * 0.05);
float val = mix(0.35, 1.0, t);           // t is the 0..1 displacement from before
Color[id] = vec4(TDHSVToRGB(vec3(hue, 0.7, val)), 1.0);
\`\`\`

\`uColA\` and \`uColB\` are no longer used. Delete their blocks or leave them, since unused uniforms are harmless.`,
    },
    {
      kind: 'challenge',
      title: 'Morph into a second shape',
      md: 'Wire a **Sphere POP** (Geodesic, radius 1.2) into `glsl1`\'s second input. Add a float uniform `uBlend` driven by an LFO, and make every tube point travel toward a point of the sphere as `uBlend` goes from 0 to 1.',
      hints: [
        'Point *j* of the second input is `TDIn_P(1, j)`, and `TDInputNumPoints(1)` gives the sphere\'s point count.',
        'The two shapes have different point counts. A modulo keeps the index in range and assigns sphere points to tube points round-robin.',
        'Blend the *final* twisted position `q` toward the target with `mix()`.',
      ],
      solution: `Just before \`P[id] = q;\` add:

\`\`\`glsl
uint j = id % max(TDInputNumPoints(1), 1u);   // guard against an empty input
vec3 target = TDIn_P(1, j);
q = mix(q, target, uBlend);
\`\`\`

Because the pairing is by index, the tube scatters into a cloud on its way to the sphere. That's part of the charm. For an orderly morph, make both shapes with the same point count and structure, e.g. two Grid POPs with equal rows and columns.`,
    },
    {
      kind: 'challenge',
      title: 'A magnetic finger',
      md: 'Add a `vec3` uniform `uMagnet` animated with expressions (or a Noise CHOP). Points closer than 0.8 units to it should be pulled toward it, strongest at the center and fading smoothly to nothing at 0.8.',
      hints: [
        '`smoothstep(0.8, 0.0, d)` gives 1 at distance 0 and 0 at distance 0.8 (edges in reverse order are allowed and flip the curve).',
        'Apply the pull after the twist, so the magnet works in the object\'s own space.',
      ],
      solution: `After the twist:

\`\`\`glsl
vec3 toM = uMagnet - q;
float k = smoothstep(0.8, 0.0, length(toM));
q += toM * k * 0.6;                       // 0.6 = how far toward the magnet
\`\`\`

Drive *uMagnet* with, for example, \`math.sin(absTime.seconds) * 0.6\` for X and \`math.cos(absTime.seconds * 0.7) * 1.2\` for Y. The magnet is in geo1's space, which includes the turntable rotation, so it stays in place relative to the column while the column spins.`,
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Why does almost every GLSL POP shader start with `if (id >= TDNumElements()) return;`?',
          options: [
            'To skip points that belong to a group',
            'Because threads are launched in whole workgroups, so some threads have no element to process',
            'To avoid reading uninitialized uniforms',
            'It is required for the shader to compile',
          ],
          answer: 1,
          explain: 'The requested thread count is rounded up to a multiple of the workgroup size. The extra threads must not write past the end of the attribute buffers.',
        },
        {
          q: 'Your shader writes `Color[id] = …` but fails to compile, complaining that `Color` is undeclared. The input has no `Color`. What fixes it?',
          options: [
            'Declare `uniform vec4 Color;` at the top of the shader',
            'Create `Color` upstream (e.g. Attribute POP) and list it in *Output Attributes*, or create it on the *Create Attributes* page',
            'Turn on *Initialize Output Attributes*',
            'Set *Output Access* to Read-Write',
          ],
          answer: 1,
          explain: 'Output arrays only exist for attributes listed in *Output Attributes* (which must exist in the input) or created by the POP itself.',
        },
        {
          q: 'When is it safe to turn **Initialize Output Attributes** off?',
          options: [
            'Never, the POP would crash',
            'When the shader writes every element of every output attribute',
            'Only when *Attribute Class* is Primitive',
            'When the shader has no uniforms',
          ],
          answer: 1,
          explain: 'Initialization is an extra dispatch that copies input values (or defaults). If your code overwrites everything anyway, it\'s wasted work. If it skips some elements, those would be left uninitialized.',
        },
        {
          q: 'How does a value from an LFO CHOP get into a GLSL POP shader?',
          options: [
            'Wire the CHOP into the GLSL POP\'s second input',
            'Add a uniform on the *Vectors* page and set its value to an expression like `op(\'lfo1\')[\'chan1\']`. The POP declares the uniform for you',
            'Write `op(\'lfo1\')` inside the GLSL code',
            'Only through a CHOP to POP first',
          ],
          answer: 1,
          explain: 'Uniform parameters accept any expression. Whole channels can also go in through the *Arrays* page.',
        },
        {
          q: 'You need a shader that deletes half the points and adds new primitives. Which operator?',
          options: ['GLSL POP with more Passes', 'GLSL Advanced POP', 'GLSL Copy POP', 'GLSL Select POP'],
          answer: 1,
          explain: 'The GLSL POP never changes element counts. The GLSL Advanced POP can set point and primitive counts, write the index buffer and touch all attribute classes in one shader.',
        },
      ],
    },
  ],
};

export default lesson;
