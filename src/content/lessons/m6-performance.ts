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
Every TouchDesigner project eventually meets the same moment: it runs beautifully on your desk, and then the projector is bigger, the song is louder, the particle count doubles — and the motion starts to stutter. Optimizing at that point is guesswork unless you have numbers.

This lesson gives you the numbers. You'll build a small **profiling rig** you can paste into any project, learn to tell CPU time from GPU time, and then work through the costs that are specific to a POP-based project: what POPs allocate, which POPs over-allocate, which innocent-looking nodes force the CPU to wait for the GPU, and how render settings multiply everything. The rule for the whole lesson: **measure, change one thing, measure again.**
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

TouchDesigner keeps two very different workers busy. The **CPU** cooks the network: it evaluates expressions, runs CHOPs and DATs and Python, and *prepares* GPU work. The **GPU** executes that work: POP compute shaders, TOP pixel shaders, the Render TOP's drawing. The two run as a pipeline — while the GPU chews on one batch of work, the CPU is already preparing the next — so the slower of the two sets your frame rate. Speeding up the faster one changes nothing.

That gives you two quick bottleneck tests:

* **The resolution test.** Temporarily drop your render and post-processing TOPs to a tiny resolution. If the frame time falls sharply, you were GPU-bound on pixels.
* **The CPU-load test.** Drop in a [[Hog CHOP]], which deliberately burns CPU time. If the frame rate drops as soon as it runs, the CPU was already the limit; if nothing changes, the GPU is the bottleneck.

## Nothing cooks unless something asks

TouchDesigner is a *pull* system. An operator cooks only when something downstream wants its data **and** it has a reason to (its inputs, parameters or referenced operators changed, or it is time-dependent). The things that pull are your outputs: a Window COMP, panels on screen, out-devices — and **every open node viewer**. Two consequences matter for performance:

1. A big POP or TOP with its viewer on keeps cooking and drawing even if nothing else uses it. Close viewers you aren't looking at.
2. A whole branch that nobody requests costs nothing. You can also switch a component's **Cooking flag** off (\`allowCooking\` in Python): its contents keep their memory but stop cooking entirely, which is ideal for a scene you'll need later in the show.
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
          'The rig watches three names — `geo1`, `render1` and `out1` — so it drops into almost any project. **stats** is the single place to read numbers from; **trail1** shows the last few seconds of frame time; **hud** is a monitoring copy of your output with the numbers burned in.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            note: 'Stands in for whatever you are profiling — the noise blob from lesson 1.1, a particle system, anything. Its POPs live inside; the rig only needs its name to sum up their cook times.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 1,
            y: 0,
            note: 'Your scene\'s Render TOP. We read its CPU set-up time, its real GPU time and the texture memory it holds.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 2,
            y: 0,
            inputs: ['render1'],
            note: 'The image you actually send to the show output. The HUD below is a *copy* of it with text on top, so the numbers never leak into the real output.',
          },
          {
            id: 'hud',
            type: 'textTOP',
            x: 3,
            y: 0,
            inputs: ['out1'],
            params: {
              Text: { expr: "'{:.2f} ms   {:.0f} fps'.format(op('stats')['msec'].eval(), op('stats')['fps'].eval())" },
              'Comp Over Input': true,
              'Background Alpha': 0,
            },
            note: 'Burns frame time and fps over the image. Show it in a rehearsal monitor window, never in the show output. `.eval()` turns the CHOP channels into plain floats for Python\'s `format()`.',
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
            note: 'Whole-process health: how many frames were drawn in the last second, how long a frame took, how many were dropped, and how much GPU memory is in use. Turn on only the channels you will read.',
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
            note: '*Children Cook Time* adds `children_cpu_cook_time`: the summed CPU time of everything inside `geo1`. Summing has its own cost on big networks, so keep this on a component, not on `/project1`.',
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
            note: '`cook_time` is the Render TOP\'s **CPU** time — mostly preparing draw calls. `gpu_memory_used` is the memory its output texture occupies.',
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
            note: 'A holder for the GPU times. Its two values are written every frame by `gpu_exec` — nobody types them.',
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
            note: '`childrenGPUCookTime` sums the GPU work of every POP inside `geo1`; `gpuCookTime` is the Render TOP\'s own GPU time. `const0value`/`const1value` are the Python names of *Value* in blocks 0 and 1.',
          },
          {
            id: 'merge1',
            type: 'mergeCHOP',
            x: 1,
            y: 2.9,
            inputs: ['perform1', 'info_geo', 'info_render', 'gputime'],
            note: 'Collects every number into one CHOP. The channel names don\'t collide, so nothing gets renamed.',
          },
          {
            id: 'stats',
            type: 'nullCHOP',
            x: 2,
            y: 2.9,
            inputs: ['merge1'],
            note: 'The one node everything reads from. Expressions point here, so you can rebuild the rig behind it without breaking them.',
          },
          {
            id: 'frametime',
            type: 'selectCHOP',
            x: 3,
            y: 3.7,
            params: { CHOP: { ref: 'stats' }, 'Channel Names': 'msec' },
            note: 'Pulls out just the frame time so the trail graph isn\'t squashed by large values like GPU memory in megabytes.',
          },
          {
            id: 'trail1',
            type: 'trailCHOP',
            x: 4,
            y: 3.7,
            inputs: ['frametime'],
            note: 'A rolling history of frame time. Spikes — a frame that took 40 ms once every few seconds — are invisible in an fps counter but obvious here.',
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
            body: `Open a project to profile — the noise blob from lesson 1.1 is perfect to start with. The rig only relies on three names: a Geometry COMP \`geo1\`, its Render TOP \`render1\`, and a Null TOP \`out1\` after it. Rename yours to match, or adjust the references as you go.

Middle-click \`render1\` and note what the info popup says about its cook time. That's your first measurement.`,
            nodes: ['geo1', 'render1', 'out1'],
          },
          {
            title: 'Process health: the Perform CHOP',
            body: `Create a **Perform CHOP** \`perform1\`. On its page turn on **Frames per Second**, **Frame Time**, **Dropped Frames** and **GPU Mem Used (MB)**, and leave the rest off — every channel you don't need is noise.

Watch \`msec\`: that's the number to compare with your budget (16.7 ms at 60 fps).`,
            nodes: ['perform1'],
          },
          {
            title: 'CPU time per operator: Info CHOPs',
            body: `Create an **Info CHOP** \`info_geo\`, set *Operator* to \`geo1\`, turn on **Children Cook Time** and type \`children_cpu_cook_time\` into *Scope* so only that channel comes out.

Create a second Info CHOP \`info_render\` pointing at \`render1\`, with *Scope* \`cook_time gpu_memory_used\`.`,
            nodes: ['info_geo', 'info_render'],
          },
          {
            title: 'GPU time needs a line of Python',
            body: `Info CHOPs report CPU time. GPU time is available as Python members, so we copy it into a CHOP every frame.

Create a **Constant CHOP** \`gputime\` with two channels named \`geo_gpu_ms\` and \`render_gpu_ms\` (add a second block with the **+**). Then create an **Execute DAT** \`gpu_exec\`, turn on **Frame End**, and replace its text with the code shown in the inspector.`,
            nodes: ['gputime', 'gpu_exec'],
          },
          {
            title: 'One place to read it all',
            body: `Wire \`perform1\`, \`info_geo\`, \`info_render\` and \`gputime\` into a **Merge CHOP** \`merge1\` and end with a **Null CHOP** \`stats\`.

You now have, side by side: frame time, fps, dropped frames, GPU memory, the CPU time inside \`geo1\`, the Render TOP's CPU time and texture memory, and the GPU times of both.`,
            nodes: ['merge1', 'stats'],
          },
          {
            title: 'Watch for spikes',
            body: `Create a **Select CHOP** \`frametime\`, set *CHOP* to \`stats\` and *Channel Names* to \`msec\`. Feed it into a **Trail CHOP** \`trail1\` and set its *Window Length* to about ten seconds (pick seconds as the unit next to it).

A steady line under your budget is the goal. Regular spikes usually mean something periodic: a Python script on a timer, a file being read, a GPU download.`,
            nodes: ['frametime', 'trail1'],
          },
          {
            title: 'A heads-up display',
            body: `Create a **Text TOP** \`hud\` and wire \`out1\` into it. On the *Output* page turn on **Comp Over Input**; on the *Color* page set **Background Alpha** to 0. Put *Text* in expression mode and paste the expression from the inspector.

Open \`hud\` in a floating viewer while you work. When you're done profiling, delete the viewer — or the whole HUD — because it costs a Text TOP cook every frame.`,
            nodes: ['hud'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Reading the rig

Start every investigation with one question: **is \`msec\` over budget, and on which side?**

* If \`geo_gpu_ms\` + \`render_gpu_ms\` (plus your post-processing) is close to the budget, the GPU is the limit. Reduce work per point and per pixel.
* If the CPU numbers dominate — large \`children_cpu_cook_time\`, Python, many CHOPs — the CPU is the limit. Fewer cooks, less Python per frame, fewer operators that cook every frame.

Keep in mind what the numbers mean. For GPU operators (POPs and TOPs) the **CPU cook time is only the set-up**: building and submitting the work. A POP chain can look almost free in CPU terms while it eats most of the GPU budget. The middle-click info popup shows both times for one node; the rig shows both for the whole scene.

### Two built-in tools

* **Probe** lives in the Palette under *Tools*. Drag it into your project (ideally at \`/\`) and toggle it with <kbd>Ctrl</kbd>+<kbd>P</kbd>. It draws your network as stacks of circles coloured by cost, and its menu switches between CPU time, GPU time, CPU memory and GPU memory. It's the fastest way to find *which* node is expensive.
* The **Performance Monitor** (*Dialogs → Performance Monitor*, <kbd>Alt</kbd>+<kbd>Y</kbd>) lists everything that cooked in a frame, in order, with timings. Its *Frame Trigger* field only reports frames slower than a threshold — perfect for catching a spike that happens once a minute.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Measuring changes what you measure',
      md: 'Probe costs a little time while it is displayed, the Info CHOP\'s *Children Cook Time* has to sum many nodes, and the HUD cooks a Text TOP every frame. Profile with them, then switch them off before you judge the final frame rate. A good habit: keep the rig inside its own Base COMP and turn that component\'s **Cooking flag** off for the show.',
    },
    {
      kind: 'md',
      md: `
## What POPs cost

### Memory: references, not copies

A POP allocates GPU memory only for the attributes it **creates or modifies**; everything else is a reference to the upstream buffer (shown as \`(r)\` in the info popup). So a long chain isn't expensive by itself — what matters is what each node writes.

Do the arithmetic once and it sticks. One million points with \`P\` (three 32-bit floats) is 12 MB. A [[Math POP]] that rewrites \`P\` allocates another 12 MB; one that writes a new \`Color\` (four floats) allocates 16 MB. A particle system reserves its attributes for **Maximum Particles**, whether or not they are alive: \`P\`, \`PartVel\` and \`PartForce\` are 12 bytes each, and age, lifespan, mass, drag and id add 4 bytes apiece — over 50 bytes per particle before any of your own attributes. Set *Maximum Particles* to what the piece needs, not to a round number with too many zeros.

### Indirect POPs and over-allocation

Some operations can't know their output size until the GPU has run them: deleting by a condition ([[Delete POP]]), proximity searches, some facet and convert operations. The info popup of such a POP says **Point Count Info on GPU** and/or **Topology Info on GPU**. Because the CPU doesn't know the real count, the POP allocates for the **maximum it could produce**, and the POPs after it allocate that maximum too, receiving the real counts through GPU buffers ("indirect dispatch"). It works and it's fast, but memory can balloon if a big indirect POP feeds a long chain.

You have three tools:

* **Do nothing** when the chain is short — indirect dispatch is designed for this.
* **[[Topology POP]]** after the indirect POP. If you know an upper bound (say, never more than half the points survive), set smaller maximums on its *Points* and *Topology* pages so everything downstream allocates less — without a stall. If you know the exact counts, you can declare them and the POP becomes a regular one again.
* **Copy Topology Info Back to CPU** (on the Delete POP and some others) downloads the real counts and turns the result back into a regular POP. Downstream allocation becomes exact, but the download is a GPU→CPU sync — exactly the thing the next section warns about.

### GPU→CPU stalls

The GPU usually runs a little behind the CPU: the CPU queues work and moves on. The moment the CPU *needs* a POP's data — a [[POP to CHOP]], a [[POP to DAT]], a Python \`points()\` call, even \`numPoints()\` on an indirect POP — it has to wait until the GPU has finished everything queued so far, then download. The pipeline drains, and you lose the overlap that made the frame fit.

The fix is to accept one frame of latency:

* POP to CHOP and POP to DAT have a **Download Type** menu: choose **Next frame (Fast)** instead of *Immediate (Slow)*.
* The Python methods take \`delayed=True\` and return last frame's result without waiting.
* If the number is only needed by other GPU work (a bounding box to centre a camera, a maximum to normalize colours), compute it on the GPU with the [[Analyze POP]] and never download it at all.
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
          'Both versions draw a small box on each of 90 000 noisy grid points. **geo_before** builds every box as real geometry with a Copy POP and leaves a debugging table that downloads from the GPU. **geo_after** keeps only the points and lets the Geometry COMP instance one box onto them. Point `render1`\'s *Geometry* at one, then the other, and compare the rig.',
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
                note: 'Input 0 is the geometry to copy, input 1 the template points. The output is real geometry: every box\'s points, faces and attributes are allocated and recomputed every frame because the template moves.',
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
            note: 'The forgotten debugging table. Even a handful of rows forces the CPU to wait for the GPU every frame while its viewer (or anything else) pulls on it. Switch it to *Next frame (Fast)* — or delete it.',
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
            note: 'One box, drawn once per point of `pts_a`. The GPU receives the box geometry a single time plus a list of positions — nothing is copied or recomputed per box.',
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

Point \`render1\` at \`geo_before\` and read the rig: GPU time, GPU memory, frame time. Middle-click \`null_b\` to see how much geometry the Copy POP made.`,
            nodes: ['box_b', 'copy_b', 'null_b'],
          },
          {
            title: 'The forgotten debug table',
            body: `Back in \`/project1\`, add a **POP to DAT** \`debug_b\` with *POP* = \`geo_before/noise_b\`, *Download Type* **Immediate (Slow)**, *Thin Out Range* on and *Thin Range Length* **10** — the kind of table you make while debugging and forget to delete.

Turn its viewer on and watch the trail in your rig. Then switch *Download Type* to **Next frame (Fast)** and compare. Finally, delete it.`,
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
            body: `Set \`render1\`'s *Geometry* to \`geo_after\` and read the rig again. The image should be the same. Compare GPU memory and the GPU times — the instanced version skips allocating and recomputing every box each frame.

Then turn \`geo_before\`'s **Cooking flag** off: it keeps its memory but costs nothing per frame. Delete it once you are convinced.`,
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

Most TOP costs scale with the number of pixels. Halve the width and height and you shade a quarter of the pixels. Three settings deserve a deliberate choice:

**Resolution.** Render at the size of the output, not bigger "just in case". A 3840 × 2160 render has four times the pixels of 1920 × 1080, and every TOP after it inherits that size unless you change it.

**Anti-aliasing.** The Render TOP's *Anti-Alias* renders into a multi-sampled buffer: with **4x**, each pixel stores four samples. Memory and fill cost grow with the sample count, and the buffer must be resolved down every frame. Fine points and thin lines usually look good at 4x or 8x; reach for 16x or 32x only after you've checked the cost in the rig.

**Pixel format.** Every TOP's *Common* page has a *Pixel Format*. The memory per 1920 × 1080 image:

| Pixel format | Bytes per pixel | 1920 × 1080 | 3840 × 2160 |
|---|---|---|---|
| 8-bit fixed (RGBA) | 4 | ≈ 8.3 MB | ≈ 33 MB |
| 16-bit float (RGBA) | 8 | ≈ 16.6 MB | ≈ 66 MB |
| 32-bit float (RGBA) | 16 | ≈ 33 MB | ≈ 133 MB |

8-bit is right for most finished images. Use 16-bit float where precision matters — slow fades in a feedback loop band badly in 8-bit, and data you will read back as numbers needs the range. 32-bit float is rarely needed for colour.

## Cook only what's needed

* **Close viewers.** Node viewers pull cooks and cost drawing time; a Geometry COMP's viewer draws the scene a second time.
* **Use Perform Mode** for the real test. It renders only the perform Window COMP, so the network editor's drawing disappears from the measurement.
* **Turn off what isn't used.** Unused live inputs have *Active* toggles; whole scenes can sit in a component with cooking off until their moment.
* **Keep per-frame Python small.** An expression that runs every frame is fine; a loop over thousands of items in an Execute DAT is not. Move heavy work into operators, or run it only when something changes.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'A five-minute triage',
      md: `1. Read \`msec\` against the budget. Is there a problem at all?
2. Resolution test: tiny render → faster? GPU pixels.
3. Probe on **GPU Time**: which component, which node?
4. Look for downloads: POP to CHOP/DAT on *Immediate*, Python \`points()\` without \`delayed=True\`, open info popups on indirect POPs.
5. Middle-click the big POPs: point counts, *allocated vs used*, attributes that aren't \`(r)\`.
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
        'If the frame time collapses at tiny resolution, the project is pixel-bound: lower the render resolution or anti-aliasing, or simplify expensive post TOPs. If it barely moves, look at `children_cpu_cook_time` and the Performance Monitor for CPU work (Python, CHOP chains, downloads) and at `geo_gpu_ms` for heavy POP chains. Whatever you change, the result to report is a **millisecond** difference measured with the rig, in Perform Mode, with viewers closed.',
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
        'Change the call to `op(\'pts_a\').points(\'P\', delayed=True)[0]`. The value is one frame old, but the CPU no longer waits for the GPU, so the spike disappears from the trail. (And printing every frame is itself slow — remove the print once you\'ve seen the difference.)',
    },
    {
      kind: 'challenge',
      title: 'Budget the trails',
      md: 'A show runs at 3840 × 2160 with a feedback loop of three TOPs (feedback, fade, composite). How much GPU memory do those three images use in *32-bit float (RGBA)*, and how much in *16-bit float (RGBA)*?',
      hints: ['Pixels × bytes per pixel × number of TOPs. 32-bit float RGBA is 16 bytes per pixel.'],
      solution:
        '3840 × 2160 = 8 294 400 pixels. At 16 bytes per pixel that is about 133 MB per TOP, so roughly 400 MB for three. At 16-bit float (8 bytes) it halves to about 66 MB per TOP, roughly 200 MB in total — and 16-bit float is already plenty to keep slow fades from banding.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Your project must run at 60 fps. What is the time budget for one frame?',
          options: ['60 ms', 'About 16.7 ms', 'About 33.3 ms', '1 ms per operator'],
          answer: 1,
          explain: '1000 ms ÷ 60 frames ≈ 16.7 ms. Everything the CPU and GPU do for that frame has to fit, and the slower of the two sets the pace.',
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
          explain: 'For POPs and TOPs the CPU cook time is only the set-up. The real work runs on the GPU and is reported separately.',
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
          explain: '`delayed=True` returns the previous frame\'s data, which is already on the CPU. The others all trigger an immediate download.',
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
          explain: 'The real count is only known on the GPU, so allocation is for the worst case. A Topology POP can lower the maximums, or *Copy Topology Info Back to CPU* can make it exact at the price of a download.',
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
          explain: 'Copies are real geometry you can keep working on. If the copies only need to be positioned, coloured and drawn, instancing does it without allocating anything per copy.',
        },
      ],
    },
  ],
};

export default lesson;
