import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'performance',
  title: 'Performance & Profiling',
  subtitle: 'Measure first, then make it fast: frame budgets, CPU vs GPU time, POP memory and the stalls that eat your frame rate.',
  minutes: 50,
  summary:
    'Build a reusable profiling rig from the [[Perform CHOP]], [[Info CHOP]]s and a little Python, learn to read CPU and GPU time separately, then fix the classic POP costs: over-allocation, GPU→CPU stalls, copying instead of instancing, and oversized render targets.',
  objectives: [
    'Think in milliseconds per frame and identify whether the CPU or the GPU is the bottleneck',
    'Build a profiling rig with the [[Perform CHOP]], [[Info CHOP]]s and an [[Execute DAT]]',
    'Explain POP memory references, indirect POPs and when to use the [[Topology POP]]',
    'Avoid GPU→CPU stalls with *Next frame* downloads and `delayed=True`',
    'Choose between instancing and the [[Copy POP]], and size render targets and pixel formats deliberately',
  ],
  requires: ['first-pop-network', 'instancing', 'particles'],
  tags: ['performance', 'profiling', 'gpu', 'memory', 'production'],
  blocks: [
    {
      kind: 'md',
      md: `
Every project eventually runs beautifully on your desk and then stutters on the projector: bigger output, louder song, twice the particles. Optimizing at that point is guesswork unless you have numbers.

This lesson gives you the numbers. You'll build a **profiling rig** you can paste into any project, learn to tell CPU time from GPU time, and then work through the costs specific to POP projects: what POPs allocate, which ones over-allocate, which innocent nodes make the CPU wait for the GPU, and how render settings multiply everything. The rule throughout: **measure, change one thing, measure again.**
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The frame budget',
      md: `A frame rate is a time limit. Everything TouchDesigner does for one frame — cooking CHOPs and DATs, running Python, setting up and running GPU work, drawing the output — has to fit inside it.

| Target | Budget per frame |
|---|---|
| 30 fps | 33.3 ms |
| 60 fps | 16.7 ms |
| 120 fps | 8.3 ms |

Think in **milliseconds, not fps**. "We dropped from 60 to 50 fps" hides the useful fact: you are about 3.3 ms over budget, and that is the amount you need to find.`,
    },
    {
      kind: 'md',
      md: `
## Two processors, one frame

The **CPU** cooks the network: expressions, CHOPs, DATs, Python, and the *preparation* of GPU work. The **GPU** executes that work: POP compute shaders, TOP pixel shaders, the Render TOP's drawing. They run as a pipeline — while the GPU works on one batch, the CPU prepares the next — so the slower of the two sets your frame rate. Speeding up the faster one changes nothing. Two quick tests tell you which side you're on:

* **Resolution test.** Drop your render and post TOPs to a tiny resolution for a moment. If frame time falls sharply, you were GPU-bound on pixels.
* **CPU-load test.** Add a [[Hog CHOP]], which deliberately burns CPU time. If the frame rate drops at once, the CPU was already the limit.

## Nothing cooks unless something asks

TouchDesigner is a *pull* system: an operator cooks only when something downstream wants its data and it has a reason to (changed inputs or parameters, or time dependence). Outputs pull — Window COMPs, visible panels, out-devices — and so does **every open node viewer**. So close viewers you aren't using, and remember that a branch nobody requests costs nothing. A component's **Cooking flag** (\`allowCooking\` in Python) goes further: switched off, its contents keep their memory but cook not at all — ideal for a scene you'll need later in the show.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'profiling-rig',
        title: 'Profiling rig',
        root: '/project1',
        height: 560,
        caption:
          'The rig watches three names — `geo1`, `render1`, `out1` — so it drops into almost any project. Read numbers from **stats**; **trail1** shows recent frame time; **hud** is a monitoring copy of the output.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            note: 'Whatever you are profiling — lesson 1.1\'s noise blob, a particle system. The rig only needs its name.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 1,
            y: 0,
            note: 'Your scene\'s Render TOP: we read its CPU time, GPU time and texture memory.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 2,
            y: 0,
            inputs: ['render1'],
            note: 'The image sent to the show output. The HUD is a separate copy, so numbers never leak into it.',
          },
          {
            id: 'hud',
            type: 'textTOP',
            x: 3,
            y: 0,
            inputs: ['out1'],
            params: {
              Text: { expr: "'{:.2f} ms   {:.0f} fps'.format(op('stats')['msec'].eval(), op('stats')['fps'].eval())" },
              'Combine with Input': 'Composite and Set Resolution',
              'Background Alpha': 0,
            },
            note: 'Burns frame time and fps over the image for a rehearsal monitor. `.eval()` turns channels into plain floats for `format()`.',
          },
          {
            id: 'perform1',
            type: 'performCHOP',
            x: 0,
            y: 1.4,
            params: {
              'Frames per Second': true,
              'Frame Time': true,
              'Dropped Frames': true,
              'GPU Mem Used (MB)': true,
            },
            note: 'Whole-process health: fps, milliseconds per frame, dropped frames, GPU memory in use. Only turn on what you read.',
          },
          {
            id: 'info_geo',
            type: 'infoCHOP',
            x: 0,
            y: 2.4,
            params: {
              Operator: { ref: 'geo1' },
              'Info:Scope': 'children_cpu_cook_time',
              'Children Cook Time': true,
            },
            note: '*Children Cook Time* adds `children_cpu_cook_time`, the summed CPU time of everything inside `geo1`. Summing costs time too — aim it at a component, not `/project1`.',
          },
          {
            id: 'info_render',
            type: 'infoCHOP',
            x: 0,
            y: 3.4,
            params: {
              Operator: { ref: 'render1' },
              'Info:Scope': 'cook_time gpu_memory_used',
            },
            note: '`cook_time` is the Render TOP\'s **CPU** time (preparing draw calls); `gpu_memory_used` is its texture memory.',
          },
          {
            id: 'gputime',
            type: 'constantCHOP',
            x: 0,
            y: 4.4,
            params: {
              'Name[0]': 'geo_gpu_ms',
              'Name[1]': 'render_gpu_ms',
            },
            note: 'Holds the GPU times, written every frame by `gpu_exec`.',
          },
          {
            id: 'gpu_exec',
            type: 'executeDAT',
            x: 1,
            y: 5.2,
            params: { 'Frame End': true },
            code: {
              lang: 'python',
              text: `# Runs at the end of every frame (Frame End is on).
# GPU times are Python members, not Info CHOP channels,
# so we copy them into the gputime Constant CHOP.

def onFrameEnd(frame):
    holder = op('gputime').par
    holder.const0value = op('geo1').childrenGPUCookTime
    holder.const1value = op('render1').gpuCookTime
    return
`,
            },
            note: '`childrenGPUCookTime` sums the GPU work inside `geo1`; `gpuCookTime` is the Render TOP\'s own. `const0value`/`const1value` are *Value* in blocks 0 and 1.',
          },
          {
            id: 'merge1',
            type: 'mergeCHOP',
            x: 1,
            y: 2.9,
            inputs: ['perform1', 'info_geo', 'info_render', 'gputime'],
            note: 'All the numbers in one CHOP; no names collide.',
          },
          {
            id: 'stats',
            type: 'nullCHOP',
            x: 2,
            y: 2.9,
            inputs: ['merge1'],
            note: 'The one node everything reads from, so the rig behind it can change freely.',
          },
          {
            id: 'frametime',
            type: 'selectCHOP',
            x: 3,
            y: 3.7,
            params: { CHOPs: { ref: 'stats' }, 'Channel Names': 'msec' },
            note: 'Just the frame time, so the trail isn\'t squashed by large values like megabytes.',
          },
          {
            id: 'trail1',
            type: 'trailCHOP',
            x: 4,
            y: 3.7,
            inputs: ['frametime'],
            note: 'Rolling frame-time history. A 40 ms spike every few seconds is invisible in an fps counter, obvious here.',
          },
        ],
        boxes: [
          { title: 'Scene under test', nodes: ['geo1', 'render1', 'out1', 'hud'], tone: 'gray' },
          { title: 'Collectors', nodes: ['perform1', 'info_geo', 'info_render', 'gputime', 'gpu_exec'], tone: 'green' },
          { title: 'Read & watch', nodes: ['merge1', 'stats', 'frametime', 'trail1'], tone: 'blue' },
        ],
        steps: [
          {
            title: 'The scene under test',
            body: `Open a project to profile — lesson 1.1's noise blob is a good start. The rig relies on three names: Geometry COMP \`geo1\`, Render TOP \`render1\` and Null TOP \`out1\`. Rename yours to match, or adjust the references. Middle-click \`render1\` and note its cook time: your first measurement.`,
            nodes: ['geo1', 'render1', 'out1'],
          },
          {
            title: 'Process health: the Perform CHOP',
            body: `Create a **Perform CHOP** \`perform1\` and turn on only **Frames per Second**, **Frame Time**, **Dropped Frames** and **GPU Mem Used (MB)**. Watch \`msec\` — the number to compare with your budget.`,
            nodes: ['perform1'],
          },
          {
            title: 'CPU time per operator: Info CHOPs',
            body: `Create an **Info CHOP** \`info_geo\`: *Operator* \`geo1\`, **Children Cook Time** on, *Scope* \`children_cpu_cook_time\`. A second one, \`info_render\`, points at \`render1\` with *Scope* \`cook_time gpu_memory_used\`.`,
            nodes: ['info_geo', 'info_render'],
          },
          {
            title: 'GPU time needs a line of Python',
            body: `GPU time is only available as Python members, so we copy it into a CHOP each frame. Create a **Constant CHOP** \`gputime\` with channels \`geo_gpu_ms\` and \`render_gpu_ms\`, and an **Execute DAT** \`gpu_exec\` with **Frame End** on and the code from the inspector.`,
            nodes: ['gputime', 'gpu_exec'],
          },
          {
            title: 'One place to read it all',
            body: `Merge \`perform1\`, \`info_geo\`, \`info_render\` and \`gputime\` with a **Merge CHOP** \`merge1\` and end in a **Null CHOP** \`stats\`: every number side by side.`,
            nodes: ['merge1', 'stats'],
          },
          {
            title: 'Watch for spikes',
            body: `A **Select CHOP** \`frametime\` (*CHOPs* \`stats\`, *Channel Names* \`msec\`) feeds a **Trail CHOP** \`trail1\` with a *Window Length* of about ten seconds. Aim for a steady line under budget; regular spikes usually mean something periodic — a timed script, a file read, a GPU download.`,
            nodes: ['frametime', 'trail1'],
          },
          {
            title: 'A heads-up display',
            body: `Wire \`out1\` into a **Text TOP** \`hud\`: *Combine with Input* on **Composite and Set Resolution** (*Output* page — the default), **Background Alpha** 0 (*Color* page), and *Text* as the expression from the inspector. View it in a floating viewer; delete it when done, since it cooks every frame.`,
            nodes: ['hud'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Reading the rig

Start with one question: **is \`msec\` over budget, and on which side?** If \`geo_gpu_ms\` + \`render_gpu_ms\` (plus post) approaches the budget, reduce work per point and per pixel. If the CPU numbers dominate — \`children_cpu_cook_time\`, Python, many CHOPs — reduce what cooks every frame.

For POPs and TOPs the **CPU cook time is only the set-up**; the real work shows up as GPU time. A POP chain can look free in CPU terms while eating most of the GPU budget. The middle-click popup shows both for one node; the rig shows both for the scene.

Two built-in tools complete the picture. **Probe** (Palette → *Tools*; toggle with <kbd>Ctrl</kbd>+<kbd>P</kbd>) draws your network coloured by CPU time, GPU time or memory — the fastest way to find *which* node is expensive. The **Performance Monitor** (*Dialogs*, <kbd>Alt</kbd>+<kbd>Y</kbd>) lists everything that cooked in a frame, in order; its *Frame Trigger* only reports frames slower than a threshold, perfect for a once-a-minute spike.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Measuring changes what you measure',
      md: 'Probe, *Children Cook Time* and the HUD all cost something. Profile with them, then switch them off before judging the final frame rate — keep the rig in its own Base COMP and turn its **Cooking flag** off for the show.',
    },
    {
      kind: 'md',
      md: `
## What POPs cost

### Memory: references, not copies

A POP allocates GPU memory only for attributes it **creates or modifies**; the rest are references to upstream buffers (\`(r)\` in the info popup). A long chain isn't expensive by itself — what each node *writes* is.

Do the arithmetic once: a million points of \`P\` (three 32-bit floats) is 12 MB. A [[Math POP]] rewriting \`P\` allocates another 12 MB; a new \`Color\` (four floats) 16 MB. A particle system reserves its attributes for **Maximum Particles**, alive or not: \`P\`, \`PartVel\` and \`PartForce\` at 12 bytes each plus age, lifespan, mass, drag and id at 4 bytes — over 50 bytes per particle before your own attributes. Size it to the piece, not to a round number with too many zeros.

### Indirect POPs and over-allocation

Some operations only know their output size after the GPU has run them: deleting by a condition ([[Delete POP]]), proximity searches, some facet and convert modes. Their info popup says **Point Count Info on GPU** and/or **Topology Info on GPU**. Such a POP allocates for the **maximum it could produce**, the POPs after it allocate that maximum too, and real counts travel through GPU buffers ("indirect dispatch"). Fast, but memory can balloon when a big indirect POP feeds a long chain. Your options:

* **Do nothing** when the chain is short — this is what indirect dispatch is for.
* Add a **[[Topology POP]]**. If you know an upper bound (say, at most half the points survive), set smaller maximums on its *Points* and *Topology* pages and everything downstream allocates less, with no stall. If you know the exact counts you can declare them, making it a regular POP again.
* Turn on **Copy Topology Info Back to CPU** (Delete POP and some others): exact allocation downstream, paid for with a GPU→CPU sync — the subject of the next section.

### GPU→CPU stalls

The GPU runs a little behind the CPU, which queues work and moves on. The moment the CPU *needs* POP data — a [[POP to CHOP]], a [[POP to DAT]], Python \`points()\`, even \`numPoints()\` on an indirect POP — it must wait for the GPU to finish everything queued, then download. The pipeline drains and the overlap that made the frame fit is gone. Accept one frame of latency instead:

* On POP to CHOP / POP to DAT, set **Download Type** to **Next frame (Fast)**.
* In Python, pass \`delayed=True\` to get last frame's result without waiting.
* If only GPU work needs the number (a bounding box, a maximum), compute it with the [[Analyze POP]] and never download it.
`,
    },
    {
      kind: 'code',
      lang: 'python',
      title: 'Reading POP data without stalling',
      code: `pop = op('geo1/null1')

# Stalls: the CPU waits for the GPU to finish, then downloads
count = pop.numPoints()
positions = pop.points('P')

# No stall: values from the previous frame, already on the CPU
count = pop.numPoints(delayed=True)
positions = pop.points('P', delayed=True)
bounds = pop.bounds(delayed=True)`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'copy-vs-instance',
        title: 'Before and after: copying vs instancing',
        root: '/project1',
        height: 540,
        caption:
          'Both draw a box on each of 90 000 noisy points. **geo_before** copies real geometry and leaves a GPU-downloading debug table; **geo_after** instances one box. Point `render1` at each and compare the rig.',
        nodes: [
          {
            id: 'geo_before',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: '../pbr1' },
            note: 'The naive version. Uses the material from lesson 1.1 (`pbr1`) — any lit material works.',
            children: [
              {
                id: 'grid_b',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: { Connectivity: 'None', Size: [4, 4], Columns: 300, Rows: 300 },
                note: '300 × 300 = 90 000 points and no primitives — we only need positions to place copies.',
              },
              {
                id: 'noise_b',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['grid_b'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1,
                  Amplitude: 0.15,
                  'Translate 4D': { expr: 'absTime.seconds * 0.2' },
                },
                note: 'Gentle, evolving displacement so the grid becomes a moving surface of points.',
              },
              {
                id: 'box_b',
                type: 'boxPOP',
                x: 1,
                y: 1,
                params: { Size: [0.012, 0.012, 0.012], Normal: 'Primitive' },
                note: 'The shape to stamp. *Primitive* normals give each face crisp, flat lighting.',
              },
              {
                id: 'copy_b',
                type: 'copyPOP',
                x: 2,
                y: 0,
                inputs: ['box_b', 'noise_b'],
                note: 'Input 0 is the shape, input 1 the template points. The result is real geometry, reallocated and recomputed every frame because the template moves.',
              },
              {
                id: 'null_b',
                type: 'nullPOP',
                x: 3,
                y: 0,
                inputs: ['copy_b'],
                flags: { display: true, render: true },
                note: 'Render and display flags. Middle-click it and look at the point count and memory.',
              },
            ],
          },
          {
            id: 'debug_b',
            type: 'poptoDAT',
            x: 0,
            y: 1.3,
            params: {
              POP: { ref: 'geo_before/noise_b' },
              'Download Type': 'Immediate (Slow)',
              'Thin Out Range': true,
              'Thin Range Length': 10,
            },
            note: 'The forgotten debugging table: even ten rows make the CPU wait for the GPU whenever something pulls on it. Use *Next frame (Fast)*, or delete it.',
          },
          {
            id: 'grid_a',
            type: 'gridPOP',
            x: 0,
            y: 2.6,
            params: { Connectivity: 'None', Size: [4, 4], Columns: 300, Rows: 300 },
            note: 'The same 90 000 points. These POPs live directly in `/project1`: they don\'t need to render, they only feed the instancer.',
          },
          {
            id: 'noise_a',
            type: 'noisePOP',
            x: 1,
            y: 2.6,
            inputs: ['grid_a'],
            params: {
              Type: 'Simplex 4D (GPU)',
              Period: 1,
              Amplitude: 0.15,
              'Translate 4D': { expr: 'absTime.seconds * 0.2' },
            },
            note: 'Identical to `noise_b`, so the two versions render the same image.',
          },
          {
            id: 'pts_a',
            type: 'nullPOP',
            x: 2,
            y: 2.6,
            inputs: ['noise_a'],
            note: 'A stable name for the instancer to read. No flags: it is data, not something to draw.',
          },
          {
            id: 'geo_after',
            type: 'geometryCOMP',
            x: 3,
            y: 2.6,
            params: {
              Material: '../pbr1',
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: '../pts_a' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
            },
            note: 'One box drawn once per point of `pts_a`: the GPU gets the box once plus a list of positions.',
            children: [
              {
                id: 'box_a',
                type: 'boxPOP',
                x: 0,
                y: 0,
                params: { Size: [0.012, 0.012, 0.012], Normal: 'Primitive' },
                flags: { display: true, render: true },
                note: 'The single shape being instanced. Its render flag is on; the instancer repeats it.',
              },
            ],
          },
        ],
        boxes: [
          { title: 'Before', nodes: ['geo_before', 'debug_b'], tone: 'orange' },
          { title: 'After', nodes: ['grid_a', 'noise_a', 'pts_a', 'geo_after'], tone: 'green' },
        ],
        steps: [
          {
            title: 'A dense point surface',
            body: `Create a Geometry COMP \`geo_before\` and set its *Material* to your lit material — \`../pbr1\` for the PBR MAT from lesson 1.1 (a COMP's own parameters look *inside* the COMP, so siblings need \`../\`). Inside, add a **Grid POP** \`grid_b\`: *Connectivity* **None**, *Size* **4, 4**, *Columns* and *Rows* **300**. Append a **Noise POP** \`noise_b\` with *Type* **Simplex 4D (GPU)**, *Period* **1**, *Amplitude* **0.15** and *Translate 4D* = \`absTime.seconds * 0.2\`.`,
            nodes: ['geo_before', 'grid_b', 'noise_b'],
          },
          {
            title: 'Stamp a box on every point',
            body: `Add a **Box POP** \`box_b\` (*Size* **0.012** on all axes, *Normal* **Primitive**) and a **Copy POP** \`copy_b\`. Wire the box into input 0 and \`noise_b\` into input 1. End with a **Null POP** \`null_b\` carrying the render and display flags.

Point \`render1\` at \`geo_before\` and read the rig. Middle-click \`null_b\` to see how much geometry the Copy POP made.`,
            nodes: ['box_b', 'copy_b', 'null_b'],
          },
          {
            title: 'The forgotten debug table',
            body: `Back in \`/project1\`, add a **POP to DAT** \`debug_b\` with *POP* = \`geo_before/noise_b\`, *Download Type* **Immediate (Slow)**, *Thin Out Range* on and *Thin Range Length* **10** — the kind of table you make while debugging and forget to delete.

Turn its viewer on and watch the trail; switch to **Next frame (Fast)** and compare; then delete it.`,
            nodes: ['debug_b'],
          },
          {
            title: 'The lean version: points only',
            body: `Directly in \`/project1\`, rebuild the points: **Grid POP** \`grid_a\` and **Noise POP** \`noise_a\` with exactly the same settings as before, ending in a **Null POP** \`pts_a\` with no flags.`,
            nodes: ['grid_a', 'noise_a', 'pts_a'],
          },
          {
            title: 'Instance one box',
            body: `Create a Geometry COMP \`geo_after\` (same *Material*). Inside, a **Box POP** \`box_a\` like \`box_b\`, with render and display flags on.

On \`geo_after\`'s **Instance** page turn on **Instancing**, set *Instance Count Mode* to **Instance OP(s) Length**, drag \`pts_a\` onto *Default Instance OP* (it reads \`../pts_a\`), and choose \`P(0)\`, \`P(1)\`, \`P(2)\` for *Translate X/Y/Z* from their drop-down menus.`,
            nodes: ['geo_after', 'box_a'],
          },
          {
            title: 'Measure the difference',
            body: `Set \`render1\`'s *Geometry* to \`geo_after\`: same image, but compare GPU memory and GPU time — nothing is allocated or recomputed per box. Then turn \`geo_before\`'s **Cooking flag** off (memory kept, zero cook time) and delete it once convinced.`,
            focus: ['geo_before', 'geo_after'],
          },
        ],
      },
    },
    {
      kind: 'compare',
      left: {
        title: 'Copy POP',
        md: 'Makes **real geometry**: every copy has its own points and attributes that downstream POPs can deform, measure, delete or feed into simulations. Memory and work grow with *copies × points per copy*. Choose it when you must process the result as POP data.',
      },
      right: {
        title: 'Instancing',
        md: 'Draws **one shape many times** using per-point transforms (and optionally colour, scale, rotation) read from a POP. Nothing new is allocated per copy. Choose it whenever the copies only need to be placed, oriented, coloured and drawn.',
      },
    },
    {
      kind: 'md',
      md: `
## Pixels: resolution, anti-aliasing and formats

TOP costs mostly scale with pixel count — halve width and height and you shade a quarter of the pixels.

**Resolution.** Render at the output size, not bigger "just in case": 3840 × 2160 is four times 1920 × 1080, and every TOP after the render inherits it.

**Anti-aliasing.** *Anti-Alias* renders into a multi-sampled buffer — at **4x**, four samples per pixel — so memory and fill cost grow with the setting. Points and lines usually look fine at 4x or 8x; check the rig before going higher.

**Pixel format.** Set on each TOP's *Common* page:

| Pixel format | Bytes per pixel | 1920 × 1080 | 3840 × 2160 |
|---|---|---|---|
| 8-bit fixed (RGBA) | 4 | ≈ 8.3 MB | ≈ 33 MB |
| 16-bit float (RGBA) | 8 | ≈ 16.6 MB | ≈ 66 MB |
| 32-bit float (RGBA) | 16 | ≈ 33 MB | ≈ 133 MB |

8-bit suits most finished images. Use 16-bit float where precision matters — slow feedback fades band in 8-bit — and 32-bit float only for data, rarely for colour.

## Cook only what's needed

* **Close viewers**, and judge the final frame rate in **Perform Mode**, which renders only the perform Window COMP.
* **Switch off what isn't used**: *Active* toggles on idle inputs, the Cooking flag on idle scenes.
* **Keep per-frame Python small.** A per-frame expression is fine; a loop over thousands of items in an Execute DAT is not.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'A five-minute triage',
      md: `1. \`msec\` vs budget — is there a problem at all?
2. Resolution test: tiny render faster? GPU pixels.
3. Probe on **GPU Time**: which component, which node?
4. Downloads: POP to CHOP/DAT on *Immediate*, \`points()\` without \`delayed=True\`.
5. Middle-click big POPs: counts, allocated vs used, non-\`(r)\` attributes.
6. Change **one** thing. Measure again.`,
    },
    {
      kind: 'challenge',
      title: 'Find the bottleneck',
      md: 'Open the heaviest project you have built in this course. Using only the rig and the two quick tests, decide whether it is CPU- or GPU-bound, and name the single most expensive component. Write down the frame time before and after one targeted change.',
      hints: [
        'Run the resolution test first: drop `render1` (and any post TOPs) to a tiny custom resolution for a moment.',
        'Probe with *GPU Time* selected shows costs per component; click into the worst one.',
      ],
      solution:
        'If frame time collapses at tiny resolution, you are pixel-bound: lower resolution or anti-aliasing, or simplify post TOPs. If not, check `children_cpu_cook_time` and the Performance Monitor for CPU work, and `geo_gpu_ms` for heavy POP chains. Report a **millisecond** difference, measured in Perform Mode with viewers closed.',
    },
    {
      kind: 'challenge',
      title: 'Stall hunt',
      md: 'Add an Execute DAT with *Frame End* on that prints `op(\'pts_a\').points(\'P\')[0]` every frame. Measure frame time with the trail. Then make it stall-free without losing the printout.',
      hints: [
        'The download happens because the CPU asks for this frame\'s data before the GPU has produced it.',
        'Every POP data method accepts the same keyword.',
      ],
      solution:
        'Change the call to `op(\'pts_a\').points(\'P\', delayed=True)[0]`. The value is one frame old, but the CPU no longer waits for the GPU, so the spike leaves the trail. (Printing every frame is slow too — remove it afterwards.)',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Your project must run at 60 fps. What is the time budget for one frame?',
          options: ['60 ms', 'About 16.7 ms', 'About 33.3 ms', '1 ms per operator'],
          answer: 1,
          explain: '1000 ms ÷ 60 ≈ 16.7 ms, and the slower of CPU and GPU sets the pace.',
        },
        {
          q: 'A big POP chain shows tiny CPU cook times, yet the frame rate is low. Where do you look next?',
          options: [
            'Nowhere — small cook times mean the POPs are cheap',
            'At its GPU time (middle-click, `childrenGPUCookTime`, or Probe on GPU Time)',
            'At the number of DATs in the project',
            'At the timeline length',
          ],
          answer: 1,
          explain: 'For POPs and TOPs the CPU cook time is only set-up; the real work is GPU time.',
        },
        {
          q: 'Which call reads point positions without forcing the CPU to wait for the GPU?',
          options: [
            "`op('pts_a').points('P')`",
            "`op('pts_a').points('P', delayed=True)`",
            "`op('pts_a').numPoints()` on an indirect POP",
            'A POP to DAT with Download Type set to Immediate (Slow)',
          ],
          answer: 1,
          explain: '`delayed=True` returns last frame\'s data, already on the CPU. The others download immediately.',
        },
        {
          q: 'A Delete POP\'s info popup says *Point Count Info on GPU*. What does that imply?',
          options: [
            'The POP failed to cook',
            'It allocated memory for the maximum possible result, and downstream POPs size themselves to that maximum too',
            'Its points will be downloaded to the CPU every frame',
            'It cannot be rendered',
          ],
          answer: 1,
          explain: 'Allocation is for the worst case. A Topology POP can lower the maximums; *Copy Topology Info Back to CPU* makes it exact at the price of a download.',
        },
        {
          q: 'When is the Copy POP the better choice than instancing?',
          options: [
            'Always — it is newer',
            'When you need to deform or otherwise process the copied geometry as POP data afterwards',
            'When you only need to place many identical shapes',
            'When you want to save GPU memory',
          ],
          answer: 1,
          explain: 'Copies are real geometry you can keep processing; instancing only places, colours and draws.',
        },
      ],
    },
  ],
};

export default lesson;
