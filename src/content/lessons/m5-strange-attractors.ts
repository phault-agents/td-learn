import type { Lesson } from '../types';

const AIZAWA_SHADER = `// aizawa_glsl: advances every particle along the Aizawa flow.
// Uniforms (aizawa1 > Vectors): uDt (float), uSteps (int),
//   uABC (vec3) = a, b, c    uDEF (vec3) = d, e, f    uSpeedMax (float)

vec3 aizawa(vec3 p) {                       // the velocity field: dp/dt
    float a = uABC.x, b = uABC.y, c = uABC.z;
    float d = uDEF.x, e = uDEF.y, f = uDEF.z;
    return vec3(
        (p.z - b) * p.x - d * p.y,
        d * p.x + (p.z - b) * p.y,
        c + a * p.z - p.z * p.z * p.z / 3.0
          - (p.x * p.x + p.y * p.y) * (1.0 + e * p.z)
          + f * p.z * p.x * p.x * p.x);
}

void main() {
    const uint id = TDIndex();
    if (id >= TDNumElements())
        return;

    vec3 p = TDIn_P();                      // last frame's position (via feedback1)

    for (int i = 0; i < uSteps; i++) {      // fixed-size RK4 substeps
        vec3 k1 = aizawa(p);
        vec3 k2 = aizawa(p + 0.5 * uDt * k1);
        vec3 k3 = aizawa(p + 0.5 * uDt * k2);
        vec3 k4 = aizawa(p + uDt * k3);
        p += uDt / 6.0 * (k1 + 2.0 * k2 + 2.0 * k3 + k4);
    }

    // Safety net: a point that blew up (NaN) or escaped is put back near the core,
    // with a tiny per-point offset so respawned points don't overlap.
    if (any(isnan(p)) || dot(p, p) > 100.0)
        p = vec3(0.1) + 0.001 * vec3(float(id % 17u), float(id % 23u), float(id % 29u));

    P[id] = p;

    // Color by speed: slow = deep blue, fast = hot orange.
    float t = clamp(length(aizawa(p)) / uSpeedMax, 0.0, 1.0);
    Color[id] = vec4(TDHSVToRGB(vec3(0.62 - 0.55 * t, 0.8, 0.35 + 0.65 * t)), 1.0);
}
`;

const lesson: Lesson = {
  slug: 'strange-attractors',
  title: 'Strange Attractors',
  subtitle: 'Integrate chaos on the GPU: thousands of particles tracing the Aizawa attractor, with glowing trails.',
  minutes: 45,
  summary:
    'A GLSL POP inside a Feedback POP loop integrates an attractor equation with fixed RK4 substeps. Points are scaled into view after the loop, drawn as Trail POP lines with the Line MAT, colored by speed and filmed by an orbiting camera.',
  objectives: [
    'Read an ODE as a velocity field and turn it into a GLSL function',
    'Build a [[Feedback POP]] loop around a [[GLSL POP]] so positions persist between frames',
    'Integrate stably with a fixed small `dt`, RK4 and substeps, and guard against blow-ups',
    'Keep simulation space and display space separate',
    'Turn particle history into lines with the [[Trail POP]] and render them additively',
  ],
  requires: ['glsl-pop', 'particles'],
  tags: ['glsl', 'simulation', 'feedback', 'trails', 'chaos', 'advanced'],
  blocks: [
    {
      kind: 'md',
      md: `
A strange attractor is what chaos looks like after you let it run. Drop a handful of points anywhere near it and they're pulled into the same tangled shape, circling forever without repeating a path. Two points that start a hair's width apart end up on opposite sides of the shape within seconds. Yet the *shape* is stable, recognisable and often beautiful.

In this lesson you'll release eight thousand particles into the **Aizawa attractor**, a sphere-like form with a tube punched through its axis, and watch them wind into it. Each particle drags a glowing trail colored by its speed. The whole simulation is one short GLSL function inside a feedback loop.

## A velocity field you can write down

Attractors come from *ordinary differential equations*: rules of the form "at position **p**, the velocity is **f(p)**". For Aizawa that rule is:

\`\`\`text
dx/dt = (z − b)·x − d·y
dy/dt = d·x + (z − b)·y
dz/dt = c + a·z − z³/3 − (x² + y²)(1 + e·z) + f·z·x³
\`\`\`

With the classic constants **a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1**. Read the first two lines together: they spin each point around the Z axis at a rate set by *d*, while pushing it outward or inward depending on its height. The third line lifts points up the middle and folds them back down the outside.

To animate it you **integrate**: take the current position, ask *f* for the velocity, move a tiny step along it, repeat. In POP terms:

* **The state is \`P\`**, and it must survive from one frame to the next. That's a job for the [[Feedback POP]]: it hands last frame's result back to the top of the chain.
* **The rule is a GLSL function.** Every particle is independent, so one thread per point is a perfect fit.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Small steps, taken carefully',
      md: `The simplest integrator, *Euler*, is \`p += f(p) * dt\`. It assumes the velocity stays constant for the whole step, which is never quite true on a curving path. The error piles up and particles spiral off the attractor. Two fixes, used together here:

* **RK4** (Runge–Kutta, 4th order) samples the velocity four times across the step and averages them. For the same \`dt\` it's dramatically more accurate, and four evaluations of a twelve-term polynomial cost the GPU almost nothing.
* **Fixed, small \`dt\`, with substeps.** Instead of one big step per frame, take \`uSteps\` small ones in a loop. Speed up the animation by adding steps, never by inflating \`dt\`. A chaotic system with a large \`dt\` doesn't just get less accurate, it explodes.

Why not scale \`dt\` by frame time? For a design piece, determinism and stability matter more than wall-clock speed. With a fixed \`dt\`, a dropped frame makes the motion hesitate for a moment instead of throwing the system into a different regime.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'aizawa',
        title: 'Aizawa attractor with trails',
        root: '/project1',
        height: 560,
        caption:
          'Inside **geo1** the loop is `feedback1 → aizawa1`, with *Target POP* pointing back at `aizawa1`. Everything after `aizawa1` (trails, display transform) runs outside the loop and never feeds back.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: 'line1' } },
            note: 'Holds the simulation and its display chain. The Line MAT draws the trail line strips.',
            children: [
              {
                id: 'seed1',
                type: 'pointgeneratorPOP',
                x: 0,
                y: 0,
                params: {
                  Shape: 'Box',
                  'Number of Points': 8000,
                  Distribution: 'Volume',
                  Random: true,
                  Size: [0.6, 0.6, 0.6],
                  'Create Point Primitives': true,
                },
                note: 'Eight thousand random seeds in a small box at the origin. The attractor pulls them in from wherever they start. Point primitives make the raw cloud visible in the viewer.',
              },
              {
                id: 'attribute1',
                type: 'attributePOP',
                x: 1,
                y: 0,
                inputs: ['seed1'],
                params: { 'Name[0]': 'Color', 'Value[0]': [1, 1, 1, 1] },
                note: 'Creates `Color`, which the shader overwrites with a speed-based color every frame.',
              },
              {
                id: 'feedback1',
                type: 'feedbackPOP',
                x: 2,
                y: 0,
                inputs: ['attribute1'],
                params: { 'Target POP': { ref: 'aizawa1' } },
                note: 'On the first frame it passes the seeds through. After that it outputs `aizawa1`\'s result from the **previous** frame. *Initialize* resets to the seeds, *Start* runs.',
              },
              {
                id: 'aizawa_glsl',
                type: 'textDAT',
                x: 3,
                y: 1,
                code: { lang: 'glsl', text: AIZAWA_SHADER },
                note: 'The attractor as a GLSL function plus an RK4 loop. Swap the function and the uniforms to get a different attractor (see the variations below).',
              },
              {
                id: 'aizawa1',
                type: 'glslPOP',
                x: 3,
                y: 0,
                inputs: ['feedback1'],
                params: {
                  'Compute Shader': { ref: 'aizawa_glsl' },
                  'Output Attributes': 'P Color',
                  'Initialize Output Attributes': false,
                  'Vectors:Name[0]': 'uDt',
                  'Vectors:Type[0]': 'float',
                  'Vectors:Value[0]': [0.005],
                  'Vectors:Name[1]': 'uSteps',
                  'Vectors:Type[1]': 'int',
                  'Vectors:Value[1]': [3],
                  'Vectors:Name[2]': 'uABC',
                  'Vectors:Type[2]': 'vec3',
                  'Vectors:Value[2]': [0.95, 0.7, 0.6],
                  'Vectors:Name[3]': 'uDEF',
                  'Vectors:Type[3]': 'vec3',
                  'Vectors:Value[3]': [3.5, 0.25, 0.1],
                  'Vectors:Name[4]': 'uSpeedMax',
                  'Vectors:Type[4]': 'float',
                  'Vectors:Value[4]': [3],
                },
                note: 'One thread per particle: three RK4 steps of `dt = 0.005` per frame, then a speed-based color. It writes every point of `P` and `Color`, so *Initialize Output Attributes* is off. This is the feedback target.',
              },
              {
                id: 'trail1',
                type: 'trailPOP',
                x: 4,
                y: 0,
                inputs: ['aizawa1'],
                params: { 'Trail Length': 0.6, Connectivity: 'Columns', 'Max Number of Line Strips': 10000 },
                note: 'Keeps the last 0.6 seconds of every particle (set the unit menu to **seconds**) and links each particle\'s history into a line strip. *Max Number of Line Strips* must exceed the particle count.',
              },
              {
                id: 'transform1',
                type: 'transformPOP',
                x: 5,
                y: 0,
                inputs: ['trail1'],
                params: { Rotate: [-90, 0, 0], Translate: [0, -0.7, 0], 'Uniform Scale': 1.1 },
                note: '**Display space only.** Turns the attractor\'s Z axis into Y (so it stands upright), centres it and scales it. Because this sits after the loop, it never compounds.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 6,
                y: 0,
                inputs: ['transform1'],
                flags: { display: true, render: true },
                note: 'Render and display flags.',
              },
            ],
            childComments: [
              { x: 2, y: -0.75, w: 2.2, text: 'The loop: feedback1 → aizawa1 → (next frame) feedback1' },
              { x: 4, y: 0.9, w: 2.4, text: 'After the loop: history and presentation only.' },
            ],
          },
          {
            id: 'line1',
            type: 'lineMAT',
            x: 0,
            y: 1.3,
            params: {
              'Distance Near': 2,
              'Distance Far': 8,
              'Width Near': 1.4,
              'Width Far': 0.5,
              'Line Color Attribute': 'Color',
              'Blending (Transparency)': true,
              'Source Color *': 'Source Alpha',
              'Destination Color *': 'One',
              'Write Depth Values': false,
            },
            note: 'Draws every trail as a thin camera-facing stroke tinted by `Color`. Additive blending (source × alpha + destination) makes overlapping trails glow. Depth writes are off so lines don\'t hide each other.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 1,
            y: 1.3,
            params: {
              'Xform:Translate': [
                { expr: '4.2 * math.sin(absTime.seconds * 0.12)' },
                1.2,
                { expr: '4.2 * math.cos(absTime.seconds * 0.12)' },
              ],
              'Look At': { ref: 'geo1' },
            },
            note: 'Orbits on a circle of radius 4.2 (one turn in about 52 s) while *Look At* keeps it aimed at `geo1`.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0.6,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '8x (Medium)',
              'Background Color': [0.01, 0.012, 0.02, 1],
            },
            note: 'No lights needed: the Line MAT is unlit. Extra anti-aliasing keeps thousands of thin lines from shimmering.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 0.6,
            inputs: ['render1'],
            note: 'A soft halo around the dense, bright regions. Start from the defaults and adjust the intensity to taste.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 0.6,
            inputs: ['bloom1'],
            note: 'The final image.',
          },
        ],
        steps: [
          {
            title: 'Seed the particles',
            body: `Create a **Geometry COMP** \`geo1\` and, inside it, a **Point Generator POP** \`seed1\`: *Shape* **Box**, *Number of Points* **8000**, *Distribution* **Volume**, *Random* on, *Size* **0.6 0.6 0.6**, *Create Point Primitives* on.

Append an **Attribute POP** \`attribute1\` that creates **Color** with value **1 1 1 1**. The shader will write into it.`,
            nodes: ['geo1', 'seed1', 'attribute1'],
          },
          {
            title: 'Write the attractor',
            body: `Create a **Text DAT** \`aizawa_glsl\` and paste in the shader (open the node in the inspector to copy it).

Create a **GLSL POP** \`aizawa1\` and, **for now**, wire it straight to \`attribute1\`. Set *Compute Shader* to \`aizawa_glsl\`, *Output Attributes* to \`P Color\`, and turn *Initialize Output Attributes* off. On **Vectors** add five blocks:

| Name | Type | Value |
|---|---|---|
| \`uDt\` | float | 0.005 |
| \`uSteps\` | int | 3 |
| \`uABC\` | vec3 | 0.95, 0.7, 0.6 |
| \`uDEF\` | vec3 | 3.5, 0.25, 0.1 |
| \`uSpeedMax\` | float | 3 |

It compiles, the points get colors, and they hardly move. Without feedback, every frame starts again from the seeds and advances only 0.015 time units.`,
            nodes: ['aizawa_glsl', 'aizawa1'],
          },
          {
            title: 'Close the loop',
            body: `Insert a **Feedback POP** \`feedback1\` between \`attribute1\` and \`aizawa1\`, and set its *Target POP* to \`aizawa1\`.

Now each frame starts where the last one ended. If nothing moves, pulse **Start**. To restart from the seeds, pulse **Initialize** and then **Start**. Within a few seconds the box unravels and the attractor's shape appears out of the cloud.`,
            nodes: ['feedback1'],
          },
          {
            title: 'Trails',
            body: `Append a **Trail POP** \`trail1\` to \`aizawa1\` (outside the loop, since \`aizawa1\` can feed both). Set *Trail Length* **0.6** with its unit menu on **seconds**, *Connectivity* **Columns**, and *Max Number of Line Strips* **10000**.

Every input point becomes a column of the trail: its position this frame, last frame, and so on. **Columns** connects each particle through time. If you instead see lines zigzagging between different particles, you're joining slices. Switch to **Rows**.`,
            nodes: ['trail1'],
          },
          {
            title: 'Display space',
            body: `Append a **Transform POP** \`transform1\` (*Rotate* **−90 0 0**, *Translate* **0 −0.7 0**, *Uniform Scale* **1.1**) and a **Null POP** \`null1\` with display and render flags on.

The attractor's natural axis is Z. Rotating it upright and centring it is pure presentation, so it happens after the trails, never inside the loop.`,
            nodes: ['transform1', 'null1'],
          },
          {
            title: 'Glowing lines',
            body: `At \`/project1\` create a **Line MAT** \`line1\`: *Distance Near/Far* **2 / 8**, *Width Near/Far* **1.4 / 0.5**, *Line Color Attribute* \`Color\`. On its **Common** page turn on *Blending (Transparency)* with *Source Color* **Source Alpha** and *Destination Color* **One**, and turn *Write Depth Values* off.

Assign \`line1\` as \`geo1\`'s *Material*.`,
            nodes: ['line1'],
            focus: ['geo1'],
          },
          {
            title: 'An orbiting camera and the render',
            body: `Create a **Camera COMP** \`cam1\` with *Translate* X = \`4.2 * math.sin(absTime.seconds * 0.12)\`, Y = **1.2**, Z = \`4.2 * math.cos(absTime.seconds * 0.12)\`, and *Look At* \`geo1\`.

Add a **Render TOP** \`render1\` (*Anti-Alias* **8x (Medium)**, near-black background), a **Bloom TOP** \`bloom1\` and a **Null TOP** \`out1\`.`,
            nodes: ['cam1', 'render1', 'bloom1', 'out1'],
          },
          {
            title: 'Tune by eye',
            body: `Back on \`aizawa1\`:

* Raise **uSteps** to 6 for faster motion. Leave **uDt** alone.
* Adjust **uSpeedMax** until the colors span the full range: deep blue in the slow outer sheets, orange where particles race up the central tube.
* Nudge **uABC** x (the *a* constant) between about 0.6 and 1.0 and watch the shape reorganise. Pulse *Initialize*/*Start* if particles escape.`,
            focus: ['aizawa1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why the network is shaped like this

**The loop is as small as possible.** Only \`feedback1\` and \`aizawa1\` are inside it. Anything inside the loop runs again on its own output every frame. A Transform POP there would rotate the attractor by another 90° every frame, and a Trail POP there would trail its own trails. The rule: **simulation space inside the loop, display space after it.** The simulation stays in the attractor's native coordinates, where the published constants work. Scaling and orientation are a camera decision.

**State lives in attributes.** The only memory the system has is what's stored on the points. Aizawa needs nothing beyond \`P\`. A system with velocity or age would carry those as attributes too, and list them in *Output Attributes*.

**The safety net matters.** Chaotic systems amplify tiny errors, and floating-point maths makes tiny errors. Very rarely a particle lands somewhere the field is huge and shoots off to infinity, then turns into \`NaN\` (not-a-number). A NaN point poisons bounding boxes and can make lines streak across the frame. The last check in the shader respawns any particle that escapes or goes NaN, so the system heals itself.

## Color by speed

\`length(aizawa(p))\` is the particle's speed: the length of the velocity the field gives at its position. It varies a lot along the attractor (slow in the outer sheets, fast through the central tube), so mapping it to color reveals structure that position alone hides. The shader converts the normalised speed to a hue with \`TDHSVToRGB()\`, sweeping from blue to orange and raising the brightness with it. Because each trail slice keeps the color the particle had at that moment, the trails show acceleration as gradients along the line.

## How the trails work

The [[Trail POP]] keeps a copy of its input from each recent frame. With a constant point count it stacks those copies as a new *dimension*: each particle becomes a column, each moment a row. *Connectivity* then decides what to join. Connecting along columns gives one line strip per particle, back through time. It ignores whatever primitives the input had.

Memory is easy to estimate: **particles × slices**. Eight thousand particles × 0.6 s × 60 fps ≈ 290 000 points: comfortable. Double the trail length and particle count together and you're past a million, still fine for the GPU, but the Line MAT has to draw it all. If trail points arrive in a changing order, which happens with particle systems that birth and kill points, the Trail POP can match points across frames by an id attribute (*Match by Attribute*) instead of by index. Our particles never die, so index order is enough.

## Restarting and warming up

The Feedback POP has a small state machine. *Initialize* snapshots the input and waits. *Start* runs. *Play* pauses and resumes. An [[Info CHOP]] pointed at \`feedback1\` shows its \`initializing\`, \`ready\`, \`running\` and \`done\` channels if you need to automate a restart. For installations, *Pre-Roll* is handy: it runs the loop for a given time *during* initialization, so when you press *Start* the attractor is already fully formed instead of unravelling from a box.
`,
    },
    {
      kind: 'md',
      md: `
## Other attractors

Swap the \`aizawa()\` function and the uniforms and the same network draws a different attractor. Each one has its own scale and speed, so \`dt\`, the seed box, the display transform and \`uSpeedMax\` change with it:

| Attractor | Constants (uniform) | dt | Native size | Display transform |
|---|---|---|---|---|
| **Aizawa** | a b c = 0.95 0.7 0.6, d e f = 3.5 0.25 0.1 | ~0.005 | about ±1.5, z from −0.5 to 2 | as built |
| **Lorenz** | σ ρ β = 10 28 2.667 | ~0.004 | about ±20 in x, z from 0 to 50 | scale ≈ 0.05, then centre |
| **Thomas** | b = 0.208186 | ~0.05 | about ±4 | scale ≈ 0.3 |
`,
    },
    {
      kind: 'code',
      lang: 'glsl',
      title: 'Drop-in velocity fields (use uABC for the constants)',
      code: `// Lorenz: sigma, rho, beta in uABC. The classic butterfly.
vec3 lorenz(vec3 p) {
    return vec3(uABC.x * (p.y - p.x),
                p.x * (uABC.y - p.z) - p.y,
                p.x * p.y - uABC.z * p.z);
}

// Thomas: cyclically symmetric, b in uABC.x. A woven lattice of loops.
vec3 thomas(vec3 p) {
    return vec3(sin(p.y) - uABC.x * p.x,
                sin(p.z) - uABC.x * p.y,
                sin(p.x) - uABC.x * p.z);
}`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Where the cost is',
      md: 'The simulation is almost free: even 100 000 particles × 6 RK4 steps is a light compute load. The expensive parts come after it. Trail memory grows as particles × slices, and the Line MAT draws every segment. Profile by bypassing `trail1`: if the frame rate jumps, shorten the trail or reduce particles before you touch the shader.',
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Long exposures without trails',
      md: 'For a photographic look, skip the Trail POP and draw the particles themselves (Line MAT *Draw Points*, small size). Then accumulate the Render TOP over time with a [[Feedback TOP]] loop that fades the previous frame slightly before adding the new one. Minutes of motion build into a dense, smoky picture of the attractor at the cost of a single extra TOP.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Seed from something meaningful (the points of a word from a Text POP, or a logo) and let the attractor dissolve it. Map an audio envelope onto `uSteps` so the flow surges on beats. Or color by *where a particle started* instead of speed: store the seed position in a custom attribute before the loop and leave it untouched inside.',
    },
    {
      kind: 'challenge',
      title: 'Release the butterfly',
      md: 'Convert the network to the **Lorenz** attractor. It should fill the frame, stand upright and keep its trails smooth.',
      hints: [
        'Paste `lorenz()` into the shader and call it everywhere `aizawa()` was called. `uDEF` becomes unused.',
        'Lorenz is about 30 times bigger and much faster than Aizawa. Reduce `dt` and expect a much larger `uSpeedMax`.',
        'The seeds can stay near the origin: it\'s an unstable point, so particles are flung onto the wings.',
      ],
      solution: `In the shader, replace the \`aizawa\` function body (or add \`lorenz()\` and call it in the four RK4 lines and in the color line). Then set **uABC** to **10, 28, 2.667**, **uDt** to **0.004**, **uSteps** to **3** and **uSpeedMax** to around **120**. Raise the escape radius in the safety net from \`dot(p, p) > 100.0\` to something like \`> 10000.0\`, or every Lorenz point counts as escaped.

On \`transform1\` keep *Rotate* **−90 0 0** (Lorenz's axis is also Z), set *Uniform Scale* to **0.05** and *Translate* Y to about **−1.25** to centre the wings (z ≈ 25 × 0.05). Pulse *Initialize* and *Start*.`,
    },
    {
      kind: 'challenge',
      title: 'Fade the tails',
      md: 'Make every trail fade out toward its oldest end, so particles look like comets instead of strings.',
      hints: [
        'The Trail POP can tag each slice with its age (*Age Attribute*).',
        'A [[Math Mix POP]] block can compute `A * B + C` with constants typed straight into the scope fields.',
        'Our Line MAT blends with *Source Alpha*, so lowering `Color`\'s alpha makes a segment dimmer.',
      ],
      solution: `On \`trail1\` set *Age Attribute* to **Seconds**. Middle-click it to confirm the new attribute's name (\`Age\`). Insert a **Math Mix POP** after \`trail1\` with one block: *Operation* **A * B + C**, *Scope A* \`Age\`, *Scope B* \`-1.6\`, *Scope C* \`1\`, *Result Scope* \`Color.a\`. With a 0.6 s trail, alpha runs from 1 at the head to about 0 at the tail. For tapering width as well, write the same value to \`LineWidth\` and set the Line MAT's *Line Width Attribute* to it.`,
    },
    {
      kind: 'challenge',
      title: 'Watch it bifurcate',
      md: 'Make the attractor slowly change character on its own by sweeping one of its constants with an [[LFO CHOP]].',
      hints: [
        'Uniform values accept expressions, per component.',
        'Small ranges matter: Aizawa\'s *a* between about 0.6 and 1.0 already changes the shape a lot.',
      ],
      solution: 'Create an LFO CHOP `lfo1` inside `geo1` with *Frequency* **0.02**, *Amplitude* **0.2** and *Offset* **0.8**. Set the first component of **uABC** to the expression `op(\'lfo1\')[\'chan1\']`. Over 50 seconds the attractor tightens, opens and refolds. Because the particles are already on the attractor, they follow the change smoothly instead of restarting.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does the Feedback POP contribute to this network?',
          options: [
            'It smooths the motion between frames',
            'It hands the target POP\'s output from the previous frame back to the top of the chain, so positions persist',
            'It runs the shader several times per frame',
            'It stores the trail history',
          ],
          answer: 1,
          explain: 'Without it, every frame would start again from the seeds. With it, the GLSL POP always advances last frame\'s positions.',
        },
        {
          q: 'The animation is too slow. What\'s the safest way to speed it up?',
          options: ['Multiply `dt` by 10', 'Increase `uSteps`', 'Lower the frame rate', 'Turn on Initialize Output Attributes'],
          answer: 1,
          explain: 'More fixed-size substeps cover more simulated time while keeping each step accurate. A large `dt` makes chaotic systems blow up.',
        },
        {
          q: 'Why is the Transform POP placed after the Trail POP and outside the loop?',
          options: [
            'Transform POPs can\'t be inside feedback loops',
            'Inside the loop its rotation and scale would be applied again every frame and compound',
            'It makes the trails longer',
            'The Line MAT requires it',
          ],
          answer: 1,
          explain: 'Everything inside a feedback loop acts on its own output each frame. Display transforms belong after the loop.',
        },
        {
          q: 'With a constant point count, what does *Connectivity* **Columns** on the Trail POP connect?',
          options: [
            'All particles of the current frame into one line',
            'Each particle\'s positions through time into its own line strip',
            'Random pairs of particles',
            'Nothing, Columns removes primitives',
          ],
          answer: 1,
          explain: 'The Trail POP stacks frames as a new dimension: particles along one axis, time along the other. Columns run through time.',
        },
        {
          q: 'What is the safety-net check at the end of the shader for?',
          options: [
            'Respawning particles that escaped or became NaN so they don\'t corrupt the rest of the system',
            'Deleting particles that are too slow',
            'Preventing compile errors',
            'Clamping colors',
          ],
          answer: 0,
          explain: 'Chaotic systems occasionally fling a point off to infinity. Detecting it and respawning keeps the simulation healthy indefinitely.',
        },
      ],
    },
  ],
};

export default lesson;
