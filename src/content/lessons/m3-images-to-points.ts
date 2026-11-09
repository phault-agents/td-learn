import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'images-to-points',
  title: 'Images & Video as Point Clouds',
  subtitle: 'Sample pixels into points, extrude them by brightness, cull the darkness and make a portrait glitter in 3D.',
  minutes: 40,
  summary:
    'Two routes from pixels to points — a [[Grid POP]] that samples an image through the [[Lookup Texture POP]], and the one-node [[TOP to POP]] — then luminance-driven extrusion, culling dark points with the [[Delete POP]], resolution and performance trade-offs, and a live camera feed. The build: an extruded, glittering point-cloud portrait.',
  objectives: [
    'Choose between sampling an image onto your own points (Lookup Texture POP) and converting pixels to points (TOP to POP)',
    'Compute luminance per point and use it for depth, size and culling',
    'Remove points by an attribute test with the [[Delete POP]] and know what that costs',
    'Balance point count, image resolution and render cost — and pre-filter images to avoid shimmer',
    'Switch a network between a movie file and a live camera with the [[Video Device In TOP]]',
  ],
  requires: ['attributes', 'render-stack'],
  tags: ['images', 'video', 'point cloud', 'camera', 'lookup'],
  blocks: [
    {
      kind: 'md',
      md: `
Every pixel is a little packet of data: a color, a brightness, a position in a grid. Turn each one into a point and a flat image becomes something you can fly around, displace, scatter and re-light. It's one of the most satisfying transformations in TouchDesigner — a face from a webcam becomes a relief sculpture of light that turns as you watch.

You'll build a point-cloud portrait that pushes bright areas toward the camera, throws away the dark background, and glitters as tiny highlights come and go. The same network works on any movie or live camera, and the techniques — sampling, luminance, culling — come back whenever data arrives as an image: depth cameras, simulations rendered to textures, satellite maps.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Two routes from pixels to points',
      md: `**Points ask the image.** You build the points first — a [[Grid POP]], a sphere, a particle system, anything — and each point reads the image at its own texture coordinate with the [[Lookup Texture POP]]. The point count is yours to choose, independent of the image's resolution, and the "screen" can be any shape.

**The image becomes the points.** The [[TOP to POP]] converts pixels directly: one point per pixel (or per pixel of an overridden resolution), laid out to match the image's aspect ratio, with RGBA arriving as color — or, in other modes, as positions, depth or height.

Both are GPU-to-GPU: no pixel ever visits the CPU. The main build uses the first route because every step is explicit; the second graph shows the one-node version.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'point-portrait',
        title: 'Glittering point portrait',
        root: '/project1',
        height: 580,
        caption:
          'Top: the image path — source, switch, downscale, contrast, then the `img` Null that the POPs sample. Inside **geo1**: grid → sample → luminance & depth → cull → glitter. Bottom: the render.',
        nodes: [
          {
            id: 'moviefilein1',
            type: 'moviefileinTOP',
            x: 0,
            y: 0,
            note: 'Any portrait clip or still image works. A subject against a dark background gives the cleanest cull.',
          },
          {
            id: 'videodevicein1',
            type: 'videodeviceinTOP',
            x: 0,
            y: 1,
            note: 'Your webcam — choose it in *Device*. With no camera attached this node shows an error; that\'s harmless while the switch is set to the movie, or simply delete it.',
          },
          {
            id: 'switch1',
            type: 'switchTOP',
            x: 1,
            y: 0.5,
            inputs: ['moviefilein1', 'videodevicein1'],
            params: { Index: 0 },
            note: '*Index* 0 = movie, 1 = camera. Everything downstream is source-agnostic.',
          },
          {
            id: 'resolution1',
            type: 'resolutionTOP',
            x: 2,
            y: 0.5,
            inputs: ['switch1'],
            params: { 'Output Resolution': 'Custom Resolution', Resolution: [320, 180], 'High Quality Resize': true },
            note: 'Downscales the image to exactly one pixel per grid point. Averaging the pixels here — instead of skipping them during lookup — is what stops the cloud from shimmering. Set it from the *Common* page.',
          },
          {
            id: 'level1',
            type: 'levelTOP',
            x: 3,
            y: 0.5,
            inputs: ['resolution1'],
            params: { Contrast: 1.3 },
            note: 'Brightness becomes depth, so contrast here is relief in 3D. Gamma and black level are just as useful: they shape *where* in the tonal range the face bulges.',
          },
          {
            id: 'img',
            type: 'nullTOP',
            x: 4,
            y: 0.5,
            inputs: ['level1'],
            note: 'The image the POPs read. Reference this Null, so you can change the prep chain freely.',
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 2.4,
            params: {
              'Xform:Rotate': [0, { expr: 'math.sin(absTime.seconds * 0.4) * 25' }, 0],
              Material: { ref: '../linemat1' },
            },
            note: 'A gentle ±25° sway reveals the depth — head-on, an extruded image looks almost flat.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Point Primitives',
                  Size: [1.6, 0.9],
                  Columns: 320,
                  Rows: 180,
                  'Texture Coordinates': 'Point',
                },
                note: '57 600 points in a 16:9 plane, each with a `Tex` coordinate running 0–1 across and up the grid. Match *Size* and *Columns*/*Rows* to your footage\'s aspect ratio.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 1,
                y: 0,
                inputs: ['grid1'],
                params: {
                  TOP: { ref: '../img' },
                  'Lookup Index Attribute U': 'Tex(0)',
                  'Lookup Index Attribute V': 'Tex(1)',
                  Interpolate: true,
                  'Output Attribute Scope': 'Color',
                },
                note: 'Each point reads `img` at its own texture coordinate and stores the RGBA in `Color`. Any POP with sensible `Tex` values could sample the image the same way.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 2,
                y: 0,
                inputs: ['lookuptex1'],
                params: {
                  'Operation[0]': 'dot(A, B)',
                  'Scope A[0]': 'Color.rgb',
                  'Scope B[0]': '0.2126 0.7152 0.0722',
                  'Result Scope[0]': 'lum',
                  'Operation[1]': 'A + B * C',
                  'Scope A[1]': 'P.z',
                  'Scope B[1]': 'lum',
                  'Scope C[1]': '0.4',
                  'Result Scope[1]': 'P.z',
                  'Operation[2]': 'A * B + C',
                  'Scope A[2]': 'lum',
                  'Scope B[2]': '1.5',
                  'Scope C[2]': '0.3',
                  'Result Scope[2]': 'PointScale',
                },
                note: '`lum` is perceived brightness — a weighted sum of R, G and B. It then pushes each point toward the camera (`P.z += lum · 0.4`) and makes bright points bigger.',
              },
              {
                id: 'delete1',
                type: 'deletePOP',
                x: 3,
                y: 0,
                inputs: ['mathmix1'],
                params: { Entity: 'Points', 'Attribute:Attribute[0]': 'lum', 'Function[0]': '<', 'Value[0]': 0.08 },
                note: 'Removes every point darker than 0.08. On the *Attribute* page, block 0 reads: attribute **`lum`**, function **<**, value **0.08**. Background gone, render cost down.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 4,
                y: 0,
                inputs: ['delete1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 0.02,
                  Amplitude: 1,
                  Offset: 1,
                  'Translate 4D': { expr: 'absTime.seconds * 2' },
                  'Output:Combine Operation': 'Multiply',
                  'Combine Attribute Scope': 'PointScale',
                  'Output Attribute Scope': 'PointScale',
                },
                note: 'The glitter. A very fine, fast-changing noise, offset to stay mostly positive, multiplies each point\'s size — so tiny highlights swell and fade all over the face.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['noise1'],
                flags: { display: true, render: true },
                note: 'Render flags here.',
              },
            ],
            childComments: [{ x: 0, y: 0.95, w: 4, text: 'sample → brightness → depth → cull → sparkle' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 3.6,
            params: { 'Xform:Translate': [0, 0, 2.2] },
            note: 'Close enough that the 1.6-wide grid fills most of the frame.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 1,
            y: 3.6,
            params: {
              'Draw Points': true,
              'Point Type': 'Circle (Polygon)',
              'Width Near': 1.5,
              'Point Color Attribute': 'Color',
              'Point Size Attribute': 'PointScale',
              'Blending (Transparency)': true,
              'Destination Color *': 'One',
              'Write Depth Values': false,
            },
            note: 'Additive dots colored by the image and sized by `PointScale`. If dense areas blow out to white, lower *Width Near* or turn blending off for a solid look.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 2.4,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0, 0, 0, 1],
            },
            note: 'Renders the cloud on black.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 2.4,
            inputs: ['render1'],
            note: 'Soft halos on the brightest clusters turn the glints into sparkle.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 2.4,
            inputs: ['bloom1'],
            note: 'Final image.',
          },
        ],
        boxes: [{ title: 'Image prep', nodes: ['switch1', 'resolution1', 'level1', 'img'], tone: 'purple' }],
        steps: [
          {
            title: 'A source you can swap',
            body: `Create a **Movie File In TOP** \`moviefilein1\` and load a portrait clip or photo. Create a **Video Device In TOP** \`videodevicein1\` and pick your webcam in *Device* (skip it if you have none).

Wire both into a **Switch TOP** \`switch1\`, movie first. *Index* **0** shows the movie, **1** the camera.`,
            nodes: ['moviefilein1', 'videodevicein1', 'switch1'],
          },
          {
            title: 'Prepare the image',
            body: `Append a **Resolution TOP** \`resolution1\`: on its *Common* page set *Output Resolution* to **Custom Resolution** and *Resolution* to **320 × 180**; on its first page turn on *High Quality Resize*.

Add a **Level TOP** \`level1\` with *Contrast* **1.3**, then a **Null TOP** named \`img\`.`,
            nodes: ['resolution1', 'level1', 'img'],
          },
          {
            title: 'A grid of points',
            body: `Create a **Geometry COMP** \`geo1\` and clear it. Inside, add a **Grid POP** \`grid1\`: *Connectivity* **Point Primitives**, *Size* **1.6, 0.9**, *Columns* **320**, *Rows* **180**, *Texture Coordinates* **Point**.

Middle-click it: 57 600 points, each with a \`Tex\` attribute.`,
            nodes: ['geo1', 'grid1'],
          },
          {
            title: 'Sample the image',
            body: `Append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`../img\`, *Lookup Index Attribute U* \`Tex(0)\`, *Lookup Index Attribute V* \`Tex(1)\`, *Interpolate* on, *Output Attribute Scope* \`Color\`.

The viewer shows your image made of dots. If it appears upside down or mirrored, flip \`geo1\` with a negative *Scale* on that axis rather than fighting the coordinates.`,
            nodes: ['lookuptex1'],
          },
          {
            title: 'Brightness becomes depth',
            body: `Append a **Math Mix POP** \`mathmix1\` with three blocks:

1. **dot(A, B)** — \`Color.rgb\`, \`0.2126 0.7152 0.0722\` → \`lum\`
2. **A + B * C** — \`P.z\`, \`lum\`, \`0.4\` → \`P.z\`
3. **A * B + C** — \`lum\`, \`1.5\`, \`0.3\` → \`PointScale\`

Tumble the viewer: bright regions now stand forward of the dark ones.`,
            nodes: ['mathmix1'],
          },
          {
            title: 'Cull the dark',
            body: `Append a **Delete POP** \`delete1\`. Set *Entity* to **Points**. On the **Attribute** page, in the first block, set the attribute to \`lum\`, *Function* to **<** and *Value* to **0.08**.

Middle-click before and after: the point count drops by however much of the frame was near-black. Raise the value to carve deeper into the shadows.`,
            nodes: ['delete1'],
          },
          {
            title: 'Make it glitter',
            body: `Append a **Noise POP** \`noise1\`: *Type* **Simplex 4D (GPU)**, *Period* **0.02**, *Amplitude* **1**, *Offset* **1**, *Translate 4D* \`absTime.seconds * 2\`. On the **Output** page: *Combine Operation* **Multiply**, *Combine Attribute Scope* and *Output Attribute Scope* \`PointScale\`.

End with a **Null POP** \`null1\` (display + render).`,
            nodes: ['noise1', 'null1'],
          },
          {
            title: 'Render the dots',
            body: `In \`/project1\` add a **Camera COMP** \`cam1\` at **0, 0, 2.2** and a **Line MAT** \`linemat1\`: *Draw Points* on, *Point Type* **Circle (Polygon)**, *Width Near* **1.5**, *Point Color Attribute* \`Color\`, *Point Size Attribute* \`PointScale\`, and additive blending on the Common page (*Blending (Transparency)* on, *Destination Color* **One**, *Write Depth Values* off).

Assign it to \`geo1\`, give \`geo1\` a *Rotate Y* of \`math.sin(absTime.seconds * 0.4) * 25\`, and render with a **Render TOP** \`render1\`.`,
            nodes: ['cam1', 'linemat1', 'render1'],
            focus: ['geo1'],
          },
          {
            title: 'Glow',
            body: `Finish with a **Bloom TOP** \`bloom1\` and a **Null TOP** \`out1\`. Set \`switch1\` to **1** and step in front of your camera.`,
            nodes: ['bloom1', 'out1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Luminance as depth

Why not just push by the red channel, or by the average of RGB? Because eyes don't weigh colors equally. Green looks far brighter than blue at the same value, and the weights in the dot product (0.2126, 0.7152, 0.0722 — the standard Rec. 709 luma coefficients) turn RGB into the brightness you actually perceive. A blue shirt and a green one of the same "value" then extrude by how bright they *look*, which keeps the relief believable.

Brightness isn't real depth, of course. On a face, the nose and cheekbones catch light and come forward, eye sockets fall back — close enough to read as a sculpture. Two tools let you design the relief rather than accept it:

* **Before the lookup**: the [[Level TOP]] reshapes the tonal curve. *Gamma* moves the mid-tones forward or back without touching the extremes; *Black Level* crushes the shadows flat — and into the cull. A [[Blur TOP]] before the Resolution TOP rounds the relief into soft hills instead of sharp spikes.
* **In the math**: invert with **B - A** (\`lum\`, \`1\`) for dark-subject-on-white footage, or run \`lum\` through **smoothstep(A, B, C)** to push only a band of brightness.

## Culling and its price

Deleting the dark points does two jobs: it removes the background (a portrait floating in space instead of a rectangle) and it cuts render cost, since dots you don't draw are free. The threshold is also a beautiful animation parameter — sweep it and the image dissolves from the shadows up.

The cost is structural. Before the Delete POP, the GPU knows exactly how many points exist and how they're arranged: the grid's dimension (320 × 180) travels with them. After it, the surviving count is only known on the GPU, the points become a flat list, and the dimension is gone. That's fine for rendering. But anything that asks the CPU for the count — Python's \`numPoints()\`, a POP to DAT, a watched info popup — forces a GPU-to-CPU download, and anything that needed rows and columns (\`_DimI\`, grid connectivity) must happen *before* the delete.

## Resolution, performance and shimmer

| Grid | Points | Feels like |
|---|---|---|
| 160 × 90 | 14 400 | chunky, graphic, very cheap |
| 320 × 180 | 57 600 | the sweet spot for a portrait |
| 640 × 360 | 230 400 | fine detail; dots must shrink to avoid mush |
| 1280 × 720 | 921 600 | photographic, heavy to draw additively |

Sampling and math stay relatively cheap even at the bottom of that table; drawing is what gets expensive, because every dot is a little piece of geometry and additive dots overdraw each other. Shrink *Width Near* as the count goes up.

**Match the image to the grid.** A 1920-pixel-wide video sampled by 320 columns reads one pixel in six. As the subject moves, which pixel gets read keeps changing, and the cloud shimmers. Downscaling first with *High Quality Resize* averages each block of pixels into the one value the point will read. That's why the Resolution TOP sits before the Null — it's a quality step as much as a performance one.

**Cameras run on their own clock.** A webcam typically delivers 30 frames per second; if your project runs at 60, the cloud updates every other frame and moves in small stair-steps. Sensor noise also makes \`lum\` flicker frame to frame, which the depth turns into a crawling surface. A [[Time Filter POP]] on \`P\` and \`lum\`, placed before the Delete POP, smooths both — see challenge 1.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'top-to-pop-route',
        title: 'The one-node route: TOP to POP',
        root: '/project1',
        height: 280,
        caption:
          'The same idea with the [[TOP to POP]]. Point its *TOP* field (first block on the Inputs page) at `../img`. It reads pixels directly, so there\'s no grid and no lookup.',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            note: 'Same render setup as `geo1`; give it the same material.',
            children: [
              {
                id: 'toptopop1',
                type: 'toptoPOP',
                x: 0,
                y: 0,
                params: {
                  'First RGBA Contains': 'Color (RGBA)',
                  'TOP[0]': { ref: '../img' },
                  'Filter[0]': 'High Quality Resize',
                  'Override Resolution': true,
                  Resolution: [320, 180],
                  Connectivity: 'Point Primitives',
                },
                note: 'One point per pixel, laid out 1 unit wide with the image\'s aspect ratio, colors from RGBA. *Override Resolution* chooses the point count without a separate Resolution TOP, and the block\'s *Filter* picks how pixels are combined when it resizes.',
              },
              {
                id: 'mathmix3',
                type: 'mathmixPOP',
                x: 1,
                y: 0,
                inputs: ['toptopop1'],
                params: {
                  'Operation[0]': 'dot(A, B)',
                  'Scope A[0]': 'Color.rgb',
                  'Scope B[0]': '0.2126 0.7152 0.0722',
                  'Result Scope[0]': 'lum',
                  'Operation[1]': 'A + B * C',
                  'Scope A[1]': 'P.z',
                  'Scope B[1]': 'lum',
                  'Scope C[1]': '0.3',
                  'Result Scope[1]': 'P.z',
                },
                note: 'Identical luminance and extrusion. Everything after the conversion is the same as in the main build.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 2,
                y: 0,
                inputs: ['mathmix3'],
                flags: { display: true, render: true },
                note: 'Render flags.',
              },
            ],
          },
        ],
        steps: [
          {
            title: 'Convert',
            body: `In a new Geometry COMP \`geo2\`, add a **TOP to POP** \`toptopop1\`. On the *Inputs* page set *First RGBA Contains* to **Color (RGBA)** and, in the first TOP block, point *TOP* at \`../img\` with *Filter* **High Quality Resize**. On the *Detail* page set *Connectivity* to **Point Primitives**, turn on *Override Resolution* and set *Resolution* to **320 × 180**.`,
            nodes: ['geo2', 'toptopop1'],
          },
          {
            title: 'Extrude',
            body: `Append a **Math Mix POP** \`mathmix3\` (the first two blocks from \`mathmix1\`) and a flagged **Null POP** \`null2\`. From here you can copy the delete and glitter nodes across unchanged.`,
            nodes: ['mathmix3', 'null2'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## When to use which

Reach for **TOP to POP** when the image *is* the geometry: a quick pixel cloud, a depth map, or a texture that already stores positions. Its *First RGBA Contains* menu covers those cases — **Position (RGB)** for textures whose RGB holds XYZ (common output from GPU simulations and some point-cloud tools), **Depth** to reconstruct 3D points from a depth camera using a camera's field of view or focal lengths, **Height (R)** to displace by the red channel with a *Displacement Scale*, and **Custom** to route channels to any attributes.

Reach for **Lookup Texture POP** when the geometry comes first: an image projected onto a sphere, colors sampled onto particles at their birth position, video painted onto the flow-field seeds from the previous lesson, or simply when you want the point count and image resolution to be independent choices.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Light the subject, not the scene',
      md: 'Luminance-driven depth and culling both reward a dark background and a single, soft key light from the side. Flat front lighting gives a flat relief; a bright wall behind you extrudes further than your face and survives the cull. For webcam work, fixing the exposure (the Video Device In TOP\'s *Options* page has *Auto Gain/Exposure*, where your camera driver supports it) keeps the depth from pumping as you move.',
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Keep CPU readbacks out of the chain',
      md: 'After the Delete POP the point count lives on the GPU. A POP to DAT for debugging, Python `numPoints()` in an expression, or a permanently open info popup will each pull data back to the CPU every frame and can cost more than the whole network. Debug with them, then remove them.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* **Scan lines**: set the grid's *Connectivity* to **Line Strips** with only the X lines enabled, skip the cull, and draw lines instead of dots — a classic oscilloscope-style face.
* **Dissolve**: drive the Delete POP's *Value* with an LFO or with loudness from the audio lesson.
* **Two sources**: depth from one image, color from another — e.g. depth from your webcam, color from a gradient or a painting.
* **Feed the flow**: use the culled portrait as the seeds of the flow-field drawing and let the face blow away into trails.`,
    },
    {
      kind: 'challenge',
      title: 'Calm the webcam',
      md: 'With a live camera, sensor noise makes the depth crawl even when you sit still. Smooth it without making real movement feel sluggish.',
      hints: [
        'Smooth *before* the Delete POP, while every point still corresponds to the same pixel from frame to frame.',
        'The Time Filter POP\'s One Euro type smooths heavily when values barely change and lightly when they change fast.',
      ],
      solution:
        'Insert a **Time Filter POP** between `mathmix1` and `delete1` with *Input Attributes* `P lum`, *Type* **One Euro**. Start with *Speed Coefficient* 0 and lower *Cutoff Frequency* until the surface is still when you are, then raise *Speed Coefficient* until head turns keep up. It must go before the delete: afterwards the point list changes every frame and index-matching would compare different pixels.',
    },
    {
      kind: 'challenge',
      title: 'Soft relief, sharp color',
      md: 'Make the depth smooth and rounded while the color stays crisp.',
      hints: ['You can sample two different images onto the same points.', 'A blurred copy of the image makes gentler brightness changes.'],
      solution:
        'Branch a **Blur TOP** off `img` into a second Null TOP `img_soft`. Add a second **Lookup Texture POP** after `lookuptex1` that reads `../img_soft` into a new attribute `soft` (*Output Attribute Scope* `soft`), and compute `lum` from `soft.rgb` instead of `Color.rgb`. Color still comes from the sharp `img`; depth now follows the blurred one.',
    },
    {
      kind: 'challenge',
      title: 'Portrait on a sphere',
      md: 'Wrap the image around a sphere so bright areas bulge outward, like a planet made of your face.',
      hints: ['A Sphere POP can output `Tex`, too.', 'Push along `N` instead of along Z.'],
      solution:
        'Replace `grid1` with a **Sphere POP**: *Type* **Grid**, *Grid Connectivity* **Point Primitives**, *Normal* **Point**, *Texture Coordinates* **Point**, and plenty of *Columns* and *Rows*. Keep `lookuptex1` exactly as it is — it only needs `Tex`. In `mathmix1` change block 1 to **A + B * C** — `P`, `N`, `push` with a preceding **A * B** — `lum`, `0.3` → `push`. This is the "points ask the image" route paying off: the lookup never cared what shape the points were.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What is the main advantage of a Grid POP + Lookup Texture POP over the TOP to POP?',
          options: [
            'It\'s the only way to get color',
            'The points can be any shape and any count, independent of the image resolution',
            'It runs on the CPU',
            'It keeps the alpha channel',
          ],
          answer: 1,
          explain: 'Each point samples the image at its own `Tex`, so geometry and image are independent choices.',
        },
        {
          q: 'Why compute luminance with weights 0.2126, 0.7152, 0.0722 instead of averaging R, G and B?',
          options: [
            'It\'s faster',
            'It matches perceived brightness — green looks much brighter than blue',
            'The Lookup Texture POP requires it',
            'Averaging would overflow',
          ],
          answer: 1,
          explain: 'Those are the Rec. 709 luma coefficients, weighting channels by how bright they appear to the eye.',
        },
        {
          q: 'Your 320 × 180 cloud shimmers when sampling a 1080p video. What fixes it best?',
          options: [
            'Turn off Interpolate',
            'Downscale the image to the grid resolution with a high-quality resize before sampling',
            'Increase the Bloom',
            'Use a Delete POP',
          ],
          answer: 1,
          explain: 'Each point reads one location; pre-filtering averages the pixels that point represents, so tiny shifts no longer flip between unrelated pixels.',
        },
        {
          q: 'After the Delete POP, which of these no longer works the same way?',
          options: [
            'Rendering the points',
            'Using the grid\'s rows and columns (`_DimI`, grid connectivity)',
            'Reading `Color`',
            'Applying a Noise POP',
          ],
          answer: 1,
          explain: 'Deleting points flattens the dimension into a single list, and the count is only known on the GPU.',
        },
        {
          q: 'Which *First RGBA Contains* mode would you use for a texture whose RGB stores XYZ coordinates?',
          options: ['Color (RGBA)', 'Height (R)', 'Position (RGB)', 'Depth'],
          answer: 2,
          explain: 'Position modes read the pixel values as point positions — the format many GPU simulations and point-cloud tools use.',
        },
      ],
    },
  ],
};

export default lesson;
