import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'dataviz-timeseries',
  title: 'Time Series & Live Streams',
  subtitle: 'Record a live signal, turn its history into line strips and keep a scrolling chart honest and readable.',
  minutes: 45,
  summary:
    'A live multi-series line chart: a stand-in signal (swappable for OSC, sensors or TouchDesigner\'s own performance data) recorded by a [[Trail CHOP]], converted to line strips with the [[CHOP to POP]], split per series, scaled into a plot area, colored from a categorical palette and drawn with the [[Line MAT]] — including a dot on each newest value.',
  objectives: [
    'Keep a sliding window of history with the [[Trail CHOP]]',
    'Turn many CHOP channels into one line strip per series with the [[Shuffle CHOP]], [[CHOP to POP]] and [[Line Break POP]]',
    'Use the [[Line Metrics POP]] to get per-series time and series index attributes',
    'Build x and y scales with ReRange POPs and a categorical palette with a stepped ramp',
    'Style lines and highlight the latest value with the [[Line MAT]]',
    'Swap the stand-in source for a live one without touching the chart',
  ],
  requires: ['chops-drive-pops', 'lines-and-curves'],
  tags: ['data viz', 'time series', 'trail chop', 'chop to pop', 'line mat', 'live data'],
  blocks: [
    {
      kind: 'md',
      md: `
Most live data is a stream: a sensor reading every frame, a value arriving over OSC, the CPU load of a machine, the loudness of a room. A single number is hard to read — you can't tell whether 63 is high, rising or about to fall. Give it a **history** and it becomes a line, and a line tells a story.

In this lesson you'll build a scrolling line chart with three series. The newest values enter on the right, old values slide off on the left, each series has its own color, and a dot marks where each line is *right now*. The chart is driven by a stand-in source so you can build it anywhere, and the last step shows how to plug in something real.

## Two families, two jobs

The division of labour is the same one you've used since Module 1:

* **CHOPs handle time.** They are built for streams: sampling, filtering, recording history. The [[Trail CHOP]] keeps the last *N* seconds of whatever you feed it, as a channel of samples.
* **POPs handle shape.** Once the history exists as samples, the [[CHOP to POP]] turns *each sample into a point*. Connect the points and the history is a line strip you can scale, color and render like any other geometry.

The interesting part is the bridge: three channels of history need to become **three separate line strips**, each knowing where it is in time and which series it belongs to.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'From channels to strips, in four moves',
      md: `1. **Record** — the Trail CHOP turns three time-sliced channels into three channels of, say, 600 samples (10 seconds at 60 fps).
2. **Sequence** — the [[Shuffle CHOP]] in *Sequence All Channels* mode lays them end to end: one channel of 1800 samples, series after series.
3. **Convert and split** — the CHOP to POP makes 1800 points (the value goes straight into \`P.y\`), and the [[Line Break POP]] starts a new line strip every 600 points.
4. **Measure** — the [[Line Metrics POP]] tells every point how far along its strip it is (0→1) and which strip it belongs to. Those two numbers become the x position and the color.

The payoff: adding a fourth series is just adding a fourth channel. Nothing in the POP chain changes.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'live-lines',
        title: 'Scrolling multi-series line chart',
        root: '/project1',
        height: 600,
        caption:
          'CHOPs on the left produce and record the signal. Inside `geo_lines`, POPs turn the history into colored line strips. `geo_grid` holds the plot frame and gridlines. Expressions and CHOP references inside the Geometry COMPs use `../` because the CHOPs live one level up.',
        nodes: [
          {
            id: 'noise1',
            type: 'noiseCHOP',
            x: 0,
            y: 0,
            params: { 'Channel Names': 'a b c', Period: 3, 'Time Slice': true },
            note: 'The **stand-in source**: three smoothly wandering channels, one value per frame (Time Slice on). Anything that outputs time-sliced channels can replace it later.',
          },
          {
            id: 'math1',
            type: 'mathCHOP',
            x: 1,
            y: 0,
            inputs: ['noise1'],
            params: { Multiply: 30, 'Post-Add': 50 },
            note: 'Puts the stand-in into plausible **data units** — think "percent", hovering around 50. Keep data in its own units here; turning units into screen positions is the scales\' job, later.',
          },
          {
            id: 'trail1',
            type: 'trailCHOP',
            x: 2,
            y: 0,
            inputs: ['math1'],
            params: { 'Window Length': 10 },
            note: 'Keeps the last 10 seconds of each channel (set the unit menu beside *Window Length* to seconds). The newest sample is always the last one, so history scrolls right-to-left for free.',
          },
          {
            id: 'shuffle1',
            type: 'shuffleCHOP',
            x: 3,
            y: 0,
            inputs: ['trail1'],
            params: { Method: 'Sequence All Channels' },
            note: 'Lays the channels end to end: all of `a`, then all of `b`, then all of `c`, in one long channel. One channel means one CHOP to POP, however many series you have.',
          },
          {
            id: 'history',
            type: 'nullCHOP',
            x: 4,
            y: 0,
            inputs: ['shuffle1'],
            note: 'The stable hand-off point between the CHOP world and the POP world.',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 4,
            y: 1.2,
            params: { Type: 'Horizontal', 'Interpolate Notches': 'Step' },
            note: 'A **categorical** palette: three keys at roughly 0, 0.33 and 0.67, with *Step* interpolation so each series gets one flat color — no in-between blends. Pick hues that differ clearly in lightness too, so the chart still works for color-blind viewers.',
          },
          {
            id: 'geo_lines',
            type: 'geometryCOMP',
            x: 5,
            y: 0,
            params: { Material: { ref: 'linemat1' } },
            note: 'Holds the whole POP side of the chart. Its material is the Line MAT, which turns line strips into clean, camera-facing strokes.',
            children: [
              {
                id: 'chop2pop1',
                type: 'choptoPOP',
                x: 0,
                y: 0,
                params: {
                  CHOP: { ref: '../history' },
                  Connectivity: 'None',
                  'Channels Selection': 'Specify Channels',
                  chanscope: '*',
                  'Attribute Scope': 'P(1)',
                },
                note: 'One point per sample. *Channel Scope* `*` with *Attribute Scope* `P(1)` puts each sample\'s value into the Y of `P` (X and Z stay 0). No primitives yet — the next node decides where lines start and stop.',
              },
              {
                id: 'linebreak1',
                type: 'linebreakPOP',
                x: 1,
                y: 0,
                inputs: ['chop2pop1'],
                params: {
                  Mode: 'One Line Strip (point order)',
                  'Every N Points': true,
                  N: { expr: "op('../trail1').numSamples" },
                },
                note: 'Connects the points in order, starting a new line strip every N points. N is the length of one series, read live from the Trail CHOP — change the window length and the split follows.',
              },
              {
                id: 'linemetrics1',
                type: 'linemetricsPOP',
                x: 2,
                y: 0,
                inputs: ['linebreak1'],
                params: { 'Vert Index in Line Strip Normalized': true, 'Line Strip Index Normalized': true },
                note: 'Adds two attributes per point. Rename them in the fields beside the toggles: **`t`** for the normalized index (0 = oldest sample, 1 = newest) and **`series`** for the normalized strip index (0, 0.5, 1 with three series).',
              },
              {
                id: 'rerange_x',
                type: 'rerangePOP',
                x: 3,
                y: 0,
                inputs: ['linemetrics1'],
                params: {
                  'Input Attribute Scope': 't',
                  'Map from Low': 0,
                  'Map from High': 1,
                  'Map to Low': -4,
                  'Map to High': 4,
                  'Output Attribute Scope': 'P(0)',
                },
                note: 'The **x scale**: time (0 = ten seconds ago, 1 = now) → plot left/right edges, written into `P.x`.',
              },
              {
                id: 'rerange_y',
                type: 'rerangePOP',
                x: 4,
                y: 0,
                inputs: ['rerange_x'],
                params: {
                  'Input Attribute Scope': 'P(1)',
                  'Map from Low': 0,
                  'Map from High': 100,
                  'Map to Low': -2,
                  'Map to High': 2,
                  'Output Attribute Scope': 'P(1)',
                },
                note: 'The **y scale**: data units (0–100) → plot bottom/top. A fixed domain, deliberately: the gridlines always mean the same values, and the chart never "breathes" as the data moves.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 5,
                y: 0,
                inputs: ['rerange_y'],
                params: {
                  TOP: { ref: '../ramp1' },
                  'Lookup Index Attribute U': 'series',
                  'Output Attribute Scope': 'Color',
                },
                note: 'Colors every point by its series, from the stepped ramp. All points of a strip share one color.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 6,
                y: 0,
                inputs: ['lookuptex1'],
                params: {
                  'Operation[0]': 'A >= B',
                  'Scope A[0]': 't',
                  'Scope B[0]': '0.999',
                  'Result Scope[0]': 'PointScale',
                },
                note: '`PointScale` = 1 on the newest point of each strip, 0 everywhere else. The Line MAT uses it as a per-point dot size, so only the "now" points get a visible dot.',
              },
              {
                id: 'null_lines',
                type: 'nullPOP',
                x: 7,
                y: 0,
                inputs: ['mathmix1'],
                flags: { display: true, render: true },
                note: 'Three strips with `P`, `Color` and `PointScale`. Render and display flags live here.',
              },
            ],
            childComments: [{ x: 0, y: 0.9, w: 4, text: 'samples → points → strips → per-strip metrics → scales → color → "now" marker' }],
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 5,
            y: 1.2,
            params: {
              'Width Near': 2.5,
              'Width Far': 2.5,
              'Line Color Attribute': 'Color',
              'Draw Points': true,
              'Point Type': 'Circle',
              'Point Size Multiplier': 3,
              'Point Size Attribute': 'PointScale',
              'Point Color Attribute': 'Color',
            },
            note: 'Strokes the series and draws a dot at every point, sized by `PointScale` (so only the newest point shows). Equal near/far widths: with an orthographic camera, depth shouldn\'t change anything anyway.',
          },
          {
            id: 'geo_grid',
            type: 'geometryCOMP',
            x: 6,
            y: 1.2,
            params: { Material: { ref: 'linemat2' } },
            note: 'The plot frame and horizontal gridlines, in their own COMP with a quieter Line MAT.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Line Strips',
                  Size: [8, 4],
                  Columns: 2,
                  Rows: 5,
                  Translate: [0, 0, -0.05],
                },
                flags: { display: true, render: true },
                note: 'Exactly the plot area: x −4…4, y −2…2. With *Line X* and *Line Y* on, you get five horizontal rules (0, 25, 50, 75, 100) plus left and right edges. Nudged back in Z so data draws on top.',
              },
            ],
          },
          {
            id: 'linemat2',
            type: 'lineMAT',
            x: 6,
            y: 2.3,
            params: { 'Line Near Color': [0.28, 0.3, 0.35], 'Width Near': 1, 'Width Far': 1 },
            note: 'Dim and thin: gridlines are for reference, never the main event.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 7,
            y: -1,
            params: { 'Xform:Translate': [0, 0, 5], Projection: 'Orthographic', 'Ortho Width': 10 },
            note: 'Orthographic and square-on: a slope you see is a slope in the data, not a perspective effect. Ortho Width 10 leaves margins for labels.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 8,
            y: 0,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo_grid geo_lines' },
              'Anti-Alias': '4x',
              'Background Color': [0.05, 0.055, 0.07, 1],
            },
            note: 'No lights: Line MATs are unlit.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 9,
            y: 0,
            inputs: ['render1'],
            note: 'The live chart.',
          },
        ],
        boxes: [{ title: 'time (CHOPs)', nodes: ['noise1', 'math1', 'trail1', 'shuffle1', 'history'], tone: 'green' }],
        steps: [
          {
            title: 'A stand-in signal in data units',
            body: `Create a **Noise CHOP** \`noise1\`: *Channel Names* \`a b c\`, *Period* **3**, and on the *Common* page turn on **Time Slice** — now it outputs one value per channel per frame, like a live device would.

Append a **Math CHOP** \`math1\`: on *Mult-Add*, *Multiply* **30** and *Post-Add* **50**. Your three "readings" now wander roughly between 20 and 80.`,
            nodes: ['noise1', 'math1'],
          },
          {
            title: 'Record ten seconds of history',
            body: `Append a **Trail CHOP** \`trail1\`: *Window Length* **10**, with the units menu beside it on seconds. Watch its viewer: three curves scrolling left.

Append a **Shuffle CHOP** \`shuffle1\` with *Method* **Sequence All Channels**, then a **Null CHOP** \`history\`. The viewer shows one long channel: the three histories side by side.`,
            nodes: ['trail1', 'shuffle1', 'history'],
          },
          {
            title: 'Samples to points to strips',
            body: `Create a **Geometry COMP** \`geo_lines\` and clear its contents. Inside, add a **CHOP to POP** \`chop2pop1\`: *CHOP* \`../history\`, *Connectivity* **None**, *Channels Selection* **Specify Channels**, *Channel Scope* \`*\`, *Attribute Scope* \`P(1)\`.

Append a **Line Break POP** \`linebreak1\`: *Mode* **One Line Strip (point order)**, turn on **Every N Points**, and set *N* to the expression \`op('../trail1').numSamples\`. You now have three strips — still piled on top of each other at x = 0.`,
            nodes: ['geo_lines', 'chop2pop1', 'linebreak1'],
          },
          {
            title: 'Where am I, and which series?',
            body: `Append a **Line Metrics POP** \`linemetrics1\`. On the *Index* page turn on **Vert Index in Line Strip Normalized** and rename its attribute to \`t\`; turn on **Line Strip Index Normalized** and rename its attribute to \`series\`.

Middle-click the node to confirm both attributes exist. \`t\` runs 0→1 along each strip; \`series\` is constant per strip.`,
            nodes: ['linemetrics1'],
          },
          {
            title: 'Two scales: x for time, y for value',
            body: `Append a **ReRange POP** \`rerange_x\`: *Input Attribute Scope* \`t\`, map **0–1** to **−4–4**, *Output Attribute Scope* \`P(0)\`.

Append another, \`rerange_y\`: *Input* \`P(1)\`, map **0–100** to **−2–2**, *Output* \`P(1)\`. The strips now fan out across an 8 × 4 plot area.`,
            nodes: ['rerange_x', 'rerange_y'],
          },
          {
            title: 'One color per series',
            body: `At the root, create a **Ramp TOP** \`ramp1\`: *Type* **Horizontal**, *Interpolate Notches* **Step**. In the ramp editor, make three keys at about 0, 0.33 and 0.67 with three clearly different colors.

Inside \`geo_lines\`, append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`../ramp1\`, *Lookup Index Attribute U* \`series\`, *Output Attribute Scope* \`Color\`.`,
            nodes: ['ramp1', 'lookuptex1'],
          },
          {
            title: 'Mark "now", then style the lines',
            body: `Append a **Math Mix POP** \`mathmix1\`: block 0 *Operation* **A >= B**, *Scope A* \`t\`, *Scope B* \`0.999\`, *Result Scope* \`PointScale\`. End with a **Null POP** \`null_lines\` (render + display on).

At the root, create a **Line MAT** \`linemat1\` and assign it to \`geo_lines\`. *Width Near/Far* **2.5**, *Line Color Attribute* \`Color\`; on the *Point* page turn on **Draw Points**, *Point Type* **Circle**, *Point Size Multiplier* **3**; on *Attributes* set *Point Size Attribute* \`PointScale\` and *Point Color Attribute* \`Color\`.`,
            nodes: ['mathmix1', 'null_lines', 'linemat1'],
          },
          {
            title: 'Camera and render',
            body: `Create a **Camera COMP** \`cam1\` at **0, 0, 5**, *Projection* **Orthographic**, *Ortho Width* **10**. Create a **Render TOP** \`render1\` (*Camera(s)* \`cam1\`, *Geometry* \`geo_lines\`, *Anti-Alias* **4x**, dark background) and a **Null TOP** \`out1\`.

Three colored lines scroll right-to-left, each with a dot on its newest value.`,
            nodes: ['cam1', 'render1', 'out1'],
          },
          {
            title: 'Frame and gridlines',
            body: `Create a Geometry COMP \`geo_grid\` holding a **Grid POP** \`grid1\`: *Connectivity* **Line Strips**, *Size* **8, 4**, *Columns* **2**, *Rows* **5**, *Translate* **0, 0, −0.05**; make sure *Line X* and *Line Y* are on (Z off).

Create a dim, thin **Line MAT** \`linemat2\` for it, and add \`geo_grid\` to the Render TOP's *Geometry* field.`,
            nodes: ['geo_grid', 'grid1', 'linemat2'],
          },
          {
            title: 'Stress-test it',
            body: `Change \`trail1\`'s *Window Length* to **30**: the lines get denser, and the Line Break POP follows automatically because N is an expression. Change \`noise1\`'s *Channel Names* to \`a b c d\`: a fourth series appears. Spread the ramp keys so four colors are distinct (0, 0.25, 0.5, 0.75), and you're done — no POP was touched.`,
            focus: ['trail1', 'noise1', 'ramp1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why one long channel?

The obvious alternative is one CHOP to POP per series, each picking one channel. It works for three series and becomes miserable at ten: every new channel means new nodes, new colors and new wiring. Sequencing the channels first moves the "how many series" question into the data, where it belongs. The POP side only ever sees *one point list*, and two numbers per point — \`t\` and \`series\` — carry all the structure.

That's a pattern worth remembering: **flatten, then annotate**. Lay everything out as one list, then add attributes that say where each element belongs. POPs are very good at processing one big list in parallel; they're not built for juggling many small ones.

## Honest scales for moving data

A scrolling chart tempts you to auto-fit the y axis to whatever is on screen. Resist that by default:

* **Auto-fit lies about change.** If the scale re-fits continuously, a value that doubles can look flat, and noise can look like drama. With a fixed domain, the gridlines always mean the same numbers, so a rising line is a rising value.
* **Choose the domain from knowledge, not from the data.** Percent? 0–100. Temperature in a room? Maybe 15–30 °C. A line chart doesn't need a zero baseline the way a bar chart does, but it does need a *stable* one.
* **If you must adapt, adapt slowly and show it.** Drive the domain with a [[Lag CHOP]]-smoothed min/max and *update the tick labels* to match, so the viewer can see the scale changed.

The x axis has its own honesty rule: the window is a fixed span of time, and the newest sample is always at the right edge. That's what makes the dot on each line mean "now".

## The Line MAT is doing a lot

A raw line strip renders as hairlines that shimmer and vanish at small sizes. The [[Line MAT]] draws each segment as a camera-facing ribbon with proper joints and caps, and its width is measured relative to the image (a width of 1 is roughly a thousandth of the image width), so the chart looks the same at 720p and 4K. Its *Attributes* page decides which point attributes drive line color, point color and point size — which is how a 0/1 attribute turns into "a dot only on the newest point".

Two more styling ideas that stay honest:

* **Emphasis by contrast, not by effect.** Make the series you're talking about brighter or thicker and push the others toward grey. Glow and bloom make lines look heavier than their neighbours for no data reason.
* **Thin the history, not the present.** If the chart gets busy, fade old samples: use \`t\` to drive a per-point \`LineWidth\` (point it at the Line MAT's *Line Width Attribute*) so the past tapers away while the present stays solid.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Swapping in a live source',
      md: `Everything downstream of \`math1\` only cares that it gets **time-sliced channels in known units**. Replace \`noise1\` with any of these, then adjust \`math1\` (or the y domain):

* [[OSC In CHOP]] — values from phones, sensors, other software. Set *Network Port*, then use a [[Select CHOP]] or [[Rename CHOP]] so the channels have short, stable names.
* [[Perform CHOP]] — TouchDesigner's own frame rate and cook times. Live data you always have; great for testing.
* [[Mouse In CHOP]] — the cursor position, the simplest "live" input there is.
* [[Audio Device In CHOP]] — loudness after an analysis step.
* Network text feeds ([[WebSocket DAT]], [[MQTT Client DAT]], [[Serial DAT]]) — convert values to channels with a [[DAT to CHOP]] first.

The [[Trail CHOP]] starts over whenever the number or names of its input channels change. Keep the channel set stable (rename and select upstream) and the history survives.`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Stand-in source',
        md: 'Noise CHOP + Math CHOP. Always available, endlessly varied, perfect for building and rehearsing the chart. Its range is known, so the domain is easy to pick.',
      },
      right: {
        title: 'Live source',
        md: 'OSC, sensors, network data. Can stall, spike or arrive in bursts. Clamp or filter it in CHOPs before the Trail, and consider *Capture: Only When Input Cooks* on the Trail CHOP for event-like data that doesn\'t update every frame.',
      },
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Cheap by design',
      md: 'Three series × 600 samples is 1800 points — tiny for the GPU. The only CPU→GPU transfer is the CHOP to POP upload of one channel per frame. Long windows at high sample rates add up, though: if you want an hour of history, record at a lower *Sample Rate* on the Trail CHOP, or resample it, instead of drawing 200 000 points nobody can distinguish.',
    },
    {
      kind: 'md',
      md: `
## Labels and ticks

A chart without numbers is a mood board. The second network adds tick values on the left and time labels underneath, using the same [[Text POP]] *Specification DAT* technique as the bar chart: one table row per label, positioned with \`tx\`/\`ty\` columns in the plot's world units.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'ticks',
        title: 'Axis labels',
        root: '/project1',
        height: 360,
        caption: 'Add `geo_labels` to `render1`\'s *Geometry* field after building it. The tick table uses the same mapping as `rerange_y`: value 0 → y −2, value 100 → y 2.',
        nodes: [
          {
            id: 'ticks',
            type: 'tableDAT',
            x: 0,
            y: 0,
            table: [
              ['text', 'tx', 'ty'],
              ['100', '-4.45', '2'],
              ['75', '-4.45', '1'],
              ['50', '-4.45', '0'],
              ['25', '-4.45', '-1'],
              ['0', '-4.45', '-2'],
              ['-10 s', '-4', '-2.35'],
              ['now', '4', '-2.35'],
            ],
            note: 'One row per label. Tick values sit just left of the plot, centered on their gridline; the time labels sit under the left and right edges.',
          },
          {
            id: 'geo_labels',
            type: 'geometryCOMP',
            x: 1,
            y: 0,
            params: { Material: { ref: 'constant1' } },
            note: 'Labels need solid, unlit fills — a Constant MAT, not the Line MAT.',
            children: [
              {
                id: 'text1',
                type: 'textPOP',
                x: 0,
                y: 0,
                params: {
                  Mode: 'Specification DAT/CHOP',
                  'Specification DAT': { ref: '../ticks' },
                  'Font Size': 0.2,
                  'Horizontal Align': 'Center',
                  'Vertical Align': 'Center',
                },
                flags: { display: true, render: true },
                note: 'Each row of `ticks` becomes a text block at its `tx`, `ty`. Font size is in world units, so it scales with the chart.',
              },
            ],
          },
          {
            id: 'constant1',
            type: 'constantMAT',
            x: 1,
            y: 1.1,
            params: { Color: [0.6, 0.63, 0.7] },
            note: 'Mid-grey: readable, but quieter than the data.',
          },
        ],
        steps: [
          {
            title: 'The tick table',
            body: 'Create a **Table DAT** `ticks` with the header `text tx ty` and the seven rows shown.',
            nodes: ['ticks'],
          },
          {
            title: 'Text from the table',
            body: `Create a **Constant MAT** \`constant1\` (mid-grey) and a Geometry COMP \`geo_labels\` using it. Inside, add a **Text POP** \`text1\`: *Mode* **Specification DAT/CHOP**, *Specification DAT* \`../ticks\`, *Font Size* **0.2**, both aligns **Center**. Add \`geo_labels\` to \`render1\`.`,
            nodes: ['constant1', 'geo_labels', 'text1'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Turn the plot into a **horizon**: stack the series vertically in separate bands by adding \`series\` × band height to \`P.y\` with a Math Mix block. Ten series stay readable that way.
* Map \`t\` to *Line Width* so the past tapers into nothing — a "comet" history.
* Bend time: write \`t\` into an angle and you get a radial clock-face chart. Pretty — but harder to read, so use it where mood matters more than precision.`,
    },
    {
      kind: 'challenge',
      title: 'Label the lines directly',
      md: 'Legends make viewers look back and forth. Put each series\' name (`a`, `b`, `c`) just right of its newest value, following the line up and down as it moves.',
      hints: [
        'The Text POP accepts a *Specification CHOP* as well as a DAT: channels named `ty` position each row, one sample per row.',
        'You need the three *current* values as three samples of one channel — a [[Shuffle CHOP]] has a mode for swapping channels and samples.',
        'The values must go through the same mapping as `rerange_y` (0–100 → −2–2). A Math CHOP\'s *Range* page can do that.',
      ],
      solution:
        'Branch from `math1` (it holds the current values): **Math CHOP** with *From Range* 0, 100 and *To Range* −2, 2 → **Shuffle CHOP** with *Method* **Swap Channels and Samples** (3 channels × 1 sample become 1 channel × 3 samples) → **Rename CHOP** (*From* `*`, *To* `ty`) → **Null CHOP** `label_y`. Make a Table DAT `names` with header `text tx` and rows `a 4.3`, `b 4.3`, `c 4.3`. A second Text POP in `geo_labels` uses *Specification DAT* `../names` and *Specification CHOP* `../label_y`, *Horizontal Align* **Left**, *Vertical Align* **Center**; merge it with `text1`. The labels now ride along with the newest values.',
    },
    {
      kind: 'challenge',
      title: 'Alert above a threshold',
      md: 'Draw a thin red reference line at the value 80 and turn any part of any series red while it is above 80.',
      hints: [
        'Work in plot coordinates: what y does the value 80 map to?',
        'Math Mix can compare (`A > B`) and blend (`mix(A, B, C)`).',
        'The threshold line is just another two-point line — a Line POP in `geo_grid`, or one more row of the grid.',
      ],
      solution:
        'Value 80 maps to y = −2 + 80 × 0.04 = 1.2. In `mathmix1` add block 1: **A > B**, *Scope A* `P(1)`, *Scope B* `1.2`, *Result Scope* `hot`; block 2: **mix(A, B, C)**, *Scope A* `Color`, *Scope B* `1 0.25 0.2 1`, *Scope C* `hot`, *Result Scope* `Color`. For the threshold line, add a [[Line POP]] in a new Geometry COMP with points at (−4, 1.2, 0) and (4, 1.2, 0), rendered by a Line MAT in the same red at low alpha. Keep it thin: the alert is the colored data, the line is just the reference.',
    },
    {
      kind: 'challenge',
      title: 'Watch your own frame rate',
      md: 'Replace the stand-in with real live data you always have: TouchDesigner\'s frames per second and the cook time of the last frame, plotted on the same chart.',
      hints: [
        'The [[Perform CHOP]] has a toggle per performance channel — *Frames per Second* and *Frame Time* are the ones you want.',
        'The two channels are in different units. Either plot them on a shared, honest domain or normalize each to "percent of target".',
      ],
      solution:
        'Create a Perform CHOP, leave only *Frames per Second* and *Frame Time* switched on, and wire it into `math1` in place of `noise1`. Reset `math1` to *Multiply* 1 and *Post-Add* 0: a 0–100 domain already suits fps at a 60 fps target. For the frame time, add a second Math CHOP whose *Scope* (Common page) names only that channel and multiply it by about 6 — that turns milliseconds into percent of a 60 fps frame budget (about 16.7 ms). Update the tick labels to say what 100 means. Now drag a heavy operator into the project and watch the lines react.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does the Trail CHOP contribute to this chart?',
          options: [
            'It smooths the noise',
            'It keeps a sliding window of past samples, with the newest sample last',
            'It converts channels into points',
            'It colors each series',
          ],
          answer: 1,
          explain: 'The Trail CHOP records a fixed-length history of its inputs. Because the newest sample is always at the end, the history scrolls naturally.',
        },
        {
          q: 'Why sequence all channels into one long channel before the CHOP to POP?',
          options: [
            'CHOP to POP can only read one channel',
            'So one POP chain handles any number of series, with structure added by attributes',
            'It makes the lines smoother',
            'The Trail CHOP requires it',
          ],
          answer: 1,
          explain: '"Flatten, then annotate": one point list plus `t` and `series` attributes scales to any number of series without new nodes.',
        },
        {
          q: 'Which node decides where one series\' line strip ends and the next begins?',
          options: ['Shuffle CHOP', 'CHOP to POP', 'Line Break POP (Every N Points)', 'Line Metrics POP'],
          answer: 2,
          explain: 'The CHOP to POP creates bare points; the Line Break POP connects them in order and starts a new strip every N points, where N is the series length.',
        },
        {
          q: 'Why keep the y domain fixed (0–100) rather than fitting it to the visible data?',
          options: [
            'Fixed domains render faster',
            'So gridlines keep their meaning and visual change reflects real change',
            'ReRange cannot be animated',
            'The Line MAT requires it',
          ],
          answer: 1,
          explain: 'A continuously re-fitting scale exaggerates noise and hides real trends. If you must adapt, do it slowly and update the labels.',
        },
        {
          q: 'How does only the newest point of each line get a dot?',
          options: [
            'The Line MAT always draws a dot at the end of a strip',
            'A Math Mix sets `PointScale` to 1 where `t` ≈ 1 and 0 elsewhere, and the Line MAT uses `PointScale` as the point size attribute',
            'The Delete POP removes all other points',
            'The camera hides the other dots',
          ],
          answer: 1,
          explain: 'Per-point attributes drive the Line MAT. A 0/1 size attribute is an easy way to draw marks on selected points only.',
        },
      ],
    },
  ],
};

export default lesson;
