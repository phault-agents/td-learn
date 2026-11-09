import type { Lesson } from '../types';

const BANDS = "op('/project1/audio/bands')";

const lesson: Lesson = {
  slug: 'capstone',
  title: 'Capstone: An Audio-Reactive Installation',
  subtitle: 'Everything at once: listen to a room, move fifty thousand particles to it, glow, and run unattended all night.',
  minutes: 90,
  summary:
    'Build a complete installation from separate components: an `audio` analyser that splits sound into bass, mids and highs; a particle `sim` whose forces listen to those bands; a line layer for the highs; a `look` with trails, bloom and a master grade; a control panel of custom parameters; and a Window COMP output — finished with a performance pass and a show-day checklist.',
  objectives: [
    'Structure a show as cooperating components with a single control panel reached through a Global OP Shortcut',
    'Split live audio into bass, mid and high envelopes with Audio Filter, Analyze and Lag CHOPs',
    'Map each band onto a different force or layer so the piece reads the music, not just its loudness',
    'Finish the image with a 16-bit feedback trail, bloom and a master/blackout grade',
    'Prepare a project for unattended running: Perform Mode, startup, fail-safes and a measured frame budget',
  ],
  requires: ['audio-reactive', 'particles', 'feedback-and-trails', 'render-stack', 'performance', 'reusable-components', 'interaction'],
  tags: ['capstone', 'audio', 'particles', 'installation', 'post', 'perform mode', 'production'],
  blocks: [
    {
      kind: 'md',
      md: `
This is the piece the course has been building towards — one you could install tomorrow. A microphone listens; a particle cloud breathes with the music — **bass** kicks it outward, **mids** stir it into curls, **highs** set a thin ring of light shivering. Trails and bloom make it luminous, an operator steers it from one panel of sliders, and it starts by itself and keeps running.

You've met every operator before. What's new is **architecture**: components with clear jobs, connected through a few stable names, robust enough to leave alone.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The architecture',
      md: `| Component | Job | Talks to others through |
|---|---|---|
| \`controls\` | The control panel: every value an operator may touch | Custom parameters, reached anywhere as \`op.CTRL.par.Name\` |
| \`audio\` | Microphone or file in, three smoothed band levels out | The Null CHOP \`audio/bands\` |
| \`sim\` | Particles and the high-frequency ring (a Geometry COMP) | Rendered by name |
| \`look\` | Camera, material, render, post-processing | The Null TOP \`look/final\` |
| \`output\` | The window on the projector | Points at \`look/final\` |

Each piece can be rebuilt, profiled or replaced without touching the others, as long as those names stay put. In a real production each of these would also be a \`.tox\` (lesson 6.2).`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'installation',
        title: 'The installation',
        root: '/project1',
        height: 620,
        caption:
          'Five components. Dive into **audio**, **sim** and **look** to see their networks; the post-processing inside `look` is expanded in the next graph. Expressions use the absolute path `/project1/audio/bands` and the shortcut `op.CTRL`, so nothing depends on where a node sits.',
        nodes: [
          {
            id: 'controls',
            type: 'baseCOMP',
            x: 0,
            y: 0,
            params: { 'Global OP Shortcut': 'CTRL' },
            note: 'An empty Base COMP holding the **Show** custom parameters. *Global OP Shortcut* `CTRL` makes them reachable anywhere as `op.CTRL.par.Gain`.',
          },
          {
            id: 'audio',
            type: 'baseCOMP',
            x: 0,
            y: 1.5,
            note: 'Sound in, three numbers out. Everything that listens reads `audio/bands`: channel 0 is bass, 1 is mids, 2 is highs.',
            children: [
              {
                id: 'audio_in',
                type: 'audiofileinCHOP',
                x: 0,
                y: 1,
                params: { 'Play Mode': 'Sequential', Repeat: 'On', Mono: true },
                note: 'A music file for rehearsing; on site an [[Audio Device In CHOP]] takes its place. *Mono* gives one channel to analyse.',
              },
              {
                id: 'low',
                type: 'audiofilterCHOP',
                x: 1,
                y: 0,
                inputs: ['audio_in'],
                params: { Filter: 'Low Pass', 'Cutoff Units': 'Frequency', 'Filter Cutoff (Hz)': 150 },
                note: 'Keeps the kick drum and bass line: everything below roughly 150 Hz.',
              },
              {
                id: 'mid',
                type: 'audiofilterCHOP',
                x: 1,
                y: 1,
                inputs: ['audio_in'],
                params: { Filter: 'Band Pass', 'Cutoff Units': 'Frequency', 'Filter Cutoff (Hz)': 1000 },
                note: 'A band around 1 kHz: voices, snares, most melodic instruments.',
              },
              {
                id: 'high',
                type: 'audiofilterCHOP',
                x: 1,
                y: 2,
                inputs: ['audio_in'],
                params: { Filter: 'High Pass', 'Cutoff Units': 'Frequency', 'Filter Cutoff (Hz)': 4000 },
                note: 'Above roughly 4 kHz: hi-hats, cymbals, sibilance — the glitter.',
              },
              {
                id: 'merge1',
                type: 'mergeCHOP',
                x: 2,
                y: 1,
                inputs: ['low', 'mid', 'high'],
                params: { 'Duplicate Names': 'Make Unique' },
                note: 'The three copies share a channel name, so *Make Unique* renumbers them. Order matters — low, mid, high — because we read by index.',
              },
              {
                id: 'analyze1',
                type: 'analyzeCHOP',
                x: 3,
                y: 1,
                inputs: ['merge1'],
                params: { Function: 'RMS Power' },
                note: 'Collapses each frame\'s slice of audio into one loudness value per band.',
              },
              {
                id: 'gain1',
                type: 'mathCHOP',
                x: 4,
                y: 1,
                inputs: ['analyze1'],
                params: { Multiply: { expr: 'op.CTRL.par.Gain' } },
                note: 'Input sensitivity — the first slider you touch in a new room. Aim for peaks near 1.',
              },
              {
                id: 'lag1',
                type: 'lagCHOP',
                x: 5,
                y: 1,
                inputs: ['gain1'],
                params: { Lag: [0.02, 0.3] },
                note: 'Fast rise, slow fall: hits land immediately and decay gracefully instead of flickering.',
              },
              {
                id: 'bands',
                type: 'nullCHOP',
                x: 6,
                y: 1,
                inputs: ['lag1'],
                note: 'The output of the whole component. `[0]` bass, `[1]` mids, `[2]` highs.',
              },
            ],
          },
          {
            id: 'sim',
            type: 'geometryCOMP',
            x: 2,
            y: 1.5,
            params: { Material: { ref: '/project1/look/linemat1' } },
            note: 'Two rendered layers: particles and ring. Its material lives in `look`, with the other visual decisions.',
            children: [
              {
                id: 'emitter',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: { Type: 'Geodesic', 'Geodesic Connectivity': 'None', Frequency: 8, Radius: [0.25, 0.25, 0.25] },
                note: 'A small sphere of birth positions at the centre.',
              },
              {
                id: 'particle1',
                type: 'particlePOP',
                x: 1,
                y: 0,
                inputs: ['emitter'],
                params: {
                  'Target Feedback Loop POP': { ref: 'loop' },
                  'Create Point Primitives': true,
                  'Maximum Particles': 60000,
                  'Birth Rate': 8000,
                  'Life Expect': 4,
                  'Life Variance (Fraction)': 0.4,
                  'Jitter Birth Position': 0.03,
                  'Velocity Damping': 0.03,
                },
                note: '8000 births/s × ~4 s ≈ 30 000 alive, under the 60 000 reserved — memory you pay for either way (lesson 6.1).',
              },
              {
                id: 'swirl',
                type: 'noisePOP',
                x: 2,
                y: 0,
                inputs: ['particle1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.5,
                  Amplitude: { expr: `0.3 + ${BANDS}[1] * op.CTRL.par.Mids` },
                  'Translate 4D': { expr: 'absTime.seconds * 0.15' },
                  'Combine Entity': 'Curl 3D',
                  'Combine Attribute Scope': 'PartForce',
                  'Output Attribute Scope': 'PartForce',
                },
                note: '**Mids → swirl.** Curl noise into `PartForce`, stronger as the mids rise.',
              },
              {
                id: 'kick',
                type: 'forceradialPOP',
                x: 3,
                y: 0,
                inputs: ['swirl'],
                params: {
                  'Enable Radial': true,
                  'Radial Strength': { expr: `${BANDS}[0] * op.CTRL.par.Bass` },
                  Falloff: 'None',
                },
                note: '**Bass → kick.** A radial force from the origin added to `PartForce`. If kicks pull particles *in* rather than out, flip the sign.',
              },
              {
                id: 'loop',
                type: 'nullPOP',
                x: 4,
                y: 0,
                inputs: ['kick'],
                flags: { display: true, render: true },
                note: 'Both the feedback target of `particle1` and the rendered particle layer.',
              },
              {
                id: 'circle1',
                type: 'circlePOP',
                x: 2,
                y: 1.2,
                params: { Connectivity: 'Line Strip', Radius: [2.2, 2.2], Divisions: 512, Closed: true },
                note: 'A closed ring of 512 points around the cloud — the second layer.',
              },
              {
                id: 'wobble',
                type: 'noisePOP',
                x: 3,
                y: 1.2,
                inputs: ['circle1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 0.35,
                  Amplitude: { expr: `0.02 + ${BANDS}[2] * op.CTRL.par.Highs` },
                  'Translate 4D': { expr: 'absTime.seconds * 0.6' },
                },
                flags: { display: true, render: true },
                note: '**Highs → shiver.** Fine noise on the ring scaled by the highs. (Flags sit here to keep the graph compact; a Null is the tidier habit.)',
              },
            ],
            childComments: [{ x: 0, y: 1.2, w: 1.8, text: 'Two render flags: one Geometry COMP, two layers.' }],
          },
          {
            id: 'look',
            type: 'baseCOMP',
            x: 3,
            y: 1.5,
            note: 'Everything visual: camera, material, render and post. Its output is the Null TOP `final`.',
            children: [
              {
                id: 'cam1',
                type: 'cameraCOMP',
                x: 0,
                y: 1,
                params: { 'Xform:Translate': [0, 0, 6] },
                note: 'Wide enough to frame the ring with room for the kicks.',
              },
              {
                id: 'linemat1',
                type: 'lineMAT',
                x: 0,
                y: 2,
                params: {
                  'Draw Lines': true,
                  'Draw Points': true,
                  'Point Type': 'Circle (Polygon)',
                  'Point Near Color': [1, 0.72, 0.45],
                  'Line Near Color': [0.55, 0.75, 1],
                },
                note: 'One unlit material for both layers: warm dots, a cool ring. Tune sizes on the *Setup* and *Point* pages.',
              },
              {
                id: 'render1',
                type: 'renderTOP',
                x: 1,
                y: 1,
                params: {
                  'Camera(s)': { ref: 'cam1' },
                  Geometry: { ref: '/project1/sim' },
                  'Anti-Alias': '4x',
                  'Background Color': [0, 0, 0, 1],
                  'Output Resolution': 'Custom Resolution',
                  'Common:Resolution': [1920, 1080],
                },
                note: 'Rendered at exactly the projector\'s resolution — no bigger. 4x anti-aliasing keeps the dots and the ring clean.',
              },
              {
                id: 'final',
                type: 'nullTOP',
                x: 2,
                y: 1,
                inputs: ['render1'],
                note: 'The component\'s output and the Window COMP\'s source. The post chain from the next graph goes between `render1` and here.',
              },
            ],
          },
          {
            id: 'output',
            type: 'windowCOMP',
            x: 4,
            y: 1.5,
            params: {
              'Window Operator': { ref: '/project1/look/final' },
              'Opening Size': 'Fill',
              Display: 1,
              Borders: false,
              'Cursor Visible': 'Never',
              'Prevent Display Sleep': true,
            },
            note: 'Borderless, filling the chosen display, no cursor, no display sleep. Set *Justify and Offset to…* **Specify Display** so *Display* applies; a [[Monitors DAT]] lists the indices.',
          },
        ],
        boxes: [{ title: 'Signal flow: controls → audio → sim → look → output', nodes: ['controls', 'audio', 'sim', 'look', 'output'], tone: 'gray' }],
        steps: [
          {
            title: 'The control panel',
            body: `Create a **Base COMP** \`controls\`. On its *Common* page set **Global OP Shortcut** to \`CTRL\`.

Open *Customize Component…*, add a page **Show** and these parameters: \`Gain\`, \`Bass\`, \`Mids\`, \`Highs\`, \`Trails\`, \`Glow\`, \`Master\` (all Float) and \`Blackout\` (Toggle). Use the ranges from the table below the graph. In the Textport, \`op.CTRL.par.Gain\` should now print a value from anywhere.`,
            nodes: ['controls'],
          },
          {
            title: 'Sound in',
            body: `Create a **Base COMP** \`audio\`. Inside, an **Audio File In CHOP** \`audio_in\`: choose a song with a clear kick drum, set *Play Mode* **Sequential**, *Repeat* **On** and turn on **Mono**. (Add an [[Audio Device Out CHOP]] if you want to hear it while you work.)`,
            nodes: ['audio', 'audio_in'],
          },
          {
            title: 'Split into three bands',
            body: `Wire \`audio_in\` into three **Audio Filter CHOPs**, all with *Cutoff Units* **Frequency**:

* \`low\` — *Filter* **Low Pass**, *Filter Cutoff (Hz)* **150**
* \`mid\` — **Band Pass**, **1000**
* \`high\` — **High Pass**, **4000**

Look at the three viewers side by side while the music plays: the same waveform, three characters.`,
            nodes: ['low', 'mid', 'high'],
          },
          {
            title: 'One number per band',
            body: `Wire \`low\`, \`mid\` and \`high\` — **in that order** — into a **Merge CHOP** \`merge1\` with *Duplicate Names* **Make Unique**. Follow it with an **Analyze CHOP** \`analyze1\` set to **RMS Power**.

You now get three single values per frame. Channel order is the contract: 0 bass, 1 mids, 2 highs.`,
            nodes: ['merge1', 'analyze1'],
          },
          {
            title: 'Shape the response',
            body: `Add a **Math CHOP** \`gain1\` with *Multiply* = \`op.CTRL.par.Gain\`, a **Lag CHOP** \`lag1\` with *Lag* **0.02, 0.3**, and a **Null CHOP** \`bands\`.

Play the loudest part of the song and adjust **Gain** on \`controls\` until the strongest band peaks around 1.`,
            nodes: ['gain1', 'lag1', 'bands'],
          },
          {
            title: 'Particles',
            body: `In \`/project1\`, create a **Geometry COMP** \`sim\` and clear it. Inside: **Sphere POP** \`emitter\` (*Geodesic*, *Geodesic Connectivity* **None**, *Frequency* **8**, *Radius* **0.25**) → **Particle POP** \`particle1\` → **Null POP** \`loop\` with render and display flags.

On \`particle1\`: *Target Feedback Loop POP* \`loop\`, *Create Point Primitives* on, *Maximum Particles* **60000**, *Birth Rate* **8000**, *Life Expect* **4**, *Life Variance* **0.4**, *Jitter Birth Position* **0.03**, *Velocity Damping* **0.03**. Leave a gap between \`particle1\` and \`loop\` for the forces.`,
            nodes: ['sim', 'emitter', 'particle1', 'loop'],
          },
          {
            title: 'Forces that listen',
            body: `Insert a **Noise POP** \`swirl\` after \`particle1\`: *Type* **Simplex 4D (GPU)**, *Period* **1.5**, *Translate 4D* \`absTime.seconds * 0.15\`, and on *Output* set *Combine Entity* **Curl 3D** with both attribute scopes \`PartForce\`. Set *Amplitude* to \`0.3 + ${BANDS}[1] * op.CTRL.par.Mids\`.

Then a **Force Radial POP** \`kick\`: **Enable Radial** on, *Falloff* **None**, *Radial Strength* = \`${BANDS}[0] * op.CTRL.par.Bass\`. Wire \`kick\` into \`loop\`.`,
            nodes: ['swirl', 'kick'],
          },
          {
            title: 'A second layer for the highs',
            body: `Still inside \`sim\`, add a **Circle POP** \`circle1\`: *Connectivity* **Line Strip**, *Radius* **2.2, 2.2**, *Divisions* **512**, *Closed* on. Append a **Noise POP** \`wobble\` (*Simplex 4D (GPU)*, *Period* **0.35**, *Translate 4D* \`absTime.seconds * 0.6\`, *Amplitude* \`0.02 + ${BANDS}[2] * op.CTRL.par.Highs\`) and turn on its render and display flags.`,
            nodes: ['circle1', 'wobble'],
          },
          {
            title: 'The look',
            body: `Create a **Base COMP** \`look\`. Inside: **Camera COMP** \`cam1\` at *Translate* **0, 0, 6**; **Line MAT** \`linemat1\` with *Draw Lines* and *Draw Points* on, *Point Type* **Circle (Polygon)**, a warm *Point Near Color* and a cool *Line Near Color*; **Render TOP** \`render1\` (*Camera(s)* \`cam1\`, *Geometry* \`/project1/sim\`, *Anti-Alias* **4x**, black background, **Custom Resolution** 1920 × 1080); and a **Null TOP** \`final\`.

Back on \`sim\`'s *Render* page, set *Material* to \`/project1/look/linemat1\`. Press play: the cloud should pulse with the kick, churn with the mids, and the ring should shiver on the hi-hats.`,
            nodes: ['look', 'cam1', 'linemat1', 'render1', 'final'],
            focus: ['sim'],
          },
          {
            title: 'Out to the projector',
            body: `Create a **Window COMP** \`output\`: *Window Operator* \`/project1/look/final\`, *Justify and Offset to…* **Specify Display**, *Display* = the projector's index, *Opening Size* **Fill**, *Borders* off, *Cursor Visible* **Never**, and on the *Open/Close* page **Prevent Display Sleep** on.

Pulse **Set as Perform Window**, then press <kbd>F1</kbd> to enter Perform Mode. <kbd>Esc</kbd> brings you back.`,
            nodes: ['output'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## The control panel

These are starting ranges — set each slider so its whole travel is useful in *this* piece.

| Parameter | Type | Range | Start | What it does |
|---|---|---|---|---|
| \`Gain\` | Float | 0 – 20 | 4 | Input sensitivity for all three bands |
| \`Bass\` | Float | 0 – 40 | 10 | Kick strength per unit of bass |
| \`Mids\` | Float | 0 – 5 | 1.5 | Extra curl per unit of mids |
| \`Highs\` | Float | 0 – 2 | 0.6 | Ring shiver per unit of highs |
| \`Trails\` | Float | 0 – 0.97 | 0.85 | How much of the previous frame survives |
| \`Glow\` | Float | 0 – 2 | 0.8 | Bloom intensity |
| \`Master\` | Float | 0 – 1 | 1 | Overall brightness |
| \`Blackout\` | Toggle | — | off | Instantly black, without stopping anything |

Why a separate component with a **Global OP Shortcut**? The values are needed in four networks at different depths; \`op.CTRL.par.Bass\` reads the same everywhere, while \`parent(2).par.Bass\` breaks when a node moves. For the show, a [[Parameter COMP]] pointed at \`controls\` turns its page into a panel you can open in a small second Window COMP on the laptop screen.

## Three bands, three forces

One loudness value makes everything swell together — the "it's just pumping" look. Separate bands let the image *listen*: kicks land as bursts, a vocal line stirs the cloud, cymbals live in the ring. The 150 Hz / 4 kHz crossovers are starting points; a string quartet and a techno set need different splits. The **Lag CHOP's asymmetry** carries much of the feel: instant rise for tight hits, slower fall for a tail.

* **Bass is impulsive** → a radial push. The Particle POP integrates it into velocity and *Velocity Damping* bleeds it away: a breath out, a slow settle.
* **Mids are continuous** → curl noise, which is divergence-free: it swirls without clumping or flinging, so more mids means more turbulence, not more outward speed.
* **Highs are fine-grained** → a separate thin layer with a short noise period, instead of jitter on an already-moving cloud.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'post',
        title: 'Inside look: trails, glow and a master grade',
        root: '/project1/look',
        height: 400,
        caption:
          'The post chain that goes between `render1` and `final`. The feedback loop runs at 16-bit float so slow fades stay smooth; the last Level TOP returns to 8-bit for output and holds the master and blackout controls.',
        nodes: [
          {
            id: 'render1',
            type: 'renderTOP',
            x: 0,
            y: 0,
            note: 'The Render TOP from the main graph.',
          },
          {
            id: 'feedback1',
            type: 'feedbackTOP',
            x: 1,
            y: 1,
            inputs: ['render1'],
            params: { 'Target TOP': { ref: 'comp1' }, 'Pixel Format': '16-bit float (RGBA)' },
            note: 'Delivers last frame\'s `comp1`. Its input supplies the size and the image it resets to.',
          },
          {
            id: 'fade1',
            type: 'levelTOP',
            x: 2,
            y: 1,
            inputs: ['feedback1'],
            params: { 'Brightness 1': { expr: 'op.CTRL.par.Trails' } },
            note: 'Dims the previous frame each pass; at 0.85 it fades to a few percent in about twenty frames.',
          },
          {
            id: 'comp1',
            type: 'compositeTOP',
            x: 3,
            y: 0,
            inputs: ['render1', 'fade1'],
            params: { Operation: 'Maximum', 'Pixel Format': '16-bit float (RGBA)' },
            note: '*Maximum* keeps whichever is brighter: the new frame or the fading past. Unlike *Add*, it can never build up to pure white.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 4,
            y: 0,
            inputs: ['comp1'],
            params: { 'Bloom Intensity': { expr: 'op.CTRL.par.Glow' } },
            note: 'Glow around the bright points and trails. Expensive at high resolution — check its GPU time in the rig.',
          },
          {
            id: 'grade',
            type: 'levelTOP',
            x: 5,
            y: 0,
            inputs: ['bloom1'],
            params: {
              'Brightness 1': { expr: '0 if op.CTRL.par.Blackout.eval() else op.CTRL.par.Master' },
              'Pixel Format': '8-bit fixed (RGBA)',
            },
            note: 'Master brightness; **Blackout** forces 0 while everything keeps running. Back to 8-bit.',
          },
          {
            id: 'final',
            type: 'nullTOP',
            x: 6,
            y: 0,
            inputs: ['grade'],
            note: 'Unchanged name, so the Window COMP doesn\'t need to know any of this happened.',
          },
        ],
        boxes: [{ title: 'Feedback loop (16-bit float)', nodes: ['feedback1', 'fade1', 'comp1'], tone: 'purple' }],
        steps: [
          {
            title: 'Open up the chain',
            body: `Inside \`look\`, disconnect \`render1\` from \`final\` and move \`final\` to the right to make room.`,
            nodes: ['render1', 'final'],
          },
          {
            title: 'Trails',
            body: `Add a **Feedback TOP** \`feedback1\` fed by \`render1\`, a **Level TOP** \`fade1\` after it with *Brightness 1* = \`op.CTRL.par.Trails\`, and a **Composite TOP** \`comp1\` with \`render1\` and \`fade1\` as inputs and *Operation* **Maximum**. Set \`feedback1\`'s *Target TOP* to \`comp1\`, and both \`feedback1\` and \`comp1\` to *Pixel Format* **16-bit float (RGBA)** on their *Common* pages.`,
            nodes: ['feedback1', 'fade1', 'comp1'],
          },
          {
            title: 'Glow',
            body: `Append a **Bloom TOP** \`bloom1\` with *Bloom Intensity* = \`op.CTRL.par.Glow\`.`,
            nodes: ['bloom1'],
          },
          {
            title: 'Master and blackout',
            body: `Append a **Level TOP** \`grade\`: *Brightness 1* = \`0 if op.CTRL.par.Blackout.eval() else op.CTRL.par.Master\`, *Pixel Format* **8-bit fixed (RGBA)**. Wire it into \`final\`. Flip **Blackout** on \`controls\` to test it.`,
            nodes: ['grade'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Rehearse with a file, perform with a microphone',
      md: 'Build and tune with the Audio File In CHOP — you can replay the same 30 seconds until the response is right. On site, put an [[Audio Device In CHOP]] next to it and feed `low`, `mid` and `high` from a [[Switch CHOP]] whose index you can flip from `controls`. A room microphone is much quieter and muddier than a file, so expect to raise **Gain** a lot and to retune the crossovers.',
    },
    {
      kind: 'md',
      md: `
## Performance pass

Run the lesson 6.1 rig in **Perform Mode**, viewers closed, for at least half an hour. Aim well under the 16.7 ms budget (12 ms or less): the venue machine and a warm GPU will eat into it.

* **Render size and AA.** 1920 × 1080 at 4x; if GPU-bound, try 2x before lowering resolution.
* **Precision only where needed.** 16-bit float in the loop, 8-bit after the grade.
* **Particles.** Population ≈ birth rate × life; keep *Maximum Particles* a little above it.
* **Bloom** is usually the priciest post step — watch its GPU time.
* **No downloads** in the per-frame path; any displayed count uses \`delayed=True\`.
* **Idle components off** — test networks, the rig, the unused audio source.
* **Watch the trail, not the counter.** A 50 ms hitch once a minute is what audiences notice.

## Show-day checklist

**Startup**

* In *Edit → Window Placement*, make \`output\` the Perform Window, turn on **Start in Perform Mode** and save.
* Have the OS launch the \`.toe\` at login, then test a cold boot: power off, power on, walk away.
* Disable sleep, screen savers, update restarts and notifications; *Prevent Display Sleep* only covers the display.
* Set the projector to its native resolution and refresh rate before doors open, and confirm the window lands on it.

**Fail-safes**

* **Blackout** on \`controls\`, also mapped to a key or MIDI button.
* *Close on Escape Key* off on the Window COMP (<kbd>Shift</kbd>+<kbd>Esc</kbd> still closes it).
* Decide what a missing microphone does: the Audio Device In's *Error if Missing* helps during setup; during the run, a fallback beats a frozen image (see the challenge).
* Copy the final \`.toe\`, every \`.tox\` and all media to a USB stick, and install exactly the TouchDesigner build you tested with.

**Before you leave**

* Run the whole song list in Perform Mode, watching the frame-time trail on a monitor.
* Walk the room: does the microphone hear the music or the air conditioning? Retune **Gain** and crossovers on the real sound.
* Leave the operator a one-page note: sliders, Blackout, how to restart.
`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'The architecture is the reusable part; the mapping is the art. Try the highs on particle *colour* instead of the ring, the bass on the camera\'s distance instead of a force, or the mids on the bloom. Add the cursor field from lesson 6.3 as a fourth force so visitors can part the cloud with their hands. Or swap the sphere emitter for text outlines and let the music tear a word apart.',
    },
    {
      kind: 'challenge',
      title: 'Reset without stopping the show',
      md: 'Add a **Reset** pulse to `controls` that restarts the particle simulation — and make sure it also works from a script.',
      hints: [
        'Lesson 6.2: a Parameter Execute DAT watching `controls`, with *On Pulse* on.',
        'The Particle POP\'s *Start* pulse restarts the simulation from its input.',
      ],
      solution:
        'Add `Reset` (Pulse) to the Show page. Inside `controls` create a Parameter Execute DAT with *OPs* = `parent()` (expression), *Parameters* `Reset` and *On Pulse* on:\n\n```python\ndef onPulse(par):\n    if par.name == \'Reset\':\n        op(\'/project1/sim/particle1\').par.startpulse.pulse()\n    return\n```\n\nFrom a script, `op.CTRL.par.Reset.pulse()` fires the same callback.',
    },
    {
      kind: 'challenge',
      title: 'Silence fallback',
      md: 'In a quiet room between songs the image goes dead. When all three bands stay below a small threshold for more than five seconds, blend in a slow LFO "breathing" signal; when sound returns, fade it out again.',
      hints: [
        'A [[Math CHOP]] with *Combine Channels* set to **Maximum** reduces the three bands to one "is anything happening" value.',
        'A [[Lag CHOP]] with a long fall, or a [[Trigger CHOP]], turns that into a smooth 0–1 "sound present" signal; mix the bands with an [[LFO CHOP]] based on it.',
      ],
      solution:
        'From `bands`, a Math CHOP (*Combine Channels* **Maximum**) → a Logic-style threshold with a Math CHOP range (map 0–0.05 to 0–1 and clamp with a [[Limit CHOP]]) → a Lag CHOP with a quick rise and a ~5 s fall: call it `present`. Make an LFO CHOP with three slow channels (0.1–0.2 Hz, small amplitude). Then `bands_out = present * bands + (1 - present) * lfo` — two Math CHOPs (Multiply, then Add) — and point the expressions at `bands_out` instead of `bands`. In silence the cloud keeps breathing; when the music returns, it takes over within a fraction of a second.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Every network in the show reads `op.CTRL.par.Bass`. What makes that work from any depth?',
          options: [
            'A Parent Shortcut on `sim`',
            'The *Global OP Shortcut* `CTRL` on the `controls` component',
            'Exporting the parameter to every node',
            'Putting all nodes inside `controls`',
          ],
          answer: 1,
          explain: 'A Global OP Shortcut registers the component under `op.<name>` for the whole project, independent of where the expression lives.',
        },
        {
          q: 'Why does the Lag CHOP use a short rise and a longer fall?',
          options: [
            'To save CPU time',
            'So hits register immediately but decay smoothly instead of flickering',
            'Because audio is always negative',
            'To convert RMS power into decibels',
          ],
          answer: 1,
          explain: 'The rise sets how quickly a hit shows up; the fall sets how long it lingers. Asymmetric lag gives a punchy, musical response.',
        },
        {
          q: 'Why do the feedback TOPs run at 16-bit float while the output is 8-bit?',
          options: [
            '16-bit is faster',
            'Repeatedly dimming an 8-bit image causes visible banding and stuck values; the extra precision is needed only inside the loop',
            'The Window COMP requires it',
            'Bloom only works in 16-bit',
          ],
          answer: 1,
          explain: 'Each pass multiplies by a value below 1; at 8-bit those small steps round badly. After the loop, 8-bit is plenty and costs half the memory.',
        },
        {
          q: 'The bass drives a radial force and the mids drive curl noise. Why curl noise for the mids?',
          options: [
            'It is the only noise that runs on the GPU',
            'It swirls particles without pushing them all outward or clumping them, so it reads as turbulence',
            'It ignores the audio',
            'It removes the need for Velocity Damping',
          ],
          answer: 1,
          explain: 'Curl noise is divergence-free: it moves particles around each other rather than towards or away from points, which suits a continuous, textural band.',
        },
        {
          q: 'What does turning on *Start in Perform Mode* (Window Placement dialog) do for an installation?',
          options: [
            'Hides all errors',
            'Opens the project directly into the perform window on launch, without the network editor',
            'Makes the project run at 120 fps',
            'Locks the file so it cannot be edited',
          ],
          answer: 1,
          explain: 'Combined with launching the `.toe` at login, it means a power cut or reboot brings the piece straight back to the projector.',
        },
      ],
    },
  ],
};

export default lesson;
