import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'feedback-and-trails',
  title: 'Feedback Loops & Trails',
  subtitle: 'Write your own simulation step, keep it stable, and let thousands of seeds draw glowing lines through a curl-noise flow.',
  minutes: 45,
  summary:
    'The [[Feedback POP]] gives geometry a memory of last frame, so you can write your own update rule: advect seeds through a curl-noise field with a Math Mix `P += v · dt`, keep it stable, then turn each seed\'s recent history into a tapered, glowing line with the [[Trail POP]]. Finish with the [[Time Filter POP]] for smoothing jittery data.',
  objectives: [
    'Build a Feedback POP loop with a *Target POP*, and run it with Initialize / Start',
    'Write explicit integration in a [[Math Mix POP]] using `_StepSeconds` for frame-rate-independent motion',
    'Keep a hand-built simulation stable: clamped time step, bounded velocities, a restoring force',
    'Turn point histories into line strips with the [[Trail POP]] (length in seconds, connectivity, Age, Match by Attribute)',
    'Smooth noisy point data over time with the [[Time Filter POP]]',
  ],
  requires: ['particles'],
  tags: ['feedback', 'simulation', 'trails', 'curl noise', 'lines'],
  blocks: [
    {
      kind: 'md',
      md: `
Scatter iron filings on paper over a magnet and you *see* the field. Drop ink into moving water and every drop draws the current. This lesson builds the digital version: a few thousand seed points pushed through an invisible, slowly evolving flow, each one leaving a glowing line behind it. The result looks drawn by hand — a flow-field drawing that never repeats.

The Particle POP from the last lesson did the physics for you. Here you write the physics yourself. That's the more important skill: once you can express "next frame = this frame + a small change", you can build flocking, growth, erosion, reaction-diffusion and anything else that evolves.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The Feedback POP: one frame of memory',
      md: `A normal POP chain is a pure function: same input, same output, every frame. The [[Feedback POP]] breaks that on purpose. It outputs **the result of a target POP from the previous frame**, so the chain below it operates on its own last result:

\`\`\`
frame 1:  input ──► feedback1 ──► (your rule) ──► loop_end
frame 2:  loop_end@1 ──► feedback1 ──► (your rule) ──► loop_end
frame 3:  loop_end@2 ──► ...
\`\`\`

* **Initialize** snapshots the input as the starting state and waits (*ready*). **Start** runs the loop. Start alone does both.
* **Pre-Roll** runs that many seconds of the loop during Initialize.
* **Play** off pauses; **Go to Done** stops until the next Initialize.
* An [[Info CHOP]] on the Feedback POP shows \`initializing\`, \`ready\`, \`running\`, \`done\` and timer channels.

Everything between \`feedback1\` and its *Target POP* is **the rule** your geometry obeys, applied once per frame.`,
    },
    {
      kind: 'md',
      md: `
## Writing your own integration

To move a point through a velocity field, you need one line of physics — explicit (Euler) integration:

\`P_next = P + v · dt\`

\`v\` is a velocity in units per second, \`dt\` the time since the last frame in seconds. Multiplying by \`dt\` is what makes motion **frame-rate independent**: at 60 fps each step is short, at 30 fps each step is twice as long, and a point covers the same distance per second either way. In POPs, \`dt\` is the built-in \`_StepSeconds\`, found under **>** in the attribute menus of Math Mix and its relatives.

Where does \`v\` come from? A **curl-noise field**. Instead of writing the curl into \`PartForce\` like last lesson, we ask the [[Noise POP]] to output it as an attribute, \`NoiseCurl\`, and treat it directly as velocity. No mass, no momentum — every seed simply follows the flow, which is exactly what gives flow-field drawings their clean, combed look.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'flow-field',
        title: 'Flow-field drawing',
        root: '/project1',
        height: 580,
        caption:
          'Inside **geo1**, the top row is the loop: `feedback1` outputs `loop_end` from the previous frame. The bottom row records history with the Trail POP and styles it for render — it reads the loop but never feeds back into it.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 4' }, 0],
              Material: { ref: '../linemat1' },
            },
            note: 'A slow turntable rotation shows off that these are true 3D lines, not a screen-space effect.',
            children: [
              {
                id: 'pointgenerator1',
                type: 'pointgeneratorPOP',
                x: 0,
                y: 0,
                params: { Shape: 'Sphere', Distribution: 'Volume', 'Number of Points': 3000, Random: true },
                note: 'The seeds: 3000 random points filling a sphere. This is only the *starting* state — the Feedback POP snapshots it on Initialize.',
              },
              {
                id: 'feedback1',
                type: 'feedbackPOP',
                x: 1,
                y: 0,
                inputs: ['pointgenerator1'],
                params: { 'Target POP': { ref: 'loop_end' } },
                note: 'Outputs `loop_end` as it was last frame. On Initialize it outputs the seeds instead.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 2,
                y: 0,
                inputs: ['feedback1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.5,
                  Amplitude: 0.25,
                  'Translate 4D': { expr: 'absTime.seconds * 0.05' },
                  'Curl 3D': true,
                  'Output:Combine Operation': 'None',
                },
                note: 'The velocity field. With *Combine Operation* **None** the noise leaves `P` alone; the *Curl 3D* toggle writes the field\'s curl at each point into a new float3 attribute, `NoiseCurl`. A slow *Translate 4D* lets the flow evolve so the drawing never settles.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 3,
                y: 0,
                inputs: ['noise1'],
                params: {
                  'Operation[0]': 'clamp(A, B, C)',
                  'Scope A[0]': '_StepSeconds',
                  'Scope B[0]': '0',
                  'Scope C[0]': '0.05',
                  'Result Scope[0]': 'dt',
                  'Operation[1]': 'A + B * C',
                  'Scope A[1]': 'NoiseCurl',
                  'Scope B[1]': 'P',
                  'Scope C[1]': '-0.4',
                  'Result Scope[1]': 'vel',
                  'Operation[2]': 'A + B * C',
                  'Scope A[2]': 'P',
                  'Scope B[2]': 'vel',
                  'Scope C[2]': 'dt',
                  'Result Scope[2]': 'P',
                },
                note: 'The rule, in three lines: a time step clamped to at most 0.05 s, a velocity made of the curl plus a gentle pull toward the origin (`−0.4 · P`), and the Euler step `P = P + vel · dt`.',
              },
              {
                id: 'loop_end',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['mathmix1'],
                note: 'The target. Whatever arrives here becomes next frame\'s input to the rule.',
              },
              {
                id: 'trail1',
                type: 'trailPOP',
                x: 4,
                y: 1,
                inputs: ['loop_end'],
                params: { 'Trail Length': 1.5, 'Age Attribute': 'Seconds', Connectivity: 'Columns' },
                note: 'Records the last 1.5 seconds of every seed as slices, tags each slice with an `Age` in seconds, and connects each seed through time into one line strip. Set the *Trail Length* unit to seconds.',
              },
              {
                id: 'mathmix2',
                type: 'mathmixPOP',
                x: 5,
                y: 1,
                inputs: ['trail1'],
                params: {
                  'Operation[0]': 'A / B',
                  'Scope A[0]': 'Age',
                  'Scope B[0]': '1.5',
                  'Result Scope[0]': 'agen',
                  'Operation[1]': 'B - A',
                  'Scope A[1]': 'agen',
                  'Scope B[1]': '1',
                  'Result Scope[1]': 'LineWidth',
                },
                note: '`agen` is age normalized by the trail length: 0 at the head, 1 at the tail. `LineWidth = 1 − agen` tapers every line to a point.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 6,
                y: 1,
                inputs: ['mathmix2'],
                params: {
                  TOP: { ref: '../ramp1' },
                  'Lookup Index Attribute U': 'agen',
                  'Lookup Index Attribute V': 'agen',
                  'Output Attribute Scope': 'Color',
                },
                note: 'Head-to-tail color from the ramp.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 7,
                y: 1,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'Render flags here — outside the loop.',
              },
            ],
            childComments: [
              { x: 1, y: -0.75, w: 3, text: 'The rule: feedback1 → field → integrate → loop_end ⟲' },
              { x: 4, y: 1.85, w: 3, text: 'History + style (never fed back)' },
            ],
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 1,
            y: 1.2,
            params: { Type: 'Horizontal' },
            note: 'Left = trail head, right = tail. Try bright cyan → violet → black; the black end fades tails out under additive blending.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0, 4.5] },
            note: 'Frames the unit sphere of seeds with a little room.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 2,
            y: 1.2,
            params: {
              'Draw Lines': true,
              'Draw Points': false,
              'Width Near': 1.5,
              'Line Width Attribute': 'LineWidth',
              'Line Color Attribute': 'Color',
              'Blending (Transparency)': true,
              'Destination Color *': 'One',
              'Write Depth Values': false,
            },
            note: 'Thick, camera-facing strokes whose width and color come from the POP attributes. Additive blending (Common page) makes crossing lines brighten each other, like light trails in a long exposure.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '8x (Medium)',
              'Background Color': [0, 0, 0, 1],
            },
            note: 'Thin lines alias badly, so this render uses more anti-aliasing than usual.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 0,
            inputs: ['render1'],
            note: 'A soft halo where many lines overlap.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 0,
            inputs: ['bloom1'],
            note: 'Final image.',
          },
        ],
        steps: [
          {
            title: 'Seeds',
            body: `Create a **Geometry COMP** \`geo1\` and clear it. Inside, add a **Point Generator POP** \`pointgenerator1\`: *Shape* **Sphere**, *Distribution* **Volume**, *Number of Points* **3000**, *Random* on.`,
            nodes: ['geo1', 'pointgenerator1'],
          },
          {
            title: 'An empty loop',
            body: `Append a **Feedback POP** \`feedback1\` and, after it, a **Null POP** \`loop_end\`. Set \`feedback1\`'s *Target POP* to \`loop_end\`.

Pulse **Initialize**, then **Start**. Nothing moves — the rule is empty, so every frame equals the last. That's a feedback loop working correctly.`,
            nodes: ['feedback1', 'loop_end'],
            focus: ['feedback1'],
          },
          {
            title: 'A velocity field',
            body: `Insert a **Noise POP** \`noise1\` between \`feedback1\` and \`loop_end\`. Set *Type* **Simplex 4D (GPU)**, *Period* **1.5**, *Amplitude* **0.25**, and *Translate 4D* to the expression \`absTime.seconds * 0.05\`.

On the **Output** page set *Combine Operation* to **None** and turn on **Curl 3D**. Middle-click: the points haven't moved, but each now carries a float3 \`NoiseCurl\`.`,
            nodes: ['noise1'],
          },
          {
            title: 'Integrate',
            body: `Insert a **Math Mix POP** \`mathmix1\` after \`noise1\` with three Combine blocks:

1. **clamp(A, B, C)** — \`_StepSeconds\`, \`0\`, \`0.05\` → \`dt\`
2. **A + B * C** — \`NoiseCurl\`, \`P\`, \`-0.4\` → \`vel\`
3. **A + B * C** — \`P\`, \`vel\`, \`dt\` → \`P\`

The seeds start to flow. Pulse *Initialize* to snap them back to the sphere and *Start* to run again — you'll do this a lot while tuning.

Speed is set by \`noise1\`: the curl's strength grows with *Amplitude* and shrinks with *Period*. If seeds race across the whole sphere in a second, lower *Amplitude*; if they barely creep, raise it. Aim for each seed travelling roughly a third of the sphere in the 1.5 s the trail will show.`,
            nodes: ['mathmix1'],
          },
          {
            title: 'Record the history',
            body: `Branch a **Trail POP** \`trail1\` off \`loop_end\`: *Trail Length* **1.5** with its unit set to seconds, *Age Attribute* **Seconds**, *Connectivity* **Columns**.

Its viewer shows 3000 curving strands. Middle-click it: the dimension now has a second entry — the number of stored slices — and each slice carries an \`Age\`.`,
            nodes: ['trail1'],
          },
          {
            title: 'Taper and color',
            body: `In \`/project1\` make a **Ramp TOP** \`ramp1\` (*Type* **Horizontal**), bright on the left, black on the right.

In \`geo1\` append a **Math Mix POP** \`mathmix2\` to \`trail1\`: **A / B** — \`Age\`, \`1.5\` → \`agen\`; **B - A** — \`agen\`, \`1\` → \`LineWidth\`. Then a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`../ramp1\`, *U* and *V* \`agen\`, output \`Color\`.`,
            nodes: ['ramp1', 'mathmix2', 'lookuptex1'],
          },
          {
            title: 'Lines that glow',
            body: `Finish the branch with a **Null POP** \`null1\` (display + render flags).

In \`/project1\`: a **Camera COMP** \`cam1\` at **0, 0, 4.5**, and a **Line MAT** \`linemat1\` with *Draw Lines* on, *Draw Points* off, *Width Near* **1.5**, *Line Width Attribute* \`LineWidth\`, *Line Color Attribute* \`Color\`, and on the Common page *Blending (Transparency)* on, *Destination Color* **One**, *Write Depth Values* off. Assign it to \`geo1\` and give \`geo1\` a *Rotate Y* of \`absTime.seconds * 4\`.`,
            nodes: ['null1', 'cam1', 'linemat1'],
            focus: ['geo1'],
          },
          {
            title: 'Render',
            body: `Add a **Render TOP** \`render1\` (camera \`cam1\`, geometry \`geo1\`, *Anti-Alias* **8x (Medium)**, black background), a **Bloom TOP** \`bloom1\` and a **Null TOP** \`out1\`.

Initialize and Start. The seeds comb themselves into flowing bundles of light that slowly reorganize as the field drifts.`,
            nodes: ['render1', 'bloom1', 'out1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Keeping a hand-built simulation stable

A feedback loop amplifies whatever you give it, sixty times a second. Small mistakes compound into points that vanish to infinity or collapse into a dot. The three blocks in \`mathmix1\` each guard against one failure:

**A clamped time step.** \`_StepSeconds\` is normally about 1/60. But when TouchDesigner hitches — loading a file, opening a big viewer — one frame can take a quarter of a second, and \`P + vel · 0.25\` flings points across the scene. Clamping \`dt\` to 0.05 s means a dropped frame slows the motion briefly instead of breaking it.

**Bounded velocities.** Curl noise is a good velocity source partly because it's bounded — its magnitude depends on *Amplitude* and *Period*, not on where the point is. Anything that grows with itself (\`vel = vel · 1.01\` every frame, say) grows exponentially, however small the factor looks.

**A restoring force.** Even a bounded flow lets points wander away for good. The \`P · −0.4\` term is a spring toward the origin: negligible near the center, stronger the further a point strays. It keeps the drawing in frame without visibly fighting the flow. Make it stronger and the cloud tightens into a ball; set it to 0 and watch the seeds slowly disperse.

And one property comes for free: because the curl field never converges, the seeds stay evenly spread instead of collecting in a few streams — the drawing stays full.

If something does blow up: **Initialize** resets to the seeds. While debugging, turn **Play** off and step frame by frame, middle-clicking \`loop_end\` to watch the numbers.

## The Trail POP, slice by slice

The Trail POP keeps the last *Trail Length* of its input as **slices** — one copy of all the points per frame (or every Nth frame with *Trail Increment*). Express the length in **seconds** so the trail looks the same at any frame rate.

When the point count is constant, as here, the output is a clean grid: the input's points along one dimension, slices along a new one — 3000 seeds × about 90 slices at 60 fps. *Connectivity* decides which way to draw lines through that grid. **Columns** follows each seed through the slices, one line strip per seed. **Rows** would instead join all 3000 seeds as they were at one instant — a meaningless scribble here, but exactly what you want for stacked contours like the spectrogram tunnel in the audio lesson. If you ever see lines jumping between seeds, you've got the other one.

A few more parameters worth knowing:

* **Age Attribute** — tags each slice with how old it is (seconds or frames). The key to tapering and fading.
* **Oldest Point First** — reverses the order along each strip, useful when something downstream expects the tail first.
* **Fill Missed Frames** — interpolates stand-in slices when frames drop, so trails stay smooth.
* **Match by Attribute** — for systems whose point count changes (particles!). Points are matched across frames by an id such as \`PartId\` instead of by index; set *Attrib is UInt* to a range that covers your largest id and *Max Number of Line Strips* above your live particle count.

Memory and drawing cost scale with **points × slices**. Doubling the trail length doubles both; *Trail Increment* trades smoothness for memory.
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Trail POP (geometry)',
        md: 'Real 3D lines: orbit the camera and the trails stay put in space. Per-trail width and color, exact length in seconds. Cost grows with points × history.',
      },
      right: {
        title: 'Feedback TOP (image)',
        md: 'Fade the previous frame and draw on top: cheap, unlimited history, painterly. But it lives in screen space, so any camera move smears the whole picture.',
      },
    },
    {
      kind: 'md',
      md: `
## Smoothing over time: the Time Filter POP

Feedback accumulates; sometimes you need the opposite — calming data that changes too much from frame to frame. Tracked bodies, depth cameras, audio-driven points and anything sampled from noisy sensors all jitter. The [[Time Filter POP]] is the POP equivalent of the Filter and Lag CHOPs, applied per point and per attribute:

* **Gaussian, Triangle, Box** average each attribute over the last *Filter Width* of time. Smooth and predictable, but they always trail the real value — Box by about half the window, Gaussian and Triangle a little less, because they weight recent values more.
* **One Euro** adapts: heavy smoothing when a value moves slowly (killing jitter), light smoothing when it moves fast (killing lag). Tune it with *Speed Coefficient* at 0 first: lower *Cutoff Frequency* until slow movement is steady, then raise *Speed Coefficient* until fast movement keeps up.
* The **Lag** page adds asymmetric rise/fall lag and overshoot, like the Lag CHOP.

It matches points by index by default; with *Match by Attribute* and \`PartId\` it can smooth particles whose count and order change every frame.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'jitter-smoother',
        title: 'Calming a jittery cloud',
        root: '/project1',
        height: 320,
        caption:
          'A grid with slow, intentional motion (`noise2`) plus fresh random jitter every frame (`random2`) — a stand-in for a noisy sensor. `timefilter1` keeps the motion and drops the jitter. Toggle its bypass flag to compare.',
        nodes: [
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../linemat2' } },
            note: 'A separate little test bed.',
            children: [
              {
                id: 'grid2',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: { Connectivity: 'Point Primitives', Columns: 40, Rows: 40 },
                note: '1600 points in a plane.',
              },
              {
                id: 'noise2',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['grid2'],
                params: { Type: 'Simplex 4D (GPU)', Amplitude: 0.2, 'Translate 4D': { expr: 'absTime.seconds * 0.3' } },
                note: 'The motion we want to keep: a slow, smooth undulation.',
              },
              {
                id: 'random2',
                type: 'randomPOP',
                x: 2,
                y: 0,
                inputs: ['noise2'],
                params: {
                  Type: 'Inside Sphere',
                  Seed: { expr: 'absTime.frame' },
                  Amplitude: 0.03,
                  'Random:Combine Operation': 'Add',
                  'Combine Attribute Scope': 'P',
                  'Output Attribute Scope': 'P',
                },
                note: 'The jitter we want to remove. A new seed every frame gives every point a new random offset every frame — just like sensor noise.',
              },
              {
                id: 'timefilter1',
                type: 'timefilterPOP',
                x: 3,
                y: 0,
                inputs: ['random2'],
                params: { 'Input Attributes': 'P', Type: 'Gaussian', 'Filter Width': 0.25 },
                note: 'Averages each point\'s `P` over the last quarter second (set the width unit to seconds). Wider = calmer but laggier; try **One Euro** for the adaptive version.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['timefilter1'],
                flags: { display: true, render: true },
                note: 'Smoothed result.',
              },
            ],
          },
          {
            id: 'linemat2',
            type: 'lineMAT',
            x: 1,
            y: 0,
            params: { 'Draw Points': true, 'Width Near': 2 },
            note: 'Plain dots, to judge the motion.',
          },
        ],
        steps: [
          {
            title: 'Motion worth keeping',
            body: `In a new Geometry COMP \`geo2\`, add a **Grid POP** \`grid2\` (*Connectivity* **Point Primitives**, 40 × 40) and a **Noise POP** \`noise2\` (*Type* **Simplex 4D (GPU)**, *Amplitude* **0.2**, *Translate 4D* \`absTime.seconds * 0.3\`). A gentle, smooth wave.`,
            nodes: ['geo2', 'grid2', 'noise2'],
          },
          {
            title: 'Add sensor noise',
            body: `Append a **Random POP** \`random2\`: *Type* **Inside Sphere**, *Seed* as the expression \`absTime.frame\`, *Amplitude* **0.03**, *Combine Operation* **Add**, *Combine Attribute Scope* and *Output Attribute Scope* \`P\`. Render it with a **Line MAT** \`linemat2\` drawing points (assign it to \`geo2\`). The wave now buzzes.`,
            nodes: ['random2', 'linemat2'],
          },
          {
            title: 'Filter it',
            body: `Append a **Time Filter POP** \`timefilter1\`: *Input Attributes* \`P\`, *Type* **Gaussian**, *Filter Width* **0.25** seconds. End with a **Null POP** \`null2\` carrying the flags.

The buzz is gone and the undulation remains, slightly delayed. Switch *Type* to **One Euro** and tune it as described above to win back the responsiveness.`,
            nodes: ['timefilter1', 'null2'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Budgeting trails',
      md: '3000 seeds × 90 slices is 270 000 points of line strips — fine on most GPUs, but each extra second of trail adds another 180 000. Scale seeds, length and *Trail Increment* together, and watch the Trail POP\'s cook time. The loop itself (noise + math on 3000 points) is nearly free.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* **Seed shapes**: emit from a Text POP or a Circle POP, so the drawing starts as a word or ring and unravels.
* **Pressure**: make \`LineWidth\` depend on speed — \`length(vel)\` in a Math Mix block — so fast strokes go thin and slow ones pool.
* **Two fields**: add a second Noise POP with a big *Period* and blend its curl into \`vel\` for large, slow currents carrying small eddies.
* **Freeze frames**: animate *Play* with an LFO so the drawing pauses and resumes in rhythm.`,
    },
    {
      kind: 'challenge',
      title: 'Ember trails',
      md: 'Give the particle system from the previous lesson glowing trails. The catch: particles are born and die every frame, so the point count and order keep changing.',
      hints: [
        'The Trail POP can follow points by id instead of by index.',
        'The Particle POP gives every particle a `PartId` that stays with it for life.',
      ],
      solution:
        'Branch a **Trail POP** off `loop_end` in the particle network. Turn on **Match by Attribute** with *Attribute Name* `PartId`, pick an *Attrib is UInt* range that covers your largest id (the Particle POP\'s *Point Id Reuse* mode decides how large ids get), and set **Max Number of Line Strips** above your peak population (birth rate × lifespan, plus headroom). Keep the trail short (0.3–0.5 s): with 16 000 particles, every 0.1 s of trail adds roughly 100 000 points at 60 fps. Then style it exactly like this lesson\'s branch, using `Age` for taper and color.',
    },
    {
      kind: 'challenge',
      title: 'A wandering center',
      md: 'Right now the restoring force pulls toward the origin. Make the whole drawing follow a slowly wandering center driven by a CHOP.',
      hints: [
        'The pull term is `−0.4 · P`, which is `0.4 · (0 − P)`. Generalize it to `0.4 · (center − P)`.',
        'Math Mix\'s *Uniforms* page can declare a named float3 whose value comes from expressions.',
      ],
      solution:
        "Create a **Noise CHOP** with three channels (tx, ty, tz) and a slow period, ending in a Null CHOP `wander`. In `mathmix1` → *Uniforms*, add a Vector named `center`, type **float3**, with its three *Value* fields set to `op('/project1/wander')['tx']`, `['ty']`, `['tz']`. Insert a block before the velocity block: **A - B** — `center`, `P` → `pull`. Change the velocity block to **A + B * C** — `NoiseCurl`, `pull`, `0.4` → `vel`. The cloud now drifts after the CHOP, with streaks bending as it changes direction.",
    },
    {
      kind: 'challenge',
      title: 'Plotter mode',
      md: 'Make a flat, pen-plotter-style drawing: seeds on a plane, flowing only within that plane.',
      hints: [
        'The Noise POP can output a 2D curl as well as a 3D one.',
        'Integrate only `P.xy` and leave `P.z` alone.',
      ],
      solution:
        'Change the seeds to a **Point Generator POP** with *Shape* **Rectangle** and *Orientation* **XY Plane (Z axis)** (or a Grid POP), so every seed starts at z = 0. On `noise1` turn off *Curl 3D* and turn on **Curl 2D**, which writes a float2 `NoiseCurl2`. In `mathmix1`, use `NoiseCurl2` and `P.xy` in the velocity block (result `vel`, now a float2) and integrate with **A + B * C** — `P.xy`, `vel`, `dt` → `P.xy`. Point the camera straight at the plane; with long trails, a white background and dark lines (drop the additive blending), it reads like ink.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does a Feedback POP output while its loop is running?',
          options: [
            'Its input, unchanged',
            'The result of its *Target POP* from the previous frame',
            'The average of all previous frames',
            'The target POP\'s current-frame result',
          ],
          answer: 1,
          explain: 'It delays the target by one cook, so the chain below it operates on its own previous result.',
        },
        {
          q: 'Why multiply velocity by `_StepSeconds` instead of a fixed number like 0.016?',
          options: [
            'It cooks faster',
            'So motion per second stays the same whatever the frame rate',
            'Math Mix can\'t multiply by constants',
            'It prevents the curl noise from changing',
          ],
          answer: 1,
          explain: '`_StepSeconds` is the real time since the last cook, so slower frames take proportionally bigger steps.',
        },
        {
          q: 'Your trails jump between different seeds instead of following each seed. What is the likely fix?',
          options: [
            'Increase Trail Length',
            'Switch Connectivity between Rows and Columns',
            'Turn on Fill Missed Frames',
            'Lower the Noise period',
          ],
          answer: 1,
          explain: 'One choice connects each point through the slices (a trail), the other connects all points within one slice (a snapshot).',
        },
        {
          q: 'Particles change count every frame. What lets the Trail POP or Time Filter POP follow each one?',
          options: ['Oldest Point First', 'Match by Attribute with `PartId`', 'A larger Filter Width', 'Trail Increment'],
          answer: 1,
          explain: 'An id that stays with each particle for life lets them match points across frames regardless of index.',
        },
        {
          q: 'A single slow frame sends all your seeds flying off-screen. Which safeguard addresses exactly that?',
          options: ['A restoring force', 'Clamping the time step', 'Curl instead of plain noise', 'Additive blending'],
          answer: 1,
          explain: 'A hitch produces one huge `_StepSeconds`; clamping it caps how far any point can move in one step.',
        },
      ],
    },
  ],
};

export default lesson;
