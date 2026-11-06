import type { Lesson } from '../types';

const keysCode = `# CHOP Execute DAT watching keyboard1 (Off to On is on).
# Fires once each time a key goes down.
# channel.index is the key's position in keyboard1's Keys list:
# 0 for "1", 1 for "2", 2 for "3".

def onOffToOn(channel, sampleIndex, val, prev):
    op('preset').par.const0value = channel.index
    return
`;

const lesson: Lesson = {
  slug: 'interaction',
  title: 'Interaction & Live Control',
  subtitle: 'Mouse, keys, MIDI and OSC: turn raw input into smooth, reliable control — and build a field of points that parts around your hand.',
  minutes: 55,
  summary:
    'Read the mouse with the [[Mouse In CHOP]], smooth it with a One Euro [[Filter CHOP]], convert it to world space for an orthographic camera and let a [[Field POP]] and [[Math Mix POP]] push points out of its way. Add a click shockwave with the [[Trigger CHOP]], keyboard layout presets with a [[CHOP Execute DAT]] and a blending [[Switch POP]], then map MIDI and OSC controllers.',
  objectives: [
    'Condition raw input: select, smooth, scale and name channels before anything uses them',
    'Convert normalized mouse coordinates into world space for an orthographic camera',
    'Drive a [[Field POP]] and [[Math Mix POP]] from a CHOP so points react to the cursor',
    'Turn button presses into envelopes with the [[Trigger CHOP]] and key presses into actions with a [[CHOP Execute DAT]]',
    'Map MIDI CC and OSC messages onto parameters with sensible ranges and smoothing',
  ],
  requires: ['fields-and-weights', 'chops-drive-pops', 'reusable-components'],
  tags: ['interaction', 'mouse', 'keyboard', 'midi', 'osc', 'field', 'installation'],
  blocks: [
    {
      kind: 'md',
      md: `
A piece that reacts to a person feels completely different from one that only plays. In this lesson you'll build a dense field of glowing points that **parts around the cursor** like water around a hand, sends out a **shockwave when you click**, and **morphs between layouts** when you press 1, 2 or 3. Then you'll hang MIDI and OSC controllers off the same network so a performer can play it from a desk or a phone.

The devices differ, but the craft is the same every time: raw input is noisy, in the wrong units and in the wrong place. Most of an interaction network is *conditioning* — and once the numbers are clean, the POP side is short.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'The input pipeline',
      md: `Every live control in this lesson goes through the same five stages:

1. **Read** — an input CHOP (Mouse In, Keyboard In, MIDI In, OSC In).
2. **Select** — keep only the channels you use, with names you chose.
3. **Smooth** — a [[Filter CHOP]] or [[Lag CHOP]] removes jitter and zipper steps.
4. **Map** — scale and offset into the units of the thing you drive (world units, degrees, a 0–1 strength).
5. **Expose** — end in a [[Null CHOP]] with a good name. Everything downstream reads that Null.

Stage 5 is what makes a show maintainable: swap the mouse for a tracking camera later, and only the first four stages change.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'cursor-field',
        title: 'Points that part around the cursor',
        root: '/project1',
        height: 600,
        caption:
          'Top row: mouse → smooth → world space → `cursor`. Middle: the click becomes an envelope. Bottom: keys choose a layout that blends smoothly. Dive into **geo1** for the POP side: three layouts → Switch (blending) → Field (weight around the cursor) → Math Mix (push and colour).',
        nodes: [
          {
            id: 'mouse1',
            type: 'mouseinCHOP',
            x: 0,
            y: 0,
            params: {
              Active: 'On',
              'Output Coordinates': 'Normalized',
              'Position X': 'tx',
              'Position Y': 'ty',
              'Left Button': 'lselect',
            },
            note: 'Reads the system mouse. In *Normalized* mode the position runs roughly from −1 to 1 across the screen — move to the corners and watch the channels to confirm on your setup. We name the channels ourselves so nothing depends on defaults.',
          },
          {
            id: 'select_xy',
            type: 'selectCHOP',
            x: 1,
            y: 0,
            params: { CHOP: { ref: 'mouse1' }, 'Channel Names': 'tx ty' },
            note: 'Keeps only the position. The button channel must not go through the smoothing filter — a smeared click is useless.',
          },
          {
            id: 'filter1',
            type: 'filterCHOP',
            x: 2,
            y: 0,
            inputs: ['select_xy'],
            params: { Type: 'One Euro', 'Cutoff Frequency (Hz)': 1, 'Speed Coefficient': 0.5 },
            note: 'The One Euro filter smooths hard when the hand is slow (no jitter) and barely at all when it moves fast (no lag). Starting values — tune them as described below.',
          },
          {
            id: 'scale1',
            type: 'constantCHOP',
            x: 2,
            y: 1,
            params: {
              'Name[0]': 'tx',
              'Value[0]': { expr: "op('cam1').par.orthowidth / 2" },
              'Name[1]': 'ty',
              'Value[1]': { expr: "op('cam1').par.orthowidth / 2 * op('render1').par.resolutionh / op('render1').par.resolutionw" },
            },
            note: 'Half the visible width and half the visible height, in world units, computed from the camera and the render resolution. Change either and the mapping follows. We read the Render TOP\'s *parameters*, not its image size, so this never forces it to cook.',
          },
          {
            id: 'toworld',
            type: 'mathCHOP',
            x: 3,
            y: 0,
            inputs: ['filter1', 'scale1'],
            params: { 'Combine CHOPs': 'Multiply', 'Match by': 'Channel Name' },
            note: 'Multiplies `tx` by the half-width and `ty` by the half-height: normalized screen position becomes a position in the world.',
          },
          {
            id: 'cursor',
            type: 'nullCHOP',
            x: 4,
            y: 0,
            inputs: ['toworld'],
            note: 'The cursor in world units. The POPs read only this node — replace everything to its left with a tracker one day and nothing else changes.',
          },
          {
            id: 'select_click',
            type: 'selectCHOP',
            x: 1,
            y: 2,
            params: { CHOP: { ref: 'mouse1' }, 'Channel Names': 'lselect' },
            note: 'The left button on its own: 1 while pressed, 0 otherwise.',
          },
          {
            id: 'trigger1',
            type: 'triggerCHOP',
            x: 2,
            y: 2,
            inputs: ['select_click'],
            params: { 'Attack Length': 0.03, 'Peak Level': 1, 'Decay Length': 0.8, 'Decay Shape': 'Ease Out', 'Sustain Level': 0 },
            note: 'Turns a click into a shape over time: a fast rise and a soft 0.8 s decay. *Sustain Level* 0 means holding the button doesn\'t hold the effect.',
          },
          {
            id: 'keyboard1',
            type: 'keyboardinCHOP',
            x: 0,
            y: 3,
            params: { Active: 'On', Keys: '1 2 3' },
            note: 'One channel per listed key, 1 while held. We don\'t rely on the channel names — the CHOP Execute DAT uses each channel\'s position instead.',
          },
          {
            id: 'keys_exec',
            type: 'chopexecuteDAT',
            x: 1,
            y: 3,
            params: { CHOP: { ref: 'keyboard1' }, 'Off to On': true },
            code: { lang: 'python', text: keysCode },
            note: 'Turns a momentary key press into a lasting choice: it writes the key\'s index into `preset`.',
          },
          {
            id: 'preset',
            type: 'constantCHOP',
            x: 2,
            y: 3,
            params: { 'Name[0]': 'index', 'Value[0]': 0 },
            note: 'Holds the chosen layout (0, 1 or 2). Its *Value* is set by Python, so it is also a handy place to change the layout by hand.',
          },
          {
            id: 'layout',
            type: 'lagCHOP',
            x: 3,
            y: 3,
            inputs: ['preset'],
            params: { Lag: [0.6, 0.6] },
            note: 'Glides the index over about 0.6 s instead of jumping, which the Switch POP turns into a morph.',
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 5,
            y: 1,
            params: { Material: { ref: 'line1' } },
            note: 'All the POPs. The CHOPs live outside, so the expressions inside use absolute paths like `/project1/cursor` to reach them.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: { Connectivity: 'Point Primitives', Size: [4, 2.25], Columns: 160, Rows: 90 },
                note: 'Layout 0: an even grid exactly the size of the camera\'s view (4 × 2.25 at 16:9). 160 × 90 = 14 400 points, each with a point primitive so it can be drawn.',
              },
              {
                id: 'grid2',
                type: 'gridPOP',
                x: 0,
                y: 1,
                params: { Connectivity: 'Point Primitives', Size: [4, 2.25], Columns: 160, Rows: 90, Random: [1, 1, 0] },
                note: 'Layout 1: the same grid with every point randomized inside its own cell — organic, but still evenly spread. Same point count, so it can blend with layout 0.',
              },
              {
                id: 'noise_layout',
                type: 'noisePOP',
                x: 1,
                y: 2,
                inputs: ['grid1'],
                params: { Type: 'Simplex 3D (GPU)', Period: 1.5, Amplitude: 0.25 },
                note: 'Layout 2: the even grid warped into flowing bands.',
              },
              {
                id: 'switch1',
                type: 'switchPOP',
                x: 2,
                y: 1,
                inputs: ['grid1', 'grid2', 'noise_layout'],
                params: {
                  Index: { expr: "op('/project1/layout')['index']" },
                  'Blend between Inputs': true,
                },
                note: 'With *Blend between Inputs* on, a fractional index mixes neighbouring inputs point by point — the lagged index becomes a smooth morph. Going from 0 to 2 passes through layout 1 on the way.',
              },
              {
                id: 'field1',
                type: 'fieldPOP',
                x: 3,
                y: 1,
                inputs: ['switch1'],
                params: {
                  Mode: 'Sphere',
                  Radius: [0.6, 0.6, 0.6],
                  'Transition Range': 0.5,
                  'Transition Type': 'Smooth Step',
                  Translate: [{ expr: "op('/project1/cursor')['tx']" }, { expr: "op('/project1/cursor')['ty']" }, 0],
                  Weight: true,
                },
                note: 'Writes `Weight`: 1 near the cursor, falling smoothly to 0 across the transition range. The field\'s *Translate* follows the cursor.',
              },
              {
                id: 'parting',
                type: 'mathmixPOP',
                x: 4,
                y: 1,
                inputs: ['field1'],
                params: {
                  'Name[0]': 'cursor',
                  'Type[0]': 'float3',
                  'Value[0]': [{ expr: "op('/project1/cursor')['tx']" }, { expr: "op('/project1/cursor')['ty']" }, 0],
                  'Name[1]': 'push',
                  'Type[1]': 'float',
                  'Value[1]': [{ expr: "0.35 + op('/project1/trigger1')[0] * 0.6" }],
                  'Operation[0]': 'A - B',
                  'Scope A[0]': 'P',
                  'Scope B[0]': 'cursor',
                  'Result Scope[0]': 'away',
                  'Operation[1]': 'normalize(A)',
                  'Scope A[1]': 'away',
                  'Result Scope[1]': 'away',
                  'Operation[2]': 'A * B * C',
                  'Scope A[2]': 'away',
                  'Scope B[2]': 'Weight',
                  'Scope C[2]': 'push',
                  'Result Scope[2]': 'away',
                  'Operation[3]': 'A + B',
                  'Scope A[3]': 'P',
                  'Scope B[3]': 'away',
                  'Result Scope[3]': 'P',
                  'Operation[4]': 'mix(A, B, C)',
                  'Scope A[4]': '0.3 0.45 0.65 1',
                  'Scope B[4]': '1 0.6 0.3 1',
                  'Scope C[4]': 'Weight',
                  'Result Scope[4]': 'Color',
                  'Delete Attributes': 'away',
                },
                note: 'Five tiny equations: direction from cursor to point, normalized, scaled by `Weight` and `push`, added to `P`; then colour blends from cool to warm by `Weight`. Middle-click it to read the pseudo-code.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 5,
                y: 1,
                inputs: ['parting'],
                flags: { display: true, render: true },
                note: 'Render and display flags live here.',
              },
            ],
            childComments: [{ x: 0, y: -0.9, w: 3, text: 'Three layouts with identical point counts, so the Switch can blend them.' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 5,
            y: 2.3,
            params: { 'Xform:Translate': [0, 0, 5], Projection: 'Orthographic', 'Ortho Width': 4 },
            note: 'Orthographic: no perspective, and exactly 4 world units across the image. That makes the cursor mapping a simple scale.',
          },
          {
            id: 'line1',
            type: 'lineMAT',
            x: 6,
            y: 2.3,
            params: { 'Draw Points': true, 'Point Type': 'Circle', 'Point Color Attribute': 'Color' },
            note: 'Draws each point as a dot coloured by the `Color` attribute that `parting` writes. Adjust *Point Size Multiplier* (Point page) until the dots read clearly.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 6,
            y: 1,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.02, 0.03, 1],
              'Output Resolution': 'Custom Resolution',
              Resolution: [1920, 1080],
            },
            note: 'A fixed 1920 × 1080 output. `scale1` reads these resolution parameters to compute the visible height.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 7,
            y: 1,
            inputs: ['render1'],
            note: 'The final image — point a Window COMP at it for Perform Mode.',
          },
        ],
        boxes: [
          { title: 'Cursor', nodes: ['mouse1', 'select_xy', 'filter1', 'scale1', 'toworld', 'cursor'], tone: 'green' },
          { title: 'Click', nodes: ['select_click', 'trigger1'], tone: 'orange' },
          { title: 'Presets', nodes: ['keyboard1', 'keys_exec', 'preset', 'layout'], tone: 'purple' },
        ],
        steps: [
          {
            title: 'A field of points',
            body: `Create a Geometry COMP \`geo1\` and clear its contents. Inside, add a **Grid POP** \`grid1\`: *Connectivity* **Point Primitives**, *Size* **4, 2.25**, *Columns* **160**, *Rows* **90**. Wire it into a **Null POP** \`null1\` with render and display flags. (You'll insert nodes between them as you go.)`,
            nodes: ['geo1', 'grid1', 'null1'],
          },
          {
            title: 'An orthographic view',
            body: `In \`/project1\`, create a **Camera COMP** \`cam1\`: *Translate* **0, 0, 5**, and on the *View* page *Projection* **Orthographic**, *Ortho Width* **4**.

Create a **Line MAT** \`line1\` (*Draw Points* on, *Point Type* **Circle**, and *Point Color Attribute* \`Color\` on the *Attributes* page) and assign it to \`geo1\`. Add a **Render TOP** \`render1\` with *Output Resolution* **Custom Resolution** at **1920 × 1080** and *Anti-Alias* **4x**, and a **Null TOP** \`out1\`. The grid should exactly fill the frame.`,
            nodes: ['cam1', 'line1', 'render1', 'out1'],
          },
          {
            title: 'Read and smooth the mouse',
            body: `Create a **Mouse In CHOP** \`mouse1\`: *Active* **On**, *Output Coordinates* **Normalized**, and name the channels yourself — *Position X* \`tx\`, *Position Y* \`ty\`, *Left Button* \`lselect\`.

Add a **Select CHOP** \`select_xy\` with *CHOP* = \`mouse1\` and *Channel Names* \`tx ty\`, then a **Filter CHOP** \`filter1\` with *Type* **One Euro**, *Cutoff Frequency (Hz)* **1** and *Speed Coefficient* **0.5**. Move the mouse and compare the two viewers.`,
            nodes: ['mouse1', 'select_xy', 'filter1'],
          },
          {
            title: 'Screen to world',
            body: `Create a **Constant CHOP** \`scale1\` with two channels: \`tx\` = \`op('cam1').par.orthowidth / 2\` and \`ty\` = \`op('cam1').par.orthowidth / 2 * op('render1').par.resolutionh / op('render1').par.resolutionw\`.

Wire \`filter1\` and \`scale1\` into a **Math CHOP** \`toworld\` with *Combine CHOPs* **Multiply** and *Match by* **Channel Name**, and end in a **Null CHOP** \`cursor\`. With the mouse at the right edge of the screen, \`tx\` should read about 2.`,
            nodes: ['scale1', 'toworld', 'cursor'],
          },
          {
            title: 'A soft zone around the cursor',
            body: `Inside \`geo1\`, insert a **Field POP** \`field1\` between \`grid1\` and \`null1\`: *Mode* **Sphere**, *Radius* **0.6**, *Transition Range* **0.5**, *Transition Type* **Smooth Step**. On its *Transform* page set *Translate X* to \`op('/project1/cursor')['tx']\` and *Translate Y* to \`op('/project1/cursor')['ty']\`.

Middle-click \`field1\`: it now carries a \`Weight\` attribute that follows your hand.`,
            nodes: ['field1'],
          },
          {
            title: 'Part the points',
            body: `Insert a **Math Mix POP** \`parting\` after \`field1\`.

On the **Uniforms** page add two vectors: \`cursor\` (**float3**, values = the same two cursor expressions and 0) and \`push\` (**float**, \`0.35\` for now).

On the **Combine** page add five blocks: \`P\` **A - B** \`cursor\` → \`away\`; **normalize(A)** of \`away\` → \`away\`; \`away\` **A * B * C** \`Weight\` \`push\` → \`away\`; \`P\` **A + B** \`away\` → \`P\`; and **mix(A, B, C)** of \`0.3 0.45 0.65 1\`, \`1 0.6 0.3 1\` and \`Weight\` → \`Color\`. On the *Output* page put \`away\` in *Delete Attributes*.

Points now slide out of the cursor's way and glow warm where they're displaced.`,
            nodes: ['parting'],
          },
          {
            title: 'Click for a shockwave',
            body: `Create a **Select CHOP** \`select_click\` (*CHOP* \`mouse1\`, *Channel Names* \`lselect\`) and a **Trigger CHOP** \`trigger1\` after it: *Attack Length* **0.03**, *Peak Level* **1**, *Decay Length* **0.8**, *Decay Shape* **Ease Out**, *Sustain Level* **0**.

Back in \`parting\`, change the \`push\` value to the expression \`0.35 + op('/project1/trigger1')[0] * 0.6\`. Each click now throws the points outward and lets them settle.`,
            nodes: ['select_click', 'trigger1'],
            focus: ['parting'],
          },
          {
            title: 'Three layouts',
            body: `Inside \`geo1\`, add a second **Grid POP** \`grid2\` with the same settings plus *Random* **1, 1, 0**, and a **Noise POP** \`noise_layout\` fed by \`grid1\` (*Type* **Simplex 3D (GPU)**, *Period* **1.5**, *Amplitude* **0.25**).

Wire \`grid1\`, \`grid2\` and \`noise_layout\` into a **Switch POP** \`switch1\`, turn on **Blend between Inputs**, and connect it to \`field1\` in place of \`grid1\`. Try typing 0.5 or 1.7 into *Index* — the layouts blend.`,
            nodes: ['grid2', 'noise_layout', 'switch1'],
          },
          {
            title: 'Keys choose the layout',
            body: `Create a **Keyboard In CHOP** \`keyboard1\` (*Active* **On**, *Keys* \`1 2 3\`), a **Constant CHOP** \`preset\` with one channel \`index\`, and a **Lag CHOP** \`layout\` after it with *Lag* **0.6, 0.6**.

Create a **CHOP Execute DAT** \`keys_exec\`: *CHOP* = \`keyboard1\`, **Off to On** on, and paste the code from the inspector. Finally set \`switch1\`'s *Index* to \`op('/project1/layout')['index']\`. Press 1, 2, 3 and watch the field morph.`,
            nodes: ['keyboard1', 'keys_exec', 'preset', 'layout'],
            focus: ['switch1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why the network looks like this

### From screen to world

An orthographic camera shows a window of the world that is exactly *Ortho Width* units wide. Its height follows from the image's aspect ratio: at 1920 × 1080, a width of 4 shows a height of 4 × 1080 / 1920 = 2.25. The camera looks at the origin, so the visible area runs from −2 to 2 in X and −1.125 to 1.125 in Y.

The Mouse In CHOP's normalized coordinates run from about −1 to 1 across the screen in both directions. Multiplying X by half the visible width and Y by half the visible height lines the two up — that's all \`scale1\` and \`toworld\` do. Because the scale factors are expressions on the camera and render parameters, zooming the camera or changing the output resolution keeps the cursor aligned.

The Mouse In CHOP measures the whole screen, so the alignment is exact when your output fills the screen in **Perform Mode**. In the editor, the cursor lines up with the screen, not with a small viewer — which is fine for testing, but see the tip below for exact mapping inside a window.

With a **perspective** camera the cursor describes a ray, not a point. You'd have to pick a depth (for instance the plane your points live on) and intersect — or use the [[Render Pick CHOP]] to ask the renderer what's under the cursor.

### Smoothing that doesn't feel laggy

A plain [[Lag CHOP]] or Gaussian [[Filter CHOP]] trades jitter for latency: smooth enough to hide a trembling hand means sluggish when the hand moves fast. The **One Euro** filter adapts — at low speed it filters heavily, at high speed it opens up. Tune it in two passes: hold the mouse almost still and lower *Cutoff Frequency* until the jitter is gone; then move fast and raise *Speed Coefficient* until the lag disappears. Use a Lag CHOP where you *want* inertia, like the preset glide.

### Moments vs states

Inputs come in two kinds. **States** (a position, a knob) are used continuously — read them through a Null. **Moments** (a click, a key press) need to become something with duration or memory:

* The [[Trigger CHOP]] turns a moment into an **envelope** — attack, peak, decay, sustain, release — ideal for hits, flashes and shockwaves.
* A [[CHOP Execute DAT]] turns a moment into an **action**. Its \`onOffToOn(channel, sampleIndex, val, prev)\` runs once when a channel crosses from off to on; here it stores a choice in a Constant CHOP, which is a *state* again.

### Why the Math Mix maths works

Block 0 gives each point the vector from the cursor to itself. Block 1 normalizes it to length 1 — a pure direction, "away from the cursor". Block 2 scales it by \`Weight\` (1 close to the cursor, 0 outside the field) and by \`push\`, so only nearby points move, and by an amount the click can boost. Block 3 adds that offset to \`P\`. Because the push is strongest right at the cursor, the points there are thrown furthest and an empty pocket opens under your hand. (A point sitting exactly on the cursor has no direction to go; in practice the grid spacing makes that vanishingly rare.)
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Exact mapping inside a window: the Panel CHOP',
      md: 'If the output is shown in a panel — say a [[Container COMP]] whose background is `out1`, opened by a Window COMP — a [[Panel CHOP]] pointed at that container reports the cursor *relative to the panel*: `rollu`/`rollv` while hovering, `u`/`v` while a button is down, plus `inside` and `lselect`. Map `rollu` from 0–1 to −2…2 and `rollv` to −1.125…1.125 and the cursor is exact wherever the window sits, even on a second display.',
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Keyboard input in a show',
      md: 'The Keyboard In CHOP can miss very fast repeats and only covers letters and numbers. For a few preset keys it\'s perfect. For anything more (shortcuts, text entry, every key), a [[Keyboard In DAT]] or a [[Panel Execute DAT]] watching a panel\'s `key` value catches every keystroke. Either way, use the CHOP\'s *Panels* parameter (or keep the perform window focused) so typing in another app doesn\'t change your show.',
    },
    {
      kind: 'graph',
      graph: {
        id: 'control-surface',
        title: 'MIDI and OSC control surface',
        root: '/project1',
        height: 380,
        caption:
          'Two remote-control inputs conditioned the same way: read → smooth → expose. `midi_ctrl` holds four knobs as `c1`–`c4` in the 0–1 range; `osc_ctrl` holds whatever addresses your OSC app sends.',
        nodes: [
          {
            id: 'midiin1',
            type: 'midiinCHOP',
            x: 0,
            y: 0,
            params: {
              Mode: 'Manual',
              'Device ID': '1',
              'MIDI Channels': '1',
              'Controller Name': 'c',
              'Controller Index': '1-4',
              'Control:Normalize': '0 to 1',
            },
            note: 'Reads Control Change messages 1–4 on MIDI channel 1 from the device with ID 1 (set up in *Dialogs → MIDI Device Mapper*). *Controller Name* `c` plus the index gives channels like `c1`–`c4`; *Normalize* maps 0–127 to 0–1.',
          },
          {
            id: 'midi_lag',
            type: 'lagCHOP',
            x: 1,
            y: 0,
            inputs: ['midiin1'],
            params: { Lag: [0.08, 0.08] },
            note: 'A 7-bit knob only has 128 steps; a short lag hides the staircase when it drives motion directly.',
          },
          {
            id: 'midi_ctrl',
            type: 'nullCHOP',
            x: 2,
            y: 0,
            inputs: ['midi_lag'],
            note: 'The MIDI controls, ready to be read by any parameter expression.',
          },
          {
            id: 'oscin1',
            type: 'oscinCHOP',
            x: 0,
            y: 1.2,
            params: { 'Network Port': 7000 },
            note: 'Listens for OSC messages on UDP port 7000. One channel appears per OSC address as messages arrive — move each control on your phone or tablet once to create its channel.',
          },
          {
            id: 'osc_lag',
            type: 'lagCHOP',
            x: 1,
            y: 1.2,
            inputs: ['oscin1'],
            params: { Lag: [0.05, 0.05] },
            note: 'Network messages arrive in uneven bursts; a little lag keeps motion fluid.',
          },
          {
            id: 'osc_ctrl',
            type: 'nullCHOP',
            x: 2,
            y: 1.2,
            inputs: ['osc_lag'],
            note: 'The OSC controls. Read channel names from its viewer and reference them like any other channel.',
          },
        ],
        steps: [
          {
            title: 'MIDI in',
            body: `Open *Dialogs → MIDI Device Mapper*, add your controller as an input device and note its ID. Create a **MIDI In CHOP** \`midiin1\`: *Mode* **Manual**, *Device ID* = that ID, *MIDI Channels* \`1\`. On the *Control* page set *Controller Name* \`c\`, *Controller Index* \`1-4\` (the CC numbers your knobs send — check the controller's manual) and *Normalize* **0 to 1**. Turn the knobs and watch the channels appear.`,
            nodes: ['midiin1'],
          },
          {
            title: 'Smooth and expose',
            body: `Append a **Lag CHOP** \`midi_lag\` (*Lag* **0.08, 0.08**) and a **Null CHOP** \`midi_ctrl\`.`,
            nodes: ['midi_lag', 'midi_ctrl'],
          },
          {
            title: 'OSC from a phone',
            body: `Create an **OSC In CHOP** \`oscin1\` with *Network Port* **7000**, then a **Lag CHOP** \`osc_lag\` and a **Null CHOP** \`osc_ctrl\`. In your OSC app, send to this computer's IP address on port 7000 and move a fader — a channel named after its address appears.`,
            nodes: ['oscin1', 'osc_lag', 'osc_ctrl'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Mapping controls onto parameters

A normalized knob gives you 0–1; the parameter wants its own range. \`tdu.remap(value, fromMin, fromMax, toMin, toMax)\` does the conversion inside any expression:

| Parameter | Expression |
|---|---|
| \`field1\` *Radius* (all three) | \`tdu.remap(op('/project1/midi_ctrl')['c1'], 0, 1, 0.2, 1.5)\` |
| \`parting\` \`push\` uniform | \`tdu.remap(op('/project1/midi_ctrl')['c2'], 0, 1, 0, 1) + op('/project1/trigger1')[0] * 0.6\` |
| \`layout\` *Lag* | \`tdu.remap(op('/project1/midi_ctrl')['c3'], 0, 1, 0.1, 3)\` |

Three habits make controllers pleasant to play:

* **Give every knob a useful full range.** If only the first quarter of the travel does anything interesting, remap it. Square the value (\`v * v\`) for controls that need fine adjustment near zero, like a radius or a speed.
* **Expect jumps on startup.** TouchDesigner saves the last received MIDI values in the \`.toe\`, but the physical knobs may sit elsewhere when you reopen it; the first touch jumps to the knob's real position. Before a show, sweep every control once.
* **Know your network.** OSC In listens on a UDP port that nothing else may be using. On Windows, the firewall is the usual reason "nothing arrives" — allow TouchDesigner through it, and put the phone and computer on the same network.

Because everything downstream reads \`cursor\`, \`midi_ctrl\` and \`osc_ctrl\`, you can mix sources freely: the mouse for testing, a tracker on site, knobs for the operator, a phone for a guest performer.
`,
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Swap the push for a swirl: cross the `away` vector with `0 0 1` (Math Mix **cross(A, B)**) and points orbit the cursor instead of fleeing it. Feed the parted points into a [[Trail POP]] for ink-like streaks, or drive the [[Field POP]]\'s *Radius* from an audio band so the room\'s sound decides how big your influence is.',
    },
    {
      kind: 'challenge',
      title: 'B for bloom',
      md: 'Add a key **B** that toggles between the plain render and a bloomed version of it. The switch should be a clean cut, and pressing B again should switch back.',
      hints: [
        'A [[Switch TOP]] with two inputs and an *Index* of 0 or 1 does the cut.',
        'Toggling means "flip the current state" — the CHOP Execute DAT can read the current index and write the opposite.',
      ],
      solution:
        'Add a [[Bloom TOP]] after `render1` and a Switch TOP `look` with inputs `render1` and the bloom; point `out1` at `look`. Add `B` to a second Keyboard In CHOP (or extend the first one\'s *Keys* to `1 2 3 b` and check `channel.index == 3`). In its CHOP Execute `onOffToOn`: `s = op(\'look\').par.index; s.val = 1 - int(s.eval())`.',
    },
    {
      kind: 'challenge',
      title: 'Autopilot when nobody is there',
      md: 'In an installation, nobody may touch the mouse for minutes. Make the cursor drift slowly by itself when the mouse hasn\'t moved for 10 seconds, and hand control back the moment someone moves it.',
      hints: [
        'You need two things: a wandering position (an [[LFO CHOP]] or [[Noise CHOP]] in world units) and a 0–1 "someone is here" signal.',
        'The [[Slope CHOP]] gives speed; a [[Trigger CHOP]] with a long sustain or a [[Lag CHOP]] with a long fall time can turn movement into a presence value that fades after 10 s.',
      ],
      solution:
        'Make a Noise CHOP with channels `tx ty` scaled to about ±1.5 / ±0.8. From `cursor`, take a Slope CHOP, a Math CHOP set to absolute values (*Channel Pre OP* **Positive**) and *Combine Channels* **Maximum**, then a Lag CHOP with a near-zero rise and a 10-second fall: that is `presence`, 1 while moving and fading to 0 after ten idle seconds. Blend the two positions with a Math CHOP or expressions: `presence * cursor + (1 - presence) * autopilot`, and point the Field POP and Math Mix at the blend instead of `cursor`.',
    },
    {
      kind: 'challenge',
      title: 'A knob with a curve',
      md: 'Map MIDI knob `c1` to the field radius so that the first half of the knob covers 0.2–0.5 (fine control) and the second half 0.5–1.5.',
      hints: ['A power curve compresses the low end: `v ** 2` or `v ** 1.6` before remapping.'],
      solution:
        'Solve `0.2 + 1.3 * 0.5^k = 0.5` → `0.5^k ≈ 0.23` → `k ≈ 2.1`. So use `0.2 + 1.3 * op(\'/project1/midi_ctrl\')[\'c1\'] ** 2.1` for all three components of *Radius*. Halfway lands near 0.5 and the full turn reaches 1.5.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'An orthographic camera has *Ortho Width* 4 and renders 1920 × 1080. How tall is the visible area in world units?',
          options: ['4', '2.25', '1.125', '7.1'],
          answer: 1,
          explain: 'Height = width × 1080 / 1920 = 2.25, so Y runs from −1.125 to 1.125 around the camera\'s centre.',
        },
        {
          q: 'Why use a One Euro filter on the mouse instead of a long Lag?',
          options: [
            'It is the only filter that works on two channels',
            'It smooths strongly when movement is slow and little when it is fast, so you get low jitter without sluggishness',
            'It converts coordinates to world space',
            'It removes the need for a Null CHOP',
          ],
          answer: 1,
          explain: 'A fixed lag must choose between jitter and latency. The One Euro filter adapts its cutoff to the speed of the signal.',
        },
        {
          q: 'Which callback in a CHOP Execute DAT runs once when a key goes down?',
          options: ['`whileOn`', '`onOffToOn`', '`onValueChange` only', '`onPulse`'],
          answer: 1,
          explain: '`onOffToOn(channel, sampleIndex, val, prev)` fires on the transition from off to on, if the *Off to On* toggle is enabled.',
        },
        {
          q: 'Your output runs in a window on a second display. Which operator gives cursor coordinates relative to that output exactly?',
          options: ['Mouse In CHOP in Normalized mode', 'Panel CHOP on the container the window shows', 'Keyboard In CHOP', 'Info CHOP on the Window COMP'],
          answer: 1,
          explain: 'The Panel CHOP reports panel values such as `rollu`/`rollv`, measured within the panel, so it doesn\'t matter where the window is.',
        },
        {
          q: 'Why do the three layouts in `geo1` need the same point count?',
          options: [
            'The Field POP requires it',
            'With *Blend between Inputs* on, the Switch POP mixes inputs point by point',
            'The Line MAT can only draw 14 400 points',
            'Keyboard In CHOP channels map to points',
          ],
          answer: 1,
          explain: 'Blending pairs point *i* of one input with point *i* of the next. Equal counts (and a consistent order) make the morph clean.',
        },
      ],
    },
  ],
};

export default lesson;
