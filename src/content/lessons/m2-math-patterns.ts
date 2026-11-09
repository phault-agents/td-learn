import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'math-patterns',
  title: 'Math Without Code: Generative Patterns',
  subtitle: 'A sunflower, a rose and a spirograph — built from point indices and a stack of Math Mix blocks.',
  minutes: 45,
  summary:
    'Turn formulas into geometry without writing a shader. Generate points with the Pattern POP, then use built-in attributes like `_PointI`, Math POP, a multi-block Math Mix POP, ReRange and Quantize to build an animated phyllotaxis spiral colored through a Ramp TOP — and a rose curve as a closed line.',
  objectives: [
    'Use read-only built-ins (`_PointI`, `_PointU`, `_PointCy`) as the input to math',
    'Stack several Combine blocks in a Math Mix POP, with uniforms and typed constants',
    'Convert polar coordinates (angle, radius) to `P` with `cos`/`sin` blocks',
    'Remap with the ReRange POP and posterize with the Quantize POP',
    'Explain why the golden angle packs seeds so evenly — and what happens when you nudge it',
  ],
  requires: ['attributes', 'fields-and-weights'],
  tags: ['math mix', 'pattern', 'phyllotaxis', 'polar', 'built-ins', 'generative'],
  blocks: [
    {
      kind: 'md',
      md: `
Look closely at a sunflower head and you'll see spirals running in two directions — often 34 one way and 55 the other. No gardener placed them. Each new seed simply grows at a fixed angle from the previous one, a little further from the center, and the spirals fall out of that one rule.

You'll build that rule as a POP network: two thousand seeds, each placed by its own index, sized by its distance from the center and colored through a gradient. Then you'll let the angle drift a fraction of a degree and watch the whole head reorganize itself into spokes and back. No GLSL, no Python loops — just [[Math POP]], [[Math Mix POP]], [[ReRange POP]] and [[Quantize POP]] operating on built-in attributes.

The real lesson is a habit: **every point knows its own index, and an index is a parameter.** Once you think of \`_PointI\` as "the *t* in my formula", any equation of the form *position = f(t)* becomes a network you can build in a few minutes.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The phyllotaxis formula',
      md: `Seed number *i* (0, 1, 2, …) goes at:

* **angle** θ = *i* × 137.508°
* **radius** *r* = *c* × √*i*
* **position** *x* = *r* cos θ, *y* = *r* sin θ

137.508° is the **golden angle**: 360° divided by φ² (φ ≈ 1.618, the golden ratio). Because φ is, in a precise sense, the hardest number to approximate with a fraction, consecutive seeds never line up in rows — each one lands in the biggest remaining gap. The square root keeps the *area* per seed constant, so the packing is even from center to rim. This model is known as Vogel's model, after the mathematician who proposed it in 1979.`,
    },
    {
      kind: 'md',
      md: `
## The toolbox

**Built-in attributes.** Every POP that takes an attribute scope also accepts read-only built-ins. Open any attribute menu and look under the **>** at the bottom. The ones you'll use most:

| Built-in | Value per point | Typical use |
|---|---|---|
| \`_PointI\` | 0, 1, 2 … N−1 | "the *n*-th seed", counting |
| \`_PointU\` | 0 → 1 (last point is exactly 1) | gradients, open curves |
| \`_PointCy\` | 0 → (N−1)/N | closed loops: the last point stops one step short of the first |
| \`_NumPoints\` | N | scaling formulas to the point count |

They're computed on the fly and never passed downstream, so they cost nothing to keep around.

**Pattern POP.** A generator that makes N points — as point primitives, lines, or a line strip — with simple waveforms in X, Y and Z. With an input it can instead write a waveform into any attribute. Here it's mostly your "give me N points with this connectivity" node.

**Math POP.** One attribute in, one attribute out, through a fixed pipeline: *Pre Operation* → *Pre Add* → *Multiply* → *Post Add* → *Post Operation*, then an optional range map and quantize. Perfect for one-line formulas like *r* = 0.045·√*i*.

**Math Mix POP.** A stack of Combine blocks, each a tiny equation with up to three operands (A, B, C) and a result. Operands can be attributes, components (\`P.xy\`, \`P(0)\`), built-ins, **typed constants** (\`0\`, \`1 0 1\`) or **uniforms** you name on the *Uniforms* page. Blocks run top to bottom, and each can read what earlier blocks wrote. Angles follow the *Angle Units* menu: degrees by default, or radians, or cycles.

**ReRange POP / Quantize POP.** The Math POP's last two stages as standalone nodes: map one range onto another, or snap values to steps (or to 0/1 by comparison).
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'sunflower',
        title: 'Sunflower spiral',
        root: '/project1',
        height: 540,
        caption:
          'Inside **geo1** the chain reads left to right as the formula: count points → radius → angle and position → size → color band → color. The golden angle is a uniform on `mathmix1`, gently animated by an expression.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../linemat1' } },
            note: 'Holds the seed generator. The Line MAT draws its point primitives as dots.',
            children: [
              {
                id: 'pattern1',
                type: 'patternPOP',
                x: 0,
                y: 0,
                params: { 'Number of Points': 2000, Connectivity: 'Point Primitives' },
                note: 'Two thousand points, each with a point primitive so it can be drawn. Their initial positions don\'t matter — the Math Mix overwrites `P`.',
              },
              {
                id: 'math1',
                type: 'mathPOP',
                x: 1,
                y: 0,
                inputs: ['pattern1'],
                params: {
                  'Input Attribute Scope': '_PointI',
                  'Pre Operation': 'sqrt(A)',
                  Multiply: 0.045,
                  'Cast to': 'Float',
                  'Output Attribute Scope': 'r',
                },
                note: '*r* = 0.045 × √*i*. Reads the point index, square-roots it, scales it, and stores the result as a float attribute `r`. Larger multipliers spread the seeds further apart.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 2,
                y: 0,
                inputs: ['math1'],
                params: {
                  vec0name: 'golden',
                  Type: 'float',
                  'Value[0]': [{ expr: '137.508 + 0.4 * math.sin(absTime.seconds * 0.15)' }],
                  'Operation[0]': 'A * B',
                  'Scope A[0]': '_PointI',
                  'Scope B[0]': 'golden',
                  'Result Scope[0]': 'theta',
                  'Operation[1]': 'cos(A)',
                  'Scope A[1]': 'theta',
                  'Result Scope[1]': 'P.x',
                  'Operation[2]': 'sin(A)',
                  'Scope A[2]': 'theta',
                  'Result Scope[2]': 'P.y',
                  'Operation[3]': 'A * B',
                  'Scope A[3]': 'P.xy',
                  'Scope B[3]': 'r',
                  'Result Scope[3]': 'P.xy',
                  'Operation[4]': 'A',
                  'Scope A[4]': '0',
                  'Result Scope[4]': 'P.z',
                },
                note: 'Five blocks = the whole formula. θ = i × golden; P.x = cos θ; P.y = sin θ; P.xy ×= r; P.z = 0. Middle-click the node to read it back as pseudo-code.',
              },
              {
                id: 'rerange1',
                type: 'rerangePOP',
                x: 3,
                y: 0,
                inputs: ['mathmix1'],
                params: {
                  'Input Attribute Scope': 'r',
                  'Map from Low': 0,
                  'Map from High': 2,
                  'Map to Low': 0.5,
                  'Map to High': 1.3,
                  'Output Attribute Scope': 'PointScale',
                },
                note: 'Seeds near the rim are a bit larger, like a real flower head. Maps *r* (0 to about 2) onto a size multiplier of 0.5–1.3 in `PointScale`.',
              },
              {
                id: 'quantize1',
                type: 'quantizePOP',
                x: 4,
                y: 0,
                inputs: ['rerange1'],
                params: {
                  'Input Attribute Scope': '_PointU',
                  Quantize: 'Floor',
                  'Value Step': 0.125,
                  'Output Attribute Scope': 'band',
                },
                note: 'Snaps the normalized index down to steps of 1/8, giving eight discrete bands. Because radius grows with index, the bands become rings.',
              },
              {
                id: 'ramp1',
                type: 'rampTOP',
                x: 5,
                y: 1.15,
                params: { Type: 'Horizontal' },
                note: 'The palette. Try a deep violet at the left (center of the flower) through magenta and orange to pale gold at the right (rim).',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 5,
                y: 0,
                inputs: ['quantize1'],
                params: { TOP: { ref: 'ramp1' }, 'Lookup Index Attribute U': 'band', 'Output Attribute Scope': 'Color' },
                note: 'Reads the ramp at `band` and writes `Color`. Switch the index to `_PointU` for a smooth gradient instead of rings.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 6,
                y: 0,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'Flags on.',
              },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.15,
            params: { 'Xform:Translate': [0, 0, 5], Projection: 'Orthographic', 'Ortho Width': 4.8 },
            note: 'An orthographic camera looking straight down -Z: no perspective, so the pattern reads like a diagram. *Ortho Width* is how many units fit across the frame.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 0,
            y: 2.3,
            params: {
              'Draw Points': true,
              'Point Type': 'Circle (Polygon)',
              'Width Near': 7,
              'Width Far': 7,
              'Point Size Attribute': 'PointScale',
              'Point Color Attribute': 'Color',
            },
            note: 'Draws each point primitive as a flat disc. Equal near/far widths keep every seed the same base size; `PointScale` and `Color` then vary it per point.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 1,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0.03, 0.025, 0.04, 1],
            },
            note: 'No lights needed — the Line MAT is unlit.',
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
            title: 'Two thousand points',
            body: `Create a **Geometry COMP** \`geo1\` and empty it. Add a **Pattern POP** \`pattern1\` with *Number of Points* **2000** and *Connectivity* **Point Primitives**, then a **Null POP** \`null1\` with render and display flags on. Whatever shape the pattern makes doesn't matter; you'll replace \`P\` entirely.`,
            nodes: ['geo1', 'pattern1', 'null1'],
          },
          {
            title: 'A flat camera and a dot material',
            body: `In \`/project1\` create a **Camera COMP** \`cam1\`: *Translate* **0, 0, 5**, and on its **View** page *Projection* **Orthographic**, *Ortho Width* **4.8**.

Create a **Line MAT** \`linemat1\`: *Draw Points* on, *Point Type* **Circle (Polygon)**, *Width Near* and *Width Far* **7**. On its **Attributes** page set *Point Size Attribute* \`PointScale\` and *Point Color Attribute* \`Color\`. Assign it as \`geo1\`'s *Material*.`,
            nodes: ['cam1', 'linemat1'],
          },
          {
            title: 'Render',
            body: `Add a **Render TOP** \`render1\` (camera \`cam1\`, geometry \`geo1\`, *Anti-Alias* **4x**, near-black background) and a **Null TOP** \`out1\`.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'Radius from the index',
            body: `Insert a **Math POP** \`math1\` after \`pattern1\`. *Input Attribute Scope*: open the menu, go to **>** and pick \`_PointI\`. Set *Pre Operation* **sqrt(A)**, *Multiply* **0.045**, *Cast to* **Float**, and type \`r\` into *Output Attribute Scope*.

Middle-click it: every point now has an \`r\` that grows quickly near the start and slowly later — that's the square root.`,
            nodes: ['math1'],
          },
          {
            title: 'Angle and position in one Math Mix',
            body: `Insert a **Math Mix POP** \`mathmix1\`. On **Uniforms**, add a **Vector** block: *Name* \`golden\`, *Type* **float**, *Value* **137.508**.

On **Combine**, add five blocks:

| # | Operation | Scope A | Scope B | Result Scope |
|---|---|---|---|---|
| 0 | A * B | \`_PointI\` | \`golden\` | \`theta\` |
| 1 | cos(A) | \`theta\` | | \`P.x\` |
| 2 | sin(A) | \`theta\` | | \`P.y\` |
| 3 | A * B | \`P.xy\` | \`r\` | \`P.xy\` |
| 4 | A | \`0\` | | \`P.z\` |

*Angle Units* stays at **Degrees**. The sunflower appears.`,
            nodes: ['mathmix1'],
          },
          {
            title: 'Seed size',
            body: `Insert a **ReRange POP** \`rerange1\`: *Input Attribute Scope* \`r\`, *Map from Low/High* **0 / 2**, *Map to Low/High* **0.5 / 1.3**, *Output Attribute Scope* \`PointScale\`. The rim seeds swell slightly.`,
            nodes: ['rerange1'],
          },
          {
            title: 'Banded color',
            body: `Insert a **Quantize POP** \`quantize1\`: *Input Attribute Scope* \`_PointU\`, *Quantize* **Floor**, *Value Step* **0.125**, *Output Attribute Scope* \`band\`.

Add a **Ramp TOP** \`ramp1\` (inside \`geo1\`), *Type* **Horizontal**, with a palette of your choice, and insert a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`band\`, *Output Attribute Scope* \`Color\`.`,
            nodes: ['quantize1', 'ramp1', 'lookuptex1'],
          },
          {
            title: 'Let the angle breathe',
            body: `On \`mathmix1\`'s **Uniforms** page, put the \`golden\` *Value* in expression mode: \`137.508 + 0.4 * math.sin(absTime.seconds * 0.15)\`.

Watch the center: as the angle slides off 137.508°, the even packing breaks into curved arms, then straight spokes, then reassembles. A fraction of a degree is all it takes.`,
            focus: ['mathmix1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Reading the Math Mix

Middle-click \`mathmix1\` and the info popup shows your five blocks as pseudo-code — the fastest way to debug a stack. A few things worth noticing:

**Polar to Cartesian in two steps.** Blocks 1 and 2 write the unit circle position (cos θ, sin θ) straight into \`P.x\` and \`P.y\`; block 3 then scales *both* components by \`r\` in one go by using the two-component scope \`P.xy\`. Vector-times-scalar is something Math Mix handles natively, which saves you a block per axis.

**Temporaries are free to name.** \`theta\` didn't exist before block 0 wrote it. Math Mix creates it on the fly and later blocks read it like any attribute. If you don't want such helpers to travel downstream, list them in *Delete Attributes* on the Output page (or turn on *Delete New Attributes*).

**Constants vs. uniforms.** \`0\` in block 4 is a typed constant — fine for numbers that never change. \`golden\` is a uniform, so it has a real parameter you can animate, export to, or drive from a CHOP. Rule of thumb: anything you'll want to tweak or animate becomes a uniform.

## Why nudging the angle makes spokes

If the angle were exactly 1/8 of a turn (45°), every 8th seed would land in the same direction and you'd get 8 straight spokes. The golden angle avoids every simple fraction — but it can be *approximated* by fractions of Fibonacci numbers: 13/34, 21/55, 34/89 of a turn are all close to it. That's why the arms you see in a static sunflower come in Fibonacci counts. When you push the angle a little, you slide closer to one of those fractions and its arms take over; push further and you hit a "worse" fraction and straight spokes appear.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Index vs. normalized index',
      md: `Use \`_PointI\` when the *count* matters (golden angle × seed number, "every 21st point"). Use \`_PointU\` when you want the same result regardless of how many points there are — a gradient across 200 or 200 000 points looks identical. Change *Number of Points* to 5000: the flower grows, because the radius depends on the raw index — but there are still exactly eight color bands, because they depend on the normalized one.`,
    },
    {
      kind: 'md',
      md: `
## A second shape: the rose curve

The same three ideas — index as parameter, polar coordinates, a Math Mix stack — draw a completely different family of shapes. A **rose** (rhodonea) is polar too: *r* = cos(*k*θ). Instead of seeds you want one continuous closed line, so this time the Pattern POP outputs a **Line Strip** with *Closed* on, and the formula is driven by \`_PointCy\` so the end of the loop meets its start without a doubled point.

This version also switches the Math Mix *Angle Units* to **Cycles**, where 1 means one full turn. Formulas that talk about "turns" get much easier to read.

How many turns does the line need to close? For *k* = *n*/*d* (in lowest terms): *d* turns, or *d*/2 if *n* and *d* are both odd. Integer *k* gives *k* petals when odd and 2*k* petals when even.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'rose',
        title: 'Rose curve',
        root: '/project1',
        height: 400,
        caption:
          'Add `geo2` to `render1`\'s *Geometry* (or switch it to `geo*`) to render it with the sunflower\'s camera. Try `k` = 4, 7, 2.5 (with `turns` 2) and 0.75 (with `turns` 4).',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../linemat2' } },
            note: 'A second object, drawn as a single line.',
            children: [
              {
                id: 'pattern2',
                type: 'patternPOP',
                x: 0,
                y: 0,
                params: { 'Number of Points': 1500, Connectivity: 'Line Strip', Closed: true },
                note: 'One closed line strip of 1500 points — the "pen".',
              },
              {
                id: 'mathmix2',
                type: 'mathmixPOP',
                x: 1,
                y: 0,
                inputs: ['pattern2'],
                params: {
                  'Angle Units': 'Cycles',
                  vec0name: 'k',
                  'Type[0]': 'float',
                  'Value[0]': [2.5],
                  'vec0name[1]': 'turns',
                  'Type[1]': 'float',
                  'Value[1]': [2],
                  'Operation[0]': 'A * B',
                  'Scope A[0]': '_PointCy',
                  'Scope B[0]': 'turns',
                  'Result Scope[0]': 'theta',
                  'Operation[1]': 'A * B',
                  'Scope A[1]': 'theta',
                  'Scope B[1]': 'k',
                  'Result Scope[1]': 'ktheta',
                  'Operation[2]': 'cos(A)',
                  'Scope A[2]': 'ktheta',
                  'Result Scope[2]': 'r',
                  'Operation[3]': 'cos(A)',
                  'Scope A[3]': 'theta',
                  'Result Scope[3]': 'P.x',
                  'Operation[4]': 'sin(A)',
                  'Scope A[4]': 'theta',
                  'Result Scope[4]': 'P.y',
                  'Operation[5]': 'A * B',
                  'Scope A[5]': 'P.xy',
                  'Scope B[5]': 'r',
                  'Result Scope[5]': 'P.xy',
                  'Operation[6]': 'A',
                  'Scope A[6]': '0',
                  'Result Scope[6]': 'P.z',
                },
                note: 'θ = _PointCy × turns; r = cos(kθ); P = r·(cos θ, sin θ, 0). Two uniforms (`k`, `turns`) and seven blocks, angles in cycles.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 2,
                y: 0,
                inputs: ['mathmix2'],
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
              'Width Near': 2.5,
              'Width Far': 2.5,
              'Line Near Color': [0.55, 0.9, 1],
              'Line Joint Type': 'Round',
            },
            note: 'A clean constant-width stroke with round joints, so the sharp turns at the petal tips stay smooth.',
          },
        ],
        steps: [
          {
            title: 'A closed pen stroke',
            body: `Create a **Geometry COMP** \`geo2\`. Inside: a **Pattern POP** \`pattern2\` (*Number of Points* **1500**, *Connectivity* **Line Strip**, *Closed* on) and a **Null POP** \`null2\` with flags on.`,
            nodes: ['geo2', 'pattern2', 'null2'],
          },
          {
            title: 'The rose stack',
            body: `Insert a **Math Mix POP** \`mathmix2\`. Set *Angle Units* (Inputs page) to **Cycles**. Uniforms: two float **Vector** blocks, \`k\` = **2.5** and \`turns\` = **2**.

Combine blocks:

| # | Operation | A | B | Result |
|---|---|---|---|---|
| 0 | A * B | \`_PointCy\` | \`turns\` | \`theta\` |
| 1 | A * B | \`theta\` | \`k\` | \`ktheta\` |
| 2 | cos(A) | \`ktheta\` | | \`r\` |
| 3 | cos(A) | \`theta\` | | \`P.x\` |
| 4 | sin(A) | \`theta\` | | \`P.y\` |
| 5 | A * B | \`P.xy\` | \`r\` | \`P.xy\` |
| 6 | A | \`0\` | | \`P.z\` |`,
            nodes: ['mathmix2'],
          },
          {
            title: 'Ink',
            body: `Create a **Line MAT** \`linemat2\` with *Draw Lines* on, *Width Near/Far* **2.5**, a pale cyan *Line Near Color* and *Line Joint Type* **Round**. Assign it to \`geo2\` and add \`geo2\` to the Render TOP.`,
            nodes: ['linemat2'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'One node, one pass',
      md: `A Math Mix POP generates one shader for its whole block stack (attach an Info DAT to it to read the GLSL). Five blocks in one Math Mix are generally cheaper than five separate Math POPs, each of which is its own operator with its own output attributes and its own cook. Use separate nodes while you're exploring — they're easier to bypass and inspect — and consolidate into one Math Mix when the design settles.`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Instance tiny spheres or seeds onto the sunflower points (lesson 2.2) with \`PointScale\` driving the instance scale.
* Replace the Quantize with \`_PointU\` for a smooth gradient, or color by \`theta\` for rainbow arms.
* Animate \`k\` on the rose very slowly with *turns* set high (say 20): the curve never quite closes and weaves a dense, shimmering texture.`,
    },
    {
      kind: 'challenge',
      title: 'Reveal the Fibonacci arms',
      md: 'Color the sunflower so that one family of spiral arms is clearly visible: every seed on the same arm gets the same color.',
      hints: [
        'Seeds on the same arm are a fixed number of indices apart — and that number is a Fibonacci number (13, 21, 34, 55…).',
        'Math Mix has a **mod(A, B)** operation. `mod(_PointI, 21)` gives 0–20, repeating.',
        'The ramp lookup wants 0–1, so divide by the same number.',
      ],
      solution:
        'Add two blocks to `mathmix1`: **mod(A, B)** with `_PointI` and `21` → `arm`, then **A / B** with `arm` and `21` → `armU`. Set `lookuptex1`\'s *Lookup Index Attribute U* to `armU` (and bypass or delete `quantize1`). Twenty-one arms appear in one direction. Try 34 for the other direction, or 13 and 55 — some counts give clean spirals, others a muddle, depending on how many seeds you have.',
    },
    {
      kind: 'challenge',
      title: 'From disc to dome',
      md: 'Lift the sunflower into 3D: the center should bulge toward the camera like a real flower head, falling off toward the rim. Then switch the camera to perspective and tilt it so you can see the shape.',
      hints: [
        'Only block 4 (`P.z`) needs to change — make it a function of `r`.',
        'A dome is roughly *z* = *h* − *a*·*r*². Math Mix has **A * A** and **A * B + C**.',
      ],
      solution:
        'Replace block 4 with two blocks: **A * A** with `r` → `r2`; then **A * B + C** with A `r2`, B `-0.25`, C `1` → `P.z`. The center sits at z = 1 and the rim around z = 0. Set `cam1` back to **Perspective**, move it to about **0, -4, 4** and rotate it about **45, 0, 0** so it looks up at the dome — or simply rotate `geo1` on its Xform page.',
    },
    {
      kind: 'challenge',
      title: 'Spirograph',
      md: 'Turn the rose network into a **spirograph** (a hypotrochoid): a small wheel of radius *r* rolling inside a ring of radius *R*, with the pen at distance *d* from the wheel\'s center.\n\n*x* = (*R*−*r*) cos *t* + *d* cos(((*R*−*r*)/*r*)·*t*)\n\n*y* = (*R*−*r*) sin *t* − *d* sin(((*R*−*r*)/*r*)·*t*)',
      hints: [
        'Make `R`, `rw` (the wheel radius — `r` is already taken by the rose) and `d` uniforms. With Angle Units in cycles, *t* = `_PointCy` × `turns`.',
        'Compute the two constants first: `a = R - rw` and `b = a / rw`.',
        'Build the big circle straight into `P.xy` the same way the rose does (cos, sin, then scale by `a`), and the small circle into two helper attributes; then add and subtract.',
      ],
      solution:
        'Uniforms `R` = 1.5, `rw` = 0.55, `d` = 0.9, `turns` = 11 (R : rw = 30 : 11, so the curve closes after 11 turns). Blocks: **A - B** (`R`, `rw`) → `a`; **A / B** (`a`, `rw`) → `b`; **A * B** (`_PointCy`, `turns`) → `t`; **A * B** (`t`, `b`) → `bt`; **cos(A)** `t` → `P.x`; **sin(A)** `t` → `P.y`; **A * B** (`P.xy`, `a`) → `P.xy`; **cos(A)** `bt` → `sx`; **sin(A)** `bt` → `sy`; **A * B + C** (`sx`, `d`, `P.x`) → `P.x`; **A * B** (`sy`, `d`) → `sy`; **A - B** (`P.y`, `sy`) → `P.y`; **A** `0` → `P.z`. Thirteen blocks, no code — and every coefficient is a live parameter. Raise *Number of Points* if the curve looks faceted.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'You want each point\'s value to depend on its position in the point list, independent of how many points there are. Which built-in fits best?',
          options: ['`_PointI`', '`_PointU`', '`_NumPoints`', '`_StepSeconds`'],
          answer: 1,
          explain: '`_PointU` runs from 0 to 1 whatever the point count. `_PointI` is the raw index, which changes meaning when the count changes.',
        },
        {
          q: 'Why does the rose curve use `_PointCy` instead of `_PointU`?',
          options: [
            '`_PointU` doesn\'t work in Math Mix',
            'On a closed strip, `_PointU` makes the last point land exactly on the first, doubling it; `_PointCy` stops one step short',
            '`_PointCy` is faster',
            '`_PointCy` is measured in degrees',
          ],
          answer: 1,
          explain: '`_PointCy` goes from 0 to (N−1)/N, so the closing segment of the loop completes the curve instead of drawing a zero-length segment.',
        },
        {
          q: 'In `mathmix1`, block 3 is **A * B** with Scope A `P.xy` and Scope B `r`. What does it do?',
          options: [
            'Multiplies X by Y',
            'Scales both X and Y of `P` by the scalar `r` and writes them back',
            'Writes `r` into `P`',
            'Nothing — vectors can\'t be multiplied by scalars',
          ],
          answer: 1,
          explain: 'A two-component scope times a scalar gives a two-component result, written back to `P.xy`.',
        },
        {
          q: 'The golden angle is changed from 137.508° to 137.6°. What happens to the sunflower?',
          options: [
            'Nothing visible',
            'The even packing breaks up into visible arms or spokes',
            'All points collapse to the center',
            'The colors change',
          ],
          answer: 1,
          explain: 'Moving toward a simple fraction of a turn makes every *n*-th seed line up, so arms (and eventually straight spokes) appear.',
        },
        {
          q: 'When should a value be a Math Mix **uniform** rather than a constant typed into a scope?',
          options: [
            'Never — constants are always better',
            'When you want to animate it, drive it from a CHOP, or tweak it as a parameter',
            'Only for colors',
            'When it\'s an integer',
          ],
          answer: 1,
          explain: 'Uniforms are real parameters: expressions, exports and CHOP references work on them. Typed constants are fixed text in a scope field.',
        },
      ],
    },
  ],
};

export default lesson;
