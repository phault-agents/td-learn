import type { Lesson } from '../types';

const RD_SHADER = `// rd_pixel: one Gray-Scott step per pass, for every pixel at once.
// State encoding: r = B (the pattern chemical), g = A (the substrate).
// uRD = (feed, kill, diffusion A, diffusion B), set on rd1's Vectors page.
uniform vec4 uRD;
layout(location = 0) out vec4 fragColor;

vec2 cell(vec2 offset) {                 // (A, B) of a neighbouring pixel
    vec2 uv = vUV.st + offset * uTD2DInfos[0].res.xy;   // res.xy = 1/width, 1/height
    return texture(sTD2DInputs[0], uv).gr;
}

void main() {
    vec2 c = cell(vec2(0.0));

    // 3x3 Laplacian: centre -1, edges 0.2, corners 0.05 (the weights sum to zero).
    vec2 lap = -c
        + 0.2  * (cell(vec2( 1,  0)) + cell(vec2(-1,  0)) + cell(vec2( 0,  1)) + cell(vec2( 0, -1)))
        + 0.05 * (cell(vec2( 1,  1)) + cell(vec2(-1,  1)) + cell(vec2( 1, -1)) + cell(vec2(-1, -1)));

    float a = c.x, b = c.y;
    float react = a * b * b;              // A + 2B -> 3B
    float feed = uRD.x, kill = uRD.y;

    a += uRD.z * lap.x - react + feed * (1.0 - a);   // diffuse, get eaten, get refilled
    b += uRD.w * lap.y + react - (kill + feed) * b;  // diffuse, grow, decay

    fragColor = TDOutputSwizzle(vec4(clamp(b, 0.0, 1.0), clamp(a, 0.0, 1.0), 0.0, 1.0));
}
`;

const lesson: Lesson = {
  slug: 'surface-simulations',
  title: 'TOP Simulations on POP Surfaces',
  subtitle: 'Grow a reaction-diffusion pattern in a GLSL TOP feedback loop, then wrap it around a breathing sphere.',
  minutes: 50,
  summary:
    'A Gray-Scott reaction-diffusion simulation runs in a GLSL TOP inside a Feedback TOP loop, seeded by a wandering brush. The Lookup Texture POP samples it onto a sphere through texture coordinates, Math Mix displaces along normals, a Ramp TOP colors it, and a PBR render shows the result.',
  objectives: [
    'Explain the Gray-Scott model: diffusion, reaction, feed and kill',
    'Run an image-based simulation with a [[GLSL TOP]], a [[Feedback TOP]] and multiple passes',
    'Choose pixel formats and edge modes that keep a simulation stable and seamless',
    'Transfer TOP data onto geometry with the [[Lookup Texture POP]] and texture coordinates',
    'Displace along normals with [[Math Mix POP]], rebuild normals and color through a [[Ramp TOP]]',
  ],
  requires: ['glsl-pop', 'attributes', 'feedback-and-trails'],
  tags: ['glsl', 'simulation', 'reaction-diffusion', 'feedback', 'tops', 'displacement', 'advanced'],
  blocks: [
    {
      kind: 'md',
      md: `
In 1952 Alan Turing proposed that two chemicals reacting and spreading at different speeds could make the spots of a leopard and the stripes of a zebra out of nothing. These **reaction-diffusion** systems produce some of the most organic-looking patterns in generative art: coral, fingerprints, dividing cells, labyrinths. Patterns that grow, meet and settle.

Here you'll grow one in TOPs, where the GPU is happiest with grids of numbers, and then hand it to POPs. A sphere samples the simulation through its texture coordinates, pushes its surface outward where the pattern is strong, and slowly breathes. This lesson connects the two halves of TouchDesigner's GPU world. Images are a fine place to *compute*, and POPs are where that computation becomes *form*.

## The Gray-Scott model in four terms

Imagine every pixel holds two chemicals, **A** (the substrate, food) and **B** (the pattern). Each simulation step:

\`\`\`text
A' = A + Da·∇²A − A·B² + f·(1 − A)
B' = B + Db·∇²B + A·B² − (k + f)·B
\`\`\`

* **Diffusion** \`D·∇²\`: each chemical spreads toward its neighbours. \`∇²\` (the *Laplacian*) is "my neighbours' average minus me". A diffuses twice as fast as B (Da = 1, Db = 0.5).
* **Reaction** \`A·B²\`: where B exists, it converts A into more B. It's autocatalytic, so B makes more of itself.
* **Feed** \`f·(1 − A)\`: fresh A is supplied everywhere, topping it back up toward 1.
* **Kill** \`(k + f)·B\`: B decays steadily.

Only two numbers really steer the result: **feed** *f* and **kill** *k*. Tiny changes (in the third decimal place) switch the pattern between spots, stripes, mazes and chaos.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Why the simulation lives in TOPs',
      md: `* **An image is already a grid of cells.** Each pixel stores the state (A, B) in its color channels, and the Laplacian is just nine texture reads around the pixel. Nothing is easier for a GPU.
* **A pixel shader updates every cell at once.** It reads the *previous* state from its input and writes the next one. Like the GLSL POP, it never reads its own output, so the order of evaluation can't matter.
* **The [[Feedback TOP]] carries the state to the next frame**, the image version of the Feedback POP.
* **Passes are free substeps.** The GLSL TOP's *Passes* parameter (Common page) feeds each pass's output into the next pass's first input. Twelve passes means twelve simulation steps per frame, with no extra operators.`,
    },
    {
      kind: 'md',
      md: `
Two technical choices make or break this simulation:

* **Precision.** Each step changes values by fractions of a percent. An 8-bit texture can only store steps of 1/255, so the small changes round away and the pattern dies or freezes. Use **32-bit float** (16-bit float usually works too) for every TOP that holds state.
* **Edges.** The Laplacian samples one pixel beyond the border. With the GLSL TOP's *Input Extend Mode UV* set to **Repeat**, the left edge sees the right edge and the top sees the bottom. The simulation then lives on a seamless, wrap-around domain. That's exactly what lets the pattern close around the sphere without a visible seam.

We store **B in red and A in green**. Red is the first channel, so anything downstream that reads "the first channel" or the red channel (a palette lookup, a one-component attribute) gets the interesting chemical directly.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'rd-sphere',
        title: 'Reaction-diffusion sphere',
        root: '/project1',
        height: 600,
        caption:
          'Top row: the simulation loop (`feedback1 → brush1 → rd1`, with *Target TOP* pointing back at `rd1`) and the palette. Right: `geo1`, whose POPs sample `state` and `lookup1` through absolute paths.',
        nodes: [
          {
            id: 'start1',
            type: 'constantTOP',
            x: 0,
            y: 0,
            params: {
              Color: [0, 1, 0],
              'Output Resolution': 'Custom Resolution',
              Resolution: [1024, 512],
              'Pixel Format': '32-bit float (RGBA)',
            },
            note: 'The empty world: A = 1 (green), B = 0 (red) everywhere. 2:1 matches the equirectangular mapping of the sphere, so spots come out round at the equator.',
          },
          {
            id: 'feedback1',
            type: 'feedbackTOP',
            x: 1,
            y: 0,
            inputs: ['start1'],
            params: { 'Target TOP': { ref: 'rd1' } },
            note: 'Outputs `rd1`\'s image from the previous frame. While *Reset* is on (or for one frame after *Reset Pulse*) it passes `start1` through instead, which wipes the pattern.',
          },
          {
            id: 'brush1',
            type: 'circleTOP',
            x: 2,
            y: 0,
            inputs: ['feedback1'],
            params: {
              Radius: [0.025, 0.025],
              Center: [
                { expr: '0.35 * math.sin(absTime.seconds * 0.23)' },
                { expr: '0.3 * math.cos(absTime.seconds * 0.31)' },
              ],
              'Fill Color': [1, 0, 0],
              'Combine with Input': 'Composite and Set Resolution',
              Operation: 'Maximum',
              'Pixel Format': '32-bit float (RGBA)',
            },
            note: 'The seed. A small red disc (B = 1) wanders slowly over the state and is combined with **Maximum**, so it only ever adds B and leaves A alone. It must also be 32-bit float, or it would quantise the whole state every frame.',
          },
          {
            id: 'rd_pixel',
            type: 'textDAT',
            x: 3,
            y: 1,
            code: { lang: 'glsl', text: RD_SHADER },
            note: 'One Gray-Scott step. Unlike the GLSL POP, the GLSL TOP expects you to declare your uniform (`uniform vec4 uRD;`) and the output (`fragColor`) yourself.',
          },
          {
            id: 'rd1',
            type: 'glslTOP',
            x: 3,
            y: 0,
            inputs: ['brush1'],
            params: {
              'Pixel Shader': { ref: 'rd_pixel' },
              'Input Extend Mode UV': 'Repeat',
              Passes: 12,
              'Pixel Format': '32-bit float (RGBA)',
              'Vectors:Name[0]': 'uRD',
              'Vectors:Value[0]': [0.0545, 0.062, 1, 0.5],
            },
            note: 'The simulation. 12 passes = 12 steps per frame. **Repeat** wraps the Laplacian around the edges. `uRD` packs feed, kill and the two diffusion rates: 0.0545 / 0.062 is the "coral" regime.',
          },
          {
            id: 'state',
            type: 'nullTOP',
            x: 4,
            y: 0,
            inputs: ['rd1'],
            note: 'The current simulation state, with a stable name for the POPs and the palette to read.',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 4,
            y: 1,
            params: { Type: 'Horizontal' },
            note: 'The palette, left = no pattern, right = strong pattern. Edit the keys in the ramp editor, for example deep navy → teal → pale cream → coral.',
          },
          {
            id: 'lookup1',
            type: 'lookupTOP',
            x: 5,
            y: 0,
            inputs: ['state', 'ramp1'],
            params: { 'Index Channel': 'Red', 'Index Range': [0, 0.35], 'Dark UV': [0, 0.5], 'Light UV': [1, 0.5] },
            note: 'Recolors the state through the ramp, indexing by **red** (B). B rarely climbs much above about 0.35, so *Index Range* stretches that span across the whole palette. *Dark UV* and *Light UV* run along the middle of the ramp from left to right. If the colors look flat, check that their unit menus are on **F** (fraction).',
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 6,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 6' }, 0],
              Material: { ref: '../pbr1' },
            },
            note: 'The surface. A slow spin shows the pattern wrapping all the way around.',
            children: [
              {
                id: 'sphere1',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: {
                  Type: 'Geodesic',
                  'Geodesic Connectivity': 'Triangles',
                  Frequency: 100,
                  Normal: 'Point',
                  'Texture Coordinates': 'Point',
                  'Texture Method': 'Equirectangular Outside (Spherical Polar)',
                },
                note: 'About 100 000 evenly spaced points, with **point** normals and **point** texture coordinates (the Lookup Texture POP below works on points). Middle-click to check that `Tex` runs 0–1 around and from pole to pole.',
              },
              {
                id: 'height1',
                type: 'lookuptexturePOP',
                x: 1,
                y: 0,
                inputs: ['sphere1'],
                params: {
                  TOP: { ref: '/project1/state' },
                  'Lookup Index Attribute U': 'Tex(0)',
                  'Lookup Index Attribute V': 'Tex(1)',
                  Interpolate: true,
                  'Output Attribute Scope': 'rd',
                  'Override Automatic Attribute': true,
                  'Attribute Type': 'float',
                  Components: '1',
                },
                note: 'Samples the state at each point\'s `Tex` and stores the first channel (red = B) in a new float attribute `rd`. If the displacement later looks inverted (bumps where the color says "empty"), check which channel landed in `rd` with the info popup.',
              },
              {
                id: 'color1',
                type: 'lookuptexturePOP',
                x: 2,
                y: 0,
                inputs: ['height1'],
                params: {
                  TOP: { ref: '/project1/lookup1' },
                  'Lookup Index Attribute U': 'Tex(0)',
                  'Lookup Index Attribute V': 'Tex(1)',
                  Interpolate: true,
                  'Output Attribute Scope': 'Color',
                },
                note: 'Same coordinates, different image: the palette-colored version of the state goes straight into `Color`.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 3,
                y: 0,
                inputs: ['color1'],
                params: {
                  vec0name: 'amp',
                  'Type[0]': 'float',
                  'Value[0]': [{ expr: '0.25 + 0.12 * math.sin(absTime.seconds * 0.6)' }],
                  'Operation[0]': 'A * B',
                  'Scope A[0]': 'rd',
                  'Scope B[0]': 'amp',
                  'Result Scope[0]': 'disp',
                  'Operation[1]': 'A + B * C',
                  'Scope A[1]': 'P',
                  'Scope B[1]': 'N',
                  'Scope C[1]': 'disp',
                  'Result Scope[1]': 'P',
                },
                note: 'Two blocks: `disp = rd × amp`, then `P = P + N × disp`. The `amp` uniform swings between 0.13 and 0.37, which is the breathing. Middle-click to read the pseudo-code.',
              },
              {
                id: 'normal1',
                type: 'normalPOP',
                x: 4,
                y: 0,
                inputs: ['mathmix1'],
                params: { 'Normals Action': 'Always Compute' },
                note: 'The sphere\'s normals still point straight out. Rebuilding them lets the light rake across every ridge of the pattern.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['normal1'],
                flags: { display: true, render: true },
                note: 'Render and display flags.',
              },
            ],
            childComments: [{ x: 1, y: 0.9, w: 2.4, text: 'TOP → attribute: two lookups through the same Tex coordinates' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 6,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0.3, 3.6], 'Look At': { ref: '../geo1' } },
            note: 'Close enough that the sphere fills most of the frame.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 6,
            y: 2.3,
            params: { 'Xform:Translate': [-3, 3, 4] },
            note: 'A key light from the upper left. Grazing light is what makes displacement read.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 7,
            y: 2.3,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.45, Metallic: 0.05, 'Apply Point Color': true },
            note: 'White base, colored by the point `Color` from the palette lookup.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 7,
            y: 1.2,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              Lights: { ref: 'light1' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.025, 0.035, 1],
            },
            note: 'Renders the sphere.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 8,
            y: 1.2,
            inputs: ['render1'],
            note: 'The final image.',
          },
        ],
        boxes: [{ title: 'Simulation loop', nodes: ['feedback1', 'brush1', 'rd1', 'rd_pixel'], tone: 'purple' }],
        steps: [
          {
            title: 'An empty world',
            body: `Create a **Constant TOP** \`start1\`: *Color* **0 1 0**, and on the **Common** page *Output Resolution* **Custom Resolution**, *Resolution* **1024 512**, *Pixel Format* **32-bit float (RGBA)**.

Append a **Feedback TOP** \`feedback1\`. Leave its *Target TOP* empty for now.`,
            nodes: ['start1', 'feedback1'],
          },
          {
            title: 'A wandering brush',
            body: `Append a **Circle TOP** \`brush1\` to \`feedback1\`. Set *Radius* **0.025 0.025**, *Fill Color* **1 0 0**, *Center* X = \`0.35 * math.sin(absTime.seconds * 0.23)\` and Y = \`0.3 * math.cos(absTime.seconds * 0.31)\`. On its **Output** page leave *Combine with Input* on **Composite and Set Resolution** (the default) and set *Operation* **Maximum**, and on **Common** set *Pixel Format* **32-bit float (RGBA)**.

You'll see a red dot drifting over green. That's where B will be injected. If the dot is huge, invisible or leaves the image, check that the *Radius Unit* and *Center Unit* menus are on **F** (fractions of the image).`,
            nodes: ['brush1'],
          },
          {
            title: 'The reaction-diffusion shader',
            body: `Create a **Text DAT** \`rd_pixel\` with the shader. Append a **GLSL TOP** \`rd1\` to \`brush1\`: *Pixel Shader* \`rd_pixel\`, *Input Extend Mode UV* **Repeat**, and on **Common** *Passes* **12** and *Pixel Format* **32-bit float (RGBA)**. On **Vectors**, add \`uRD\` with value **0.0545 0.062 1 0.5**.

(A new GLSL TOP comes with its own docked shader DATs. Pointing *Pixel Shader* at \`rd_pixel\` simply uses ours instead.)`,
            nodes: ['rd_pixel', 'rd1'],
          },
          {
            title: 'Close the loop',
            body: `Set \`feedback1\`'s *Target TOP* to \`rd1\`, and append a **Null TOP** named \`state\` to \`rd1\`.

Watch \`state\`: red coral starts growing from the brush's path and branches outward. It wraps off one edge and reappears on the opposite one. Pulse **Reset Pulse** on \`feedback1\` to start over.`,
            nodes: ['state'],
            focus: ['feedback1'],
          },
          {
            title: 'A palette',
            body: `Create a **Ramp TOP** \`ramp1\` with *Type* **Horizontal**, and set its keys in the ramp editor (dark on the left, bright on the right).

Create a **Lookup TOP** \`lookup1\` with \`state\` in input 0 and \`ramp1\` in input 1: *Index Channel* **Red**, *Index Range* **0 0.35**, *Dark UV* **0 0.5**, *Light UV* **1 0.5**. The simulation now shows in your colors.`,
            nodes: ['ramp1', 'lookup1'],
          },
          {
            title: 'A sphere with texture coordinates',
            body: `Create a **Geometry COMP** \`geo1\` and inside it a **Sphere POP** \`sphere1\`: *Type* **Geodesic**, *Geodesic Connectivity* **Triangles**, *Frequency* **100**, *Normal* **Point**, *Texture Coordinates* **Point**, *Texture Method* **Equirectangular Outside (Spherical Polar)**.`,
            nodes: ['geo1', 'sphere1'],
          },
          {
            title: 'Sample the simulation onto the points',
            body: `Append a **Lookup Texture POP** \`height1\`: *TOP* \`/project1/state\`, *Lookup Index Attribute U* \`Tex(0)\`, *V* \`Tex(1)\`, *Interpolate* on, *Output Attribute Scope* \`rd\`, and with *Override Automatic Attribute* on, *Attribute Type* **float**, *Components* **1**.

Append a second one, \`color1\`, reading \`/project1/lookup1\` with the same U/V, writing \`Color\`.`,
            nodes: ['height1', 'color1'],
          },
          {
            title: 'Displace along the normals',
            body: `Append a **Math Mix POP** \`mathmix1\`. On **Uniforms** add a float \`amp\` with the expression \`0.25 + 0.12 * math.sin(absTime.seconds * 0.6)\`. On **Combine** make two blocks:

| Operation | Scope A | Scope B | Scope C | Result Scope |
|---|---|---|---|---|
| A * B | \`rd\` | \`amp\` | | \`disp\` |
| A + B * C | \`P\` | \`N\` | \`disp\` | \`P\` |

Then a **Normal POP** \`normal1\` (*Normals Action* **Always Compute**) and a **Null POP** \`null1\` with display and render flags.`,
            nodes: ['mathmix1', 'normal1', 'null1'],
          },
          {
            title: 'Light and render',
            body: `Add **Camera COMP** \`cam1\` (*Translate* **0 0.3 3.6**, *Look At* \`../geo1\`), **Light COMP** \`light1\` (*Translate* **−3 3 4**), **PBR MAT** \`pbr1\` (white, *Roughness* **0.45**, *Apply Point Color* on) assigned to \`geo1\`, a **Render TOP** \`render1\` and a **Null TOP** \`out1\`. Give \`geo1\` a slow *Rotate Y* of \`absTime.seconds * 6\`.`,
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

\`cell(offset)\` reads a neighbouring pixel. \`uTD2DInfos[0].res.xy\` is (1/width, 1/height) of input 0, so an offset of \`(1, 0)\` is exactly one pixel to the right. The \`.gr\` swizzle turns our (B, A) color into an (A, B) pair, so the equations read naturally.

The **Laplacian** weights (−1 at the centre, 0.2 on the four sides, 0.05 on the corners) sum to zero. A perfectly flat region therefore has no diffusion, and including the diagonals makes the spreading nearly round instead of diamond-shaped. Then come the two update lines, term for term the equations above, with an implicit time step of 1. The output is clamped to 0–1 for safety and written through \`TDOutputSwizzle()\`, which the GLSL TOP docs ask for so channels land correctly on every platform.

Unlike the GLSL POP, the **GLSL TOP doesn't declare uniforms for you**. You write \`uniform vec4 uRD;\` yourself and the *Vectors* page fills it by name. The input samplers \`sTD2DInputs[]\` and the info structs \`uTD2DInfos[]\` *are* built in.

## Choosing feed and kill

The values in this lesson follow a well-known setup (Laplacian as above, Da = 1, Db = 0.5, time step 1). Some famous regions of the *f*/*k* map:

| Look | feed *f* | kill *k* |
|---|---|---|
| Coral: branching growth that fills space | 0.0545 | 0.062 |
| Mitosis: spots that grow and split like cells | 0.0367 | 0.0649 |

Explore around them in small steps (±0.002). The interesting behaviour lies in a narrow diagonal band of the *f*/*k* map, roughly *f* 0.01–0.08 and *k* 0.045–0.07. Away from it, B usually either dies out (the image goes green) or floods everything. Patterns take hundreds to thousands of steps to settle, so judge a setting after it has had time to develop. That's why 12 passes per frame are worth it.

## From image to surface

The [[Lookup Texture POP]] is the bridge. For each point it takes two attributes as U and V, here the components of \`Tex\` from the sphere's equirectangular mapping, and samples the TOP there. With the equirectangular method, *Tex(0)* runs around the equator and *Tex(1)* from pole to pole.

* **The seam disappears** because the simulation wraps. Points on one side of the seam have U near 1 and their neighbours across it have U near 0. With a Repeat-wrapped simulation, those pixels are true neighbours in the pattern too.
* **The poles pinch.** Equirectangular mapping squeezes a whole row of pixels into a single point at each pole, so the pattern converges into a star there. The torus challenge below avoids poles altogether.
* **Density should roughly match.** About 100 000 points sample a half-million-pixel image. Much coarser geometry would alias the pattern, and much finer geometry would only reveal the pixels.

## Displacement, normals and color

\`P + N · value · scale\` is the universal recipe for growing a surface from a scalar field. It works on any POP with sensible normals. The [[Math Mix POP]] does it in two readable blocks, and the \`amp\` uniform animates the scale, so the patterned skin swells and relaxes. After moving points, the normals no longer describe the surface, so the [[Normal POP]] rebuilds them. Skip it and the sphere still *looks* smooth under the light, with the relief visible only at the silhouette.

Color goes through TOP-land on purpose. The [[Lookup TOP]] recolors the whole state through the [[Ramp TOP]] once per pixel, then the second Lookup Texture POP fetches the result per point. Change the ramp keys and the sphere recolors instantly. You could also look up the ramp from POPs (index a horizontal ramp by \`rd\`), but keeping the palette in TOPs lets you composite, blur or grade it with every image tool TouchDesigner has.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Cost and resolution',
      md: 'The simulation costs about pixels × passes × 9 texture reads per frame: here 1024 × 512 × 12, comfortably light for any modern GPU. Halving the resolution makes every feature twice as large relative to the image, cuts the cost per step by four, and lets the pattern fill the image in about half the steps. That is handy while you explore parameters. The two lookups are cheap: one texture read per point each.',
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'If nothing grows',
      md: '* **Everything stays green:** the brush isn\'t reaching the shader (check `brush1` is between `feedback1` and `rd1` and that *Operation* is **Maximum**), or *f*/*k* are in a dead zone.\n* **The pattern freezes in blocky steps:** some TOP in the loop is 8-bit. Check *Pixel Format* on `start1`, `brush1` and `rd1`.\n* **A hard line across the image:** *Input Extend Mode UV* isn\'t on Repeat, so the edges behave like walls.\n* **After changing the resolution**, pulse *Reset Pulse* on `feedback1` so the loop restarts cleanly at the new size.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Replace the wandering brush with something meaningful: a Text TOP with a word, a webcam silhouette through a Threshold TOP, or a brush driven by audio. Feed it in with Maximum and the pattern grows out of it. Map the palette to the *A* channel instead for negative-space looks. Or skip the sphere and displace a Grid POP for a living landscape.',
    },
    {
      kind: 'challenge',
      title: 'A world without poles',
      md: 'Move the simulation onto a **Torus POP**. The pattern should cover it with no seams and no pinching anywhere.',
      hints: [
        'A torus is periodic in *both* directions, exactly like a Repeat-wrapped image, so the topologies match perfectly.',
        'Give the Torus POP point normals and point texture coordinates, then swap it in for `sphere1`.',
        'The texture should have roughly the same aspect as the torus\'s two circumferences, or the spots stretch.',
      ],
      solution: `Create a **Torus POP** with *Radius* **1 0.35**, *Columns* and *Rows* around **400 × 160**, *Connectivity* **Triangles**, *Normal* **Point**, *Texture Coordinates* **Point**, and wire it into \`height1\` instead of \`sphere1\`. Around the ring the torus measures about 2π × 1 (along the tube's centre line), and around the tube 2π × 0.35, a ratio of roughly 3:1. Set \`start1\`'s resolution to about **1024 × 352**. If the spots look stretched the other way, your torus maps U and V the other way round, so swap the width and height. Pulse *Reset Pulse* on \`feedback1\` after changing resolution. No seams and no poles: the simulation's world *is* a torus.`,
    },
    {
      kind: 'challenge',
      title: 'Different rules in different places',
      md: 'Make the feed rate vary across the surface, so one region grows coral while another grows dividing spots, with a living boundary between them.',
      hints: [
        'The GLSL TOP can take a second input. It stays the same for every pass, only input 0 is replaced by the previous pass.',
        'A slow, low-frequency Noise TOP makes a good parameter map. Read it with `texture(sTD2DInputs[1], vUV.st).r`.',
        'Interpolate between the two (f, k) pairs from the table with `mix()`.',
      ],
      solution: `Create a **Noise TOP** (*Period* about **0.5**, *Monochrome* on, a slow *Translate* expression) at the same resolution and wire it into \`rd1\`'s **second** input. In the shader replace the feed/kill line with:

\`\`\`glsl
float m = texture(sTD2DInputs[1], vUV.st).r;          // 0..1 parameter map
float feed = mix(0.0545, 0.0367, m);                  // coral -> mitosis
float kill = mix(0.062, 0.0649, m);
\`\`\`

The regions now compete. Where the map changes, patterns morph from branches into cells, and as the noise drifts the frontier moves across the sphere.`,
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Why must the TOPs in the simulation loop use a 32-bit (or 16-bit) float pixel format?',
          options: [
            'Float textures render faster',
            'Each step changes values by tiny amounts that 8-bit storage would round away',
            'The Lookup Texture POP only reads float textures',
            'Feedback TOPs require it',
          ],
          answer: 1,
          explain: 'With 1/255 steps, small per-step changes disappear and the pattern stalls or dies. Float formats keep them.',
        },
        {
          q: 'What does setting *Passes* to 12 on the GLSL TOP do here?',
          options: [
            'Renders the image 12 times larger',
            'Runs 12 simulation steps per frame, each pass reading the previous pass\'s output',
            'Averages 12 frames together',
            'Uses 12 input images',
          ],
          answer: 1,
          explain: 'For every pass after the first, the TOP\'s first input is replaced by the previous pass\'s result. Other inputs stay as they are.',
        },
        {
          q: 'Why is there no visible seam where the sphere\'s texture coordinates jump from 1 back to 0?',
          options: [
            'The Normal POP hides it',
            'Repeat edge mode makes the simulation wrap around, so the pattern is continuous across the image edges',
            'Geodesic spheres have no seam',
            'The PBR MAT blurs it',
          ],
          answer: 1,
          explain: 'The left and right edges of the image are neighbours in the simulation, so the samples on either side of the seam continue the same pattern.',
        },
        {
          q: 'Which Math Mix operation implements "move each point along its normal by the sampled value"?',
          options: ['`A * B` with P and N', '`A + B * C` with A = P, B = N, C = the displacement', '`cross(A, B)` with P and N', '`mix(A, B, C)` with P, N and the value'],
          answer: 1,
          explain: 'P + N × disp. The normal gives the direction, disp the distance.',
        },
        {
          q: 'In the GLSL TOP shader, how does the `uRD` uniform get its value?',
          options: [
            'It\'s declared automatically from the Vectors page, like in the GLSL POP',
            'You declare `uniform vec4 uRD;` in the shader and the Vectors page entry with the same name fills it',
            'From the Feedback TOP',
            'From a CHOP input',
          ],
          answer: 1,
          explain: 'The GLSL TOP matches parameter names to uniforms you declare. The GLSL POP declares them for you.',
        },
      ],
    },
  ],
};

export default lesson;
