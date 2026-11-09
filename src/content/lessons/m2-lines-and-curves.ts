import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'lines-and-curves',
  title: 'Lines, Curves & Strokes',
  subtitle: 'Draw with math: a harmonograph as one tapered, gradient-colored stroke — plus splines and ridgelines.',
  minutes: 45,
  summary:
    'Line strips are the POP way to draw. Generate a harmonograph from a sum of damped sines, resample it by curvature, measure it with Line Metrics, and use the normalized distance along the curve to taper `LineWidth` and color the stroke through a Line MAT. Then shape splines with Line Divide and Line Smooth, and build ridgelines with Line Break.',
  objectives: [
    'Generate a single line strip and drive its shape from `_PointU`',
    'Resample a polyline by curvature with the Line Resample POP',
    'Measure distance along a curve with the Line Metrics POP and use it as a 0–1 parameter',
    'Taper and color a stroke with `LineWidth` and `Color`, styled by the Line MAT (caps, joints, widths)',
    'Compare spline types in the Line Divide POP and calm a jittery line with the Line Smooth POP',
    'Split points into many strips with the Line Break POP',
  ],
  requires: ['math-patterns'],
  tags: ['lines', 'line strip', 'line mat', 'harmonograph', 'splines', 'line metrics'],
  blocks: [
    {
      kind: 'md',
      md: `
A **harmonograph** is a Victorian drawing machine: two or three pendulums swing a pen and a table against each other, and as friction slowly drains their energy the pen spirals inward, laying down a looping figure of extraordinary delicacy. Mathematically it's tiny — the sum of a few sine waves, each fading with time — which makes it the perfect subject for learning how POPs draw lines.

You'll build the whole machine as a single **line strip** of tens of thousands of points: a stroke that starts as a hairline, swells in the middle and tapers away again, shifting color from end to end and slowly morphing as one pendulum's phase drifts.

## How POPs draw lines

A **line strip** is one primitive that connects a list of points in order. It can be open or closed, and a single POP can hold any number of them. Line strips are what the [[Line MAT]] was made for: it draws each one as a camera-facing ribbon with proper joints between segments and caps at the ends, and it reads per-point attributes to vary the stroke:

* \`LineWidth\` — multiplies the material's width at each point. A value of 2 is twice as thick there, 0.1 nearly vanishes.
* \`Color\` — the stroke color at each point, interpolated along the segments.

The material's *Width Near* / *Width Far* set the base thickness in a resolution-independent unit: a width of 1 is about a thousandth of the image width. So the stroke looks the same at 720p and 4K.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The line-strip toolkit',
      md: `| POP | What it does to a line strip |
|---|---|
| [[Line POP]] | Makes strips from points you place, optionally subdivided as splines |
| [[Line Divide POP]] | Adds points between existing ones, following a spline type |
| [[Line Resample POP]] | Redistributes points along the existing shape — by count, spacing or curvature — *without* changing the shape |
| [[Line Smooth POP]] | Blurs positions along the strip — *does* change the shape |
| [[Line Metrics POP]] | Measures: distance along, normalized distance, tangent, curvature, strip index… |
| [[Line Break POP]] | Builds or splits strips from point order, a break attribute, every N points or by distance |

Keep the difference between *resample* (same shape, new points) and *smooth* (new shape) clear — they look similar in the network but do opposite things.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'harmonograph',
        title: 'Harmonograph stroke',
        root: '/project1',
        height: 560,
        caption:
          'Inside **geo1**: generate → shape (pendulums) → resample → measure → width and color. The Line MAT turns `LineWidth` and `Color` into a styled stroke; Bloom adds a soft glow.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../linemat1' } },
            note: 'One line strip, drawn by the Line MAT.',
            children: [
              {
                id: 'line1',
                type: 'linePOP',
                x: 0,
                y: 0,
                params: { 'Divisions Method': 'Divisions per Line Strip', divs: 20000 },
                note: 'A straight line split into 20 000 segments. Only its *connectivity* survives — one long strip with points in order. The pendulums overwrite every position.',
              },
              {
                id: 'env1',
                type: 'mathPOP',
                x: 1,
                y: 0,
                inputs: ['line1'],
                params: {
                  'Input Attribute Scope': '_PointU',
                  Multiply: -1.5,
                  'Post Operation': 'exp(A)',
                  'Output Attribute Scope': 'env',
                },
                note: 'The friction: `env = exp(-1.5 × u)` falls smoothly from 1 at the start of the strip to about 0.22 at the end. Bigger multipliers make the pendulums die faster.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 2,
                y: 0,
                inputs: ['env1'],
                params: {
                  'Angle Units': 'Cycles',
                  vec0name: 'T',
                  'Type[0]': 'float',
                  'Value[0]': [60],
                  'vec0name[1]': 'fa',
                  'Type[1]': 'float2',
                  'Value[1]': [2, 3],
                  'vec0name[2]': 'fb',
                  'Type[2]': 'float2',
                  'Value[2]': [3.003, 2],
                  'vec0name[3]': 'pa',
                  'Type[3]': 'float2',
                  'Value[3]': [{ expr: 'absTime.seconds * 0.01' }, 0.25],
                  'vec0name[4]': 'pb',
                  'Type[4]': 'float2',
                  'Value[4]': [0.1, 0.5],
                  'Operation[0]': 'A * B',
                  'Scope A[0]': '_PointU',
                  'Scope B[0]': 'T',
                  'Result Scope[0]': 't',
                  'Operation[1]': 'A * B + C',
                  'Scope A[1]': 't',
                  'Scope B[1]': 'fa',
                  'Scope C[1]': 'pa',
                  'Result Scope[1]': 'ga',
                  'Operation[2]': 'A * B + C',
                  'Scope A[2]': 't',
                  'Scope B[2]': 'fb',
                  'Scope C[2]': 'pb',
                  'Result Scope[2]': 'gb',
                  'Operation[3]': 'sin(A)',
                  'Scope A[3]': 'ga',
                  'Result Scope[3]': 'ga',
                  'Operation[4]': 'sin(A)',
                  'Scope A[4]': 'gb',
                  'Result Scope[4]': 'gb',
                  'Operation[5]': 'A + B',
                  'Scope A[5]': 'ga',
                  'Scope B[5]': 'gb',
                  'Result Scope[5]': 'P.xy',
                  'Operation[6]': 'A * B',
                  'Scope A[6]': 'P.xy',
                  'Scope B[6]': 'env',
                  'Result Scope[6]': 'P.xy',
                  'Operation[7]': 'A',
                  'Scope A[7]': '0',
                  'Result Scope[7]': 'P.z',
                },
                note: 'Two pendulums, computed for X and Y at once with 2-component uniforms: `P.xy = (sin(t·fa + pa) + sin(t·fb + pb)) × env`. Angle units are **cycles**, so frequencies are swings per unit of *t* and phases are fractions of a swing.',
              },
              {
                id: 'resample1',
                type: 'lineresamplePOP',
                x: 3,
                y: 0,
                inputs: ['mathmix1'],
                params: {
                  'Resample Method': 'By Curvature',
                  'Min Distance': 0.008,
                  'Max Distance': 0.05,
                  'Interpolation Method': 'Cardinal',
                  'Max Verts per Input Line Strip': 100000,
                },
                note: 'Redistributes points by curvature: close together (0.008) in tight bends, far apart (0.05) on gentle arcs. Cardinal interpolation passes through the original points, so the new ones sit on a smooth curve rather than on the old straight segments.',
              },
              {
                id: 'metrics1',
                type: 'linemetricsPOP',
                x: 4,
                y: 0,
                inputs: ['resample1'],
                params: { 'Distance from Start Normalized': [true, 'along'] },
                note: 'Adds the distance along the strip, normalized to 0–1. Rename its output to `along` (text field next to the toggle). Unlike `_PointU`, it follows actual arc length.',
              },
              {
                id: 'taper1',
                type: 'mathPOP',
                x: 5,
                y: 0,
                inputs: ['metrics1'],
                params: {
                  'Input Attribute Scope': 'along',
                  Multiply: 180,
                  'Post Operation': 'sin(A)',
                  'Map from Low': 0,
                  'Map from High': 1,
                  'Map to Low': 0.15,
                  'Map to High': 1.6,
                  'Output Attribute Scope': 'LineWidth',
                },
                note: '`sin(along × 180°)` is 0 at both ends and 1 in the middle — a brush-stroke profile. The range map lifts it to 0.15–1.6 so the ends stay visible.',
              },
              {
                id: 'ramp1',
                type: 'rampTOP',
                x: 6,
                y: 1.15,
                params: { Type: 'Horizontal' },
                note: 'The stroke\'s palette from start (left) to end (right). Try coral → pale gold → electric cyan.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 6,
                y: 0,
                inputs: ['taper1'],
                params: { TOP: { ref: 'ramp1' }, 'Lookup Index Attribute U': 'along', 'Output Attribute Scope': 'Color' },
                note: 'Colors each point by its position along the stroke.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 7,
                y: 0,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'Flags on. Middle-click to see how many points the resample produced.',
              },
            ],
            childComments: [{ x: 0, y: 1.05, w: 3, text: 'Shape first (left), then measure and style (right).' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.15,
            params: { 'Xform:Translate': [0, 0, 5], Projection: 'Orthographic', 'Ortho Width': 4.8 },
            note: 'Flat, orthographic, framing the ±2 units the pendulums can reach.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 0,
            y: 2.3,
            params: {
              'Draw Lines': true,
              'Width Near': 2,
              'Width Far': 2,
              'Line Joint Type': 'Round',
              'Line Start Cap Type': 'Round',
              'Line End Cap Type': 'Round',
              'Line Width Attribute': 'LineWidth',
              'Line Color Attribute': 'Color',
            },
            note: 'Base width 2 (thousandths of the image width), multiplied per point by `LineWidth`. Round joints and caps keep tight loops from showing spiky corners.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 1,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '8x',
              'Background Color': [0.02, 0.02, 0.035, 1],
            },
            note: 'Fine lines need anti-aliasing more than anything else. Unlit — no light needed.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 1,
            inputs: ['render1'],
            params: { 'Bloom Intensity': 0.6 },
            note: 'A soft glow around the bright parts of the stroke. Raise *Bloom Intensity* for a neon look, lower it for ink on paper.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 1,
            inputs: ['bloom1'],
            note: 'Final image.',
          },
        ],
        steps: [
          {
            title: 'One long line',
            body: `Create a **Geometry COMP** \`geo1\` and empty it. Add a **Line POP** \`line1\`: on its **Divisions** page set *Divisions Method* **Divisions per Line Strip** and the first *Divisions* field to **20000**. Add a **Null POP** \`null1\` after it with render and display flags on.

Middle-click \`line1\`: about 20 000 points and **one** primitive. If you get fewer points than expected, raise *Maximum Number of Vertices* on the same page.`,
            nodes: ['geo1', 'line1', 'null1'],
          },
          {
            title: 'Camera and pen',
            body: `In \`/project1\`: a **Camera COMP** \`cam1\` at **0, 0, 5**, *Projection* **Orthographic**, *Ortho Width* **4.8**.

A **Line MAT** \`linemat1\`: *Draw Lines* on, *Width Near/Far* **2**, *Line Joint Type*, *Line Start Cap Type* and *Line End Cap Type* all **Round**. On its **Attributes** page set *Line Width Attribute* \`LineWidth\` and *Line Color Attribute* \`Color\`. Assign it to \`geo1\`.`,
            nodes: ['cam1', 'linemat1'],
          },
          {
            title: 'Render',
            body: `A **Render TOP** \`render1\` (\`cam1\`, \`geo1\`, *Anti-Alias* **8x**, near-black background) into a **Null TOP** \`out1\`. You'll see a short horizontal line.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'The pendulums',
            body: `Insert a **Math POP** \`env1\` after \`line1\`: *Input Attribute Scope* \`_PointU\`, *Multiply* **-1.5**, *Post Operation* **exp(A)**, *Output Attribute Scope* \`env\`.

Then a **Math Mix POP** \`mathmix1\`. *Angle Units* **Cycles**. Uniforms page, five **Vector** blocks: \`T\` float **60**; \`fa\` float2 **2, 3**; \`fb\` float2 **3.003, 2**; \`pa\` float2 **0, 0.25**; \`pb\` float2 **0.1, 0.5**. Combine blocks:

| # | Operation | A | B | C | Result |
|---|---|---|---|---|---|
| 0 | A * B | \`_PointU\` | \`T\` | | \`t\` |
| 1 | A * B + C | \`t\` | \`fa\` | \`pa\` | \`ga\` |
| 2 | A * B + C | \`t\` | \`fb\` | \`pb\` | \`gb\` |
| 3 | sin(A) | \`ga\` | | | \`ga\` |
| 4 | sin(A) | \`gb\` | | | \`gb\` |
| 5 | A + B | \`ga\` | \`gb\` | | \`P.xy\` |
| 6 | A * B | \`P.xy\` | \`env\` | | \`P.xy\` |
| 7 | A | \`0\` | | | \`P.z\` |

The figure appears — but zoom into a tight loop and you'll see straight segments.`,
            nodes: ['env1', 'mathmix1'],
          },
          {
            title: 'Resample by curvature',
            body: `Insert a **Line Resample POP** \`resample1\`: *Resample Method* **By Curvature**, *Min Distance* **0.008**, *Max Distance* **0.05**, *Interpolation Method* **Cardinal**, *Max Verts per Input Line Strip* **100000**. Compare the point count before and after, and look at the tight loops again.`,
            nodes: ['resample1'],
          },
          {
            title: 'Measure and taper',
            body: `Insert a **Line Metrics POP** \`metrics1\`. On its **Line Strip** page turn on *Distance from Start Normalized* and type \`along\` into the name field beside it.

Insert a **Math POP** \`taper1\`: *Input Attribute Scope* \`along\`, *Multiply* **180**, *Post Operation* **sin(A)**, *Map from Low/High* **0 / 1**, *Map to Low/High* **0.15 / 1.6**, *Output Attribute Scope* \`LineWidth\`. The stroke now swells and tapers.`,
            nodes: ['metrics1', 'taper1'],
          },
          {
            title: 'Color along the stroke',
            body: `Add a **Ramp TOP** \`ramp1\` inside \`geo1\` (*Type* **Horizontal**, your palette) and insert a **Lookup Texture POP** \`lookuptex1\` before \`null1\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`along\`, *Output Attribute Scope* \`Color\`.`,
            nodes: ['ramp1', 'lookuptex1'],
          },
          {
            title: 'Glow and drift',
            body: `Insert a **Bloom TOP** \`bloom1\` between \`render1\` and \`out1\` (*Bloom Intensity* around **0.6**).

Finally, on \`mathmix1\`'s Uniforms page, set the first component of \`pa\` to the expression \`absTime.seconds * 0.01\`. One pendulum's phase now creeps forward and the whole figure slowly rolls through its family of shapes.`,
            nodes: ['bloom1'],
            focus: ['mathmix1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why each stage is there

**The Line POP is just a strip factory.** You never use its geometry, only its *topology*: one primitive with points in order. Anything that gives you that would do — the [[Pattern POP]] with *Connectivity* **Line Strip**, for instance. What matters is that \`_PointU\` then means "how far through the drawing we are", which the pendulum math turns into time.

**Two pendulums for the price of one block.** Each uniform is a 2-component vector — X frequency and Y frequency together — so every block computes both axes at once. That's why the stack is only eight blocks long. The near-miss ratio 3.003 vs. 3 is what makes the figure precess: the two pendulums slowly drift out of step, and the drawing rotates as it shrinks. Set it to exactly 3 and the loops stack neatly on top of each other.

**Resample before you measure.** The pendulum math spaces points evenly in *time*, not along the curve: where the pen moves fast, points are far apart; where it slows at the turns, they bunch up. Line Resample fixes that by curvature, and Cardinal interpolation rounds off the corners in the process. Measuring *after* resampling means \`along\` reflects the final geometry.

**\`along\` vs. \`_PointU\`.** Both run from 0 to 1, but \`_PointU\` counts *points* while \`along\` measures *distance*. On an unevenly sampled strip, a gradient driven by \`_PointU\` stretches in some places and squashes in others; driven by \`along\` it flows at a constant rate along the stroke. The same goes for the width taper.

## Styling strokes with the Line MAT

| Parameter | What to know |
|---|---|
| *Width Near / Width Far*, *Distance Near / Far* | Width changes with distance from the camera. Set both widths equal for a flat, even stroke; make the far width smaller for depth. |
| *Width Affected by FOV/OrthoWidth* | Off: a stroke stays the same pixel width when you zoom the camera. On: it gets thicker as you zoom in, like a real object. |
| *Line Joint Type* | **Round**, **Miter** or **Bevel** where segments meet. Miter turns to bevel above *Miter Threshold (deg)*, avoiding spikes. |
| *Line Start / End Cap Type* | **Round**, **Square**, **Triangle**, **Arrow** or **None** — the Caps page sizes them. |
| *Line Width / Color Attribute* | Which POP attributes multiply the width and set the color per point. |
| *Draw Points* | Also draws a dot at every point — handy to *see* the sampling while you work. |
`,
    },
    {
      kind: 'md',
      md: `
## Splines from a handful of points

The harmonograph got its points from math. Often you'll want to place a few points by hand — or get them from data — and have a smooth curve run through them. The Line POP can do the whole thing itself, but splitting it in two is more flexible: set the Line POP's *Output* to **Control Points**, do anything you like to those few points (animate them, add noise, delete some), and only then subdivide with a [[Line Divide POP]].

The *Interpolation Method* decides how the curve relates to the control points:

| Method | Character |
|---|---|
| **Linear** | straight segments — a polyline |
| **Cardinal (Interpolating)** | passes *through* every control point; *Tension* sets how tightly it bends |
| **BSpline** | smoother, but only *approaches* the interior control points instead of hitting them |
| **Cubic Bezier**, **Cubic Bezier With Tangents**, **Quadratic Bezier** | shaped by tangents — from control-point attributes such as those the Line POP outputs |

For open curves, *Clamped* makes Cardinal and BSpline curves start and end exactly on the first and last control points.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'spline-sketch',
        title: 'Spline sketch',
        root: '/project1',
        height: 420,
        caption:
          'Five control points become a smooth curve, then a hand-drawn wobble, then a calmer line. Add `geo2` to the Render TOP\'s *Geometry* to see it with the harmonograph camera.',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../linemat2' } },
            note: 'A second drawing.',
            children: [
              {
                id: 'ctrl',
                type: 'linePOP',
                x: 0,
                y: 0,
                params: {
                  Output: 'Control Points',
                  'pt0pos[0]': [-1.8, -0.6, 0],
                  'pt0pos[1]': [-0.9, 0.9, 0],
                  'pt0pos[2]': [0, -0.8, 0],
                  'pt0pos[3]': [0.9, 0.9, 0],
                  'pt0pos[4]': [1.8, -0.6, 0],
                },
                note: 'Five hand-placed points on the **Points** page, output undivided. These are the only numbers you\'d ever animate.',
              },
              {
                id: 'divide1',
                type: 'linedividePOP',
                x: 1,
                y: 0,
                inputs: ['ctrl'],
                params: {
                  'Divisions Method': 'Divisions per Segment',
                  'Divide:Divisions': 32,
                  'Interpolation Method': 'Cardinal (Interpolating)',
                  Clamped: true,
                },
                note: '32 new points per segment along a Cardinal spline. Switch *Interpolation Method* to **BSpline** and watch the curve pull away from the middle control points.',
              },
              {
                id: 'noise2',
                type: 'noisePOP',
                x: 2,
                y: 0,
                inputs: ['divide1'],
                params: { Type: 'Simplex 3D (GPU)', Period: 0.12, Amplitude: 0.05 },
                note: 'A small, high-frequency wobble — the tremor of a hand-drawn line.',
              },
              {
                id: 'smooth1',
                type: 'linesmoothPOP',
                x: 3,
                y: 0,
                inputs: ['noise2'],
                params: {
                  'Filter Method': 'Smooth by Edge Distance',
                  'Filter Type': 'Gaussian',
                  'Edge Distance': 0.15,
                  'End Points Fixed': true,
                },
                note: 'Averages each point with its neighbors within 0.15 units along the strip. Raise *Edge Distance* to iron the wobble out completely; *End Points Fixed* keeps the ends anchored.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['smooth1'],
                flags: { display: true, render: true },
                note: 'Flags on.',
              },
            ],
          },
          {
            id: 'linemat2',
            type: 'lineMAT',
            x: 0,
            y: 1.15,
            params: {
              'Draw Lines': true,
              'Width Near': 4,
              'Width Far': 4,
              'Line Start Cap Type': 'Round',
              'Line End Cap Type': 'Arrow',
              'Line Near Color': [1, 0.85, 0.6],
            },
            note: 'A thicker warm stroke with an arrowhead at the end — the Caps page controls its size.',
          },
        ],
        steps: [
          {
            title: 'Five control points',
            body: `Create a **Geometry COMP** \`geo2\`. Inside, a **Line POP** named \`ctrl\` with *Output* **Control Points**. On its **Points** page add blocks until there are five, with positions **-1.8, -0.6** / **-0.9, 0.9** / **0, -0.8** / **0.9, 0.9** / **1.8, -0.6** (Z = 0). Add a **Null POP** \`null2\` with flags on: a zig-zag polyline.`,
            nodes: ['geo2', 'ctrl', 'null2'],
          },
          {
            title: 'Make it a spline',
            body: `Insert a **Line Divide POP** \`divide1\`: *Divisions Method* **Divisions per Segment**, *Divisions* **32**, *Interpolation Method* **Cardinal (Interpolating)**, *Clamped* on. Then try **BSpline** and **Linear** and compare.`,
            nodes: ['divide1'],
          },
          {
            title: 'Wobble, then calm',
            body: `Insert a **Noise POP** \`noise2\` (*Type* **Simplex 3D (GPU)**, *Period* **0.12**, *Amplitude* **0.05**) and then a **Line Smooth POP** \`smooth1\` (*Filter Method* **Smooth by Edge Distance**, *Filter Type* **Gaussian**, *Edge Distance* **0.15**, *End Points Fixed* on). Bypass and un-bypass \`smooth1\` to see what it does.`,
            nodes: ['noise2', 'smooth1'],
          },
          {
            title: 'An arrow stroke',
            body: `Create a **Line MAT** \`linemat2\`: *Draw Lines* on, *Width Near/Far* **4**, *Line Start Cap Type* **Round**, *Line End Cap Type* **Arrow**, warm *Line Near Color*. Assign it to \`geo2\`.`,
            nodes: ['linemat2'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Breaking points into strips

Sometimes the points come first and the lines don't exist yet — rows of a grid, samples from a CHOP, particles. The [[Line Break POP]] builds line strips from them. Its *Mode* menu chooses where connectivity comes from: **One Line Strip (point order)** joins all points in list order; **Input Line Strips** keeps existing strips; **No Connectivity** strips it away. On top of that you can break strips with a 0/1 \`LineBreak\` attribute, with a \`LineStripIndex\`-style attribute, *Every N Points*, or wherever two consecutive points are further apart than a *Distance Threshold*.

The classic use: "ridgelines" — rows of a noisy grid drawn as separate lines, like the famous pulsar plot.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'ridgelines',
        title: 'Ridgelines',
        root: '/project1',
        height: 380,
        caption:
          'Assign `linemat2` (or a white Line MAT) as `geo3`\'s Material and add `geo3` to the Render TOP. A Grid POP with *Connectivity* **Line Strips** could also make rows directly — the Line Break POP earns its keep when your points arrive *without* connectivity.',
        nodes: [
          {
            id: 'geo3',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            note: 'Thirty-six lines from a point grid.',
            children: [
              {
                id: 'grid3',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: { Connectivity: 'None', Size: [4, 3], Columns: 160, Rows: 36 },
                note: 'Points only, in the XY plane. Within the point list, each row\'s 160 points come one after another.',
              },
              {
                id: 'noise3',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['grid3'],
                params: { Type: 'Simplex 4D (GPU)', Period: 0.7, Noise: true, 'Output:Combine Operation': 'None', 'Translate 4D': { expr: 'absTime.seconds * 0.1' } },
                note: 'Writes an evolving `Noise` value without moving anything.',
              },
              {
                id: 'mathmix3',
                type: 'mathmixPOP',
                x: 2,
                y: 0,
                inputs: ['noise3'],
                params: { Operation: 'A * B + C', 'Scope A': 'Noise', 'Scope B': '0.12', 'Scope C': 'P.y', 'Result Scope': 'P.y' },
                note: 'Pushes each point up or down by its noise: `P.y = Noise × 0.12 + P.y`.',
              },
              {
                id: 'linebreak1',
                type: 'linebreakPOP',
                x: 3,
                y: 0,
                inputs: ['mathmix3'],
                params: { Mode: 'One Line Strip (point order)', 'Every N Points': true, N: 160 },
                note: 'Joins the points in order, breaking every 160 points — one strip per grid row.',
              },
              {
                id: 'null3',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['linebreak1'],
                flags: { display: true, render: true },
                note: 'Flags on.',
              },
            ],
          },
        ],
        steps: [
          {
            title: 'Noisy rows of points',
            body: `Create a **Geometry COMP** \`geo3\` with a **Grid POP** \`grid3\` (*Connectivity* **None**, *Size* **4, 3**, *Columns* **160**, *Rows* **36**), a **Noise POP** \`noise3\` (*Type* **Simplex 4D (GPU)**, *Period* **0.7**, Output page: *Noise* on, *Combine Operation* **None**, *Translate 4D* = \`absTime.seconds * 0.1\`) and a **Math Mix POP** \`mathmix3\` (**A * B + C**: \`Noise\`, \`0.12\`, \`P.y\` → \`P.y\`).`,
            nodes: ['geo3', 'grid3', 'noise3', 'mathmix3'],
          },
          {
            title: 'Break into lines',
            body: `Append a **Line Break POP** \`linebreak1\`: *Mode* **One Line Strip (point order)**, *Every N Points* on, *N* **160**. Finish with a **Null POP** \`null3\`, flags on, and give \`geo3\` a Line MAT (\`linemat2\` works). Set *N* to 80 and each row splits in two; turn *Every N Points* off and you get one long zig-zag through the whole grid.`,
            nodes: ['linebreak1', 'null3'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Vertex budgets',
      md: `Line Divide and Line Resample can't know on the CPU how many points they'll produce, so they reserve GPU memory up front: *Maximum Number of Vertices* / *Max Verts per Input Line Strip*. If a curve ends abruptly, the budget is too small — raise it, checking the real count in the info popup. Don't set it absurdly high "just in case", though; it's real memory.`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Try frequency pairs near simple ratios: 1 : 2, 2 : 3, 3 : 4, 3 : 5. The tiny offsets (3.003) decide how fast the figure precesses.
* Add a third term in Z and orbit a perspective camera around it — a harmonograph in space.
* Turn on the Line MAT's *Draw Points* with a tiny width to sprinkle beads along the stroke at the resampled points.`,
    },
    {
      kind: 'challenge',
      title: 'Ink running out',
      md: 'Instead of a symmetric brush taper, make the stroke start thick and thin out exactly as the pendulums lose energy — so line weight tells the story of the decay.',
      hints: ['You already compute the decay per point in `env1`.', 'The Line MAT doesn\'t care where `LineWidth` comes from.'],
      solution:
        'Change `taper1`\'s *Input Attribute Scope* to `env`, set *Multiply* to **1** and *Post Operation* to **None**, and map *From* **0.2 – 1** to *To* **0.1 – 2**. `env` was computed before the resample, so middle-click `resample1` and check that it is still listed on the new points. If it isn\'t, compute the envelope after `metrics1` instead, from `along` (for example `exp(-1.5 × along)` with the same Math POP settings as `env1`).',
    },
    {
      kind: 'challenge',
      title: 'Draw it like a pen',
      md: 'Animate the harmonograph being drawn: the stroke should grow from its start to its end over about 20 seconds, then start again.',
      hints: [
        'You need to remove points whose `along` is greater than a value that rises from 0 to 1 over time.',
        'The [[Delete POP]] can test an attribute against a value, and its *Value* can be an expression.',
        'Python\'s `%` operator wraps a growing number back into a range.',
      ],
      solution:
        'Insert a Delete POP after `metrics1`: *Entity* **Points**, Attribute page first block *Attribute* `along`, *Function* **>**, *Value* = `(absTime.seconds / 20) % 1`. Its *Line Strip Behavior* menu decides what happens to the strip when points vanish — **Delete Point of Line Strip** keeps the remaining part as one stroke. For a softer pen tip, use `along` in the taper so the width shrinks to nothing near the current end.',
    },
    {
      kind: 'challenge',
      title: 'Your own control points',
      md: 'Drive the five spline control points from CHOPs so the curve sways like a plant in the wind, while the Line Divide keeps it smooth.',
      hints: [
        'Each control point\'s Y position on the Line POP\'s Points page can be an expression.',
        'A Noise CHOP with five channels (or an LFO with different phases) gives each point its own motion.',
      ],
      solution:
        'Create a Noise CHOP inside `geo2` with *Channel Names* `p0 p1 p2 p3 p4`, *Time Slice* on, small *Amplitude* (around 0.3), into a Null CHOP `sway`. On `ctrl`\'s Points page set each point\'s Y to its original value plus `op(\'sway\')[\'p2\']` (etc.). Leave the first point unmoved to "root" the plant. The Line Divide re-splines every frame, so the motion stays smooth whatever the CHOPs do.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'The Line MAT has *Width Near* 2 and a point has `LineWidth` 0.5. How thick is the stroke at that point, roughly?',
          options: ['0.5', 'About half the base width (≈1)', '2.5', 'It is hidden'],
          answer: 1,
          explain: '`LineWidth` multiplies the material\'s width per point.',
        },
        {
          q: 'What is the main difference between the Line Resample POP and the Line Smooth POP?',
          options: [
            'There is none',
            'Resample redistributes points without changing the shape; Smooth changes the shape by averaging positions',
            'Resample only works on closed strips',
            'Smooth adds points; Resample deletes them',
          ],
          answer: 1,
          explain: 'Resample keeps the curve and moves the sampling; Smooth blurs positions along the strip.',
        },
        {
          q: 'Why color the stroke by `along` from the Line Metrics POP rather than by `_PointU`?',
          options: [
            '`_PointU` is not allowed in Lookup Texture',
            '`along` measures actual distance along the curve, so the gradient flows evenly even where points are unevenly spaced',
            '`along` is faster',
            '`_PointU` only works on point primitives',
          ],
          answer: 1,
          explain: '`_PointU` counts points; `along` measures arc length. They only match when points are evenly spaced.',
        },
        {
          q: 'You need a curve that passes exactly through every control point. Which interpolation method fits?',
          options: ['BSpline', 'Cardinal (Interpolating)', 'Quadratic Bezier', 'None — splines never pass through points'],
          answer: 1,
          explain: 'Cardinal splines interpolate (pass through) the control points; B-splines approximate them for extra smoothness.',
        },
        {
          q: 'A grid of points has no primitives. How do you draw each row as its own line with the Line Break POP?',
          options: [
            'Mode **No Connectivity**',
            'Mode **One Line Strip (point order)** plus *Every N Points* with N = number of columns',
            'Turn on *Output Lines* only',
            'It can\'t — use a Copy POP',
          ],
          answer: 1,
          explain: 'Join the points in order, then break every row length. *By Distance Threshold* would also work here, since the jump from one row\'s end to the next row\'s start is long.',
        },
      ],
    },
  ],
};

export default lesson;
