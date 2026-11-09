import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'chops-drive-pops',
  title: 'Driving POPs with CHOPs',
  subtitle: 'Oscillators, smoothing and integration feed your geometry — one value per frame, or one value per point.',
  minutes: 45,
  summary:
    'CHOPs are TouchDesigner\'s motion engine. Build a control chain with [[LFO CHOP]], [[Lag CHOP]], [[Math CHOP]] and [[Speed CHOP]], reference it from POP parameters, and turn a multi-sample [[Noise CHOP]] into per-point radii with the [[Lookup Channel POP]]. Then convert channels straight into points with [[CHOP to POP]].',
  objectives: [
    'Build a time-sliced control chain: oscillate, smooth, range-map, and expose it through a [[Null CHOP]]',
    'Reference CHOP channels in parameter expressions with `op(\'name\')[\'chan1\']`',
    'Explain why a [[Speed CHOP]] gives jump-free motion when a rate changes',
    'Generate a multi-sample curve with Time Slice off and sample it per point with the [[Lookup Channel POP]]',
    'Turn channels into point attributes with the [[CHOP to POP]]',
  ],
  requires: ['attributes'],
  tags: ['chops', 'animation', 'lookup', 'speed', 'line mat'],
  blocks: [
    {
      kind: 'md',
      md: `
So far every bit of motion came from \`absTime.seconds\` typed into a parameter. That works, but it's a dead end: you can't smooth it, you can't make it react, and changing its speed mid-performance makes things jump. CHOPs fix all three. They are TouchDesigner's channel processors — oscillators, noise, envelopes, smoothing, math, audio, MIDI, sensors — and they are where motion is *designed*.

In this lesson you'll build a **breathing ring**: a closed loop of light whose outline wobbles with noise, swells on a slow pulse and spins at a speed that drifts, reverses and recovers without a single jump. Every one of those behaviors is a small CHOP chain feeding a POP.

## Two ways a CHOP talks to a POP

| | One value per frame | Many values at once |
|---|---|---|
| **The CHOP** | time-sliced: each frame it outputs the current value | Time Slice off: a whole curve of samples, cooked at once |
| **How the POP gets it** | a parameter expression like \`op('pulse')['chan1']\` | a POP that reads samples: [[Lookup Channel POP]], [[CHOP to POP]] |
| **Effect** | the same value for every point (rotate, amplitude, scale) | a *different* value for each point |
| **In this lesson** | spin and pulse | the ring's outline |

Both are cheap: CHOP data is small, and sending a few hundred samples up to the GPU each frame costs very little. What you want to avoid is the opposite direction — pulling big POP buffers *down* into CHOPs every frame.
`,
    },
    {
      kind: 'md',
      md: `
## The control toolkit

You'll use these six operators in nearly every project, so it's worth knowing what each is *for*:

| Operator | Role | Think of it as… |
|---|---|---|
| [[LFO CHOP]] | sine, triangle, ramp, square, pulse or Gaussian waves at a frequency | a metronome with shape |
| [[Noise CHOP]] | smooth random curves that never repeat | organic wander |
| [[Lag CHOP]] | slows changes, with separate rise and fall times | an envelope: fast attack, slow release |
| [[Filter CHOP]] | smooths with a moving window (Gaussian, box…) | a gentler, symmetrical smoother |
| [[Math CHOP]] | offsets, gains, and *From Range → To Range* remapping | the adapter between "what the signal is" and "what the parameter wants" |
| [[Speed CHOP]] | adds up its input over time | a speedometer turned into an odometer |
| [[Null CHOP]] | passes channels through unchanged | the socket other operators plug into |

The **Null at the end** is not decoration. Expressions refer to operators by name. If \`noise1\`'s amplitude reads \`op('pulse')['chan1']\` and \`pulse\` is a Null, you can rebuild everything feeding the Null — swap the LFO for an audio analysis, add a second Lag — and the expression never breaks. Treat Nulls as the public interface of a control chain.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Time-sliced or not?',
      md: `A **time-sliced** CHOP (the LFO, Lag and Speed CHOPs work this way) produces the samples for the current frame and moves on, so its viewer looks like a scrolling value. Ask it for \`['chan1']\` and you get "now".

Turn **Time Slice off** (Common page) on a generator like the Noise CHOP and it instead produces a fixed block of samples from *Start* to *End*, all at once, every time it cooks. That block isn't "time" any more — it's a list of numbers. Give it 256 samples and you have 256 values to hand out to 256 positions around a ring.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'breathing-ring',
        title: 'Breathing ring',
        root: '/project1',
        height: 600,
        caption:
          'Dive into **geo1**: the POP chain runs along the top, and three CHOP chains sit underneath it — the *profile* (per-point data), the *pulse* and the *spin* (per-frame values). Dashed lines show which parameter reads which Null.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: '../line1' } },
            note: 'Everything the ring needs lives inside this one component — its geometry *and* the CHOPs that animate it — so you can copy or save it as a unit.',
            children: [
              {
                id: 'circle1',
                type: 'circlePOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Line Strip',
                  Orientation: 'XY Plane',
                  Radius: [1, 1],
                  Divisions: 400,
                  Closed: true,
                },
                note: 'A closed line strip of 400 points facing the camera. Enough points that the noise outline stays smooth; the Line MAT will draw it as a thick stroke.',
              },
              {
                id: 'lookupchannel1',
                type: 'lookupchannelPOP',
                x: 1,
                y: 0,
                inputs: ['circle1'],
                params: {
                  CHOP: { ref: 'profile' },
                  'Lookup Index Attribute(s)': '_PointU',
                  Interpolate: true,
                  'Channel Scope[0]': 'chan1',
                  'From Low[0]': -1,
                  'From High[0]': 1,
                  'To Low[0]': 0.6,
                  'To High[0]': 1.4,
                  'Output Attribute Scope[0]': 'radius',
                },
                note: 'Each point uses its normalized index `_PointU` (0 → 1 around the ring) as a position along the `profile` curve, reads `chan1` there, re-ranges −1…1 to 0.6…1.4 and stores the result in a new attribute, `radius`.',
              },
              {
                id: 'transform1',
                type: 'transformPOP',
                x: 2,
                y: 0,
                inputs: ['lookupchannel1'],
                params: {
                  Rotate: [0, 0, { expr: "op('spin')['chan1']" }],
                  'Element[0]': 'radius',
                  'Target Parameter[0]': 'scale',
                  'Map:Combine Operation[0]': 'Multiply',
                },
                note: 'Two jobs. The *Map* page multiplies *Uniform Scale* by each point\'s `radius`, pushing it in or out from the center. *Rotate Z* reads the integrated angle from the `spin` Null, once per frame, for the whole ring.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 3,
                y: 0,
                inputs: ['transform1'],
                flags: { display: true, render: true },
                note: 'Flags here, as always.',
              },
              {
                id: 'noise1',
                type: 'noiseCHOP',
                x: 0,
                y: 1.3,
                params: {
                  'Time Slice': false,
                  Start: 0,
                  'Start Unit': 'I',
                  End: 255,
                  'End Unit': 'I',
                  Period: 40,
                  'Period Unit': 'I',
                  Harmonics: 2,
                  Amplitude: { expr: "op('pulse')['chan1']" },
                  Translate: [0, { expr: 'absTime.seconds * 0.4' }, 0],
                  Constraint: 'Start/End Values',
                  'Starting Value': 0,
                  'Ending Value': 0,
                },
                note: 'With Time Slice off this is not a signal over time but a 256-sample **profile** — the outline of the ring, unrolled. *Period* 40 samples gives roughly six bumps around the loop. The constraint pins both ends to 0 so the loop closes without a step, and sliding *Translate Y* through the noise field makes the outline morph.',
              },
              {
                id: 'profile',
                type: 'nullCHOP',
                x: 1,
                y: 1.3,
                inputs: ['noise1'],
                note: 'The interface the Lookup Channel POP reads. Swap what feeds it — an audio spectrum, a drawn curve — and the ring follows.',
              },
              {
                id: 'lfo1',
                type: 'lfoCHOP',
                x: 0,
                y: 2.5,
                params: { Type: 'Square', Frequency: 0.5 },
                note: 'A square wave flipping between −1 and 1 every second: the raw "beat" of the breathing.',
              },
              {
                id: 'lag1',
                type: 'lagCHOP',
                x: 1,
                y: 2.5,
                inputs: ['lfo1'],
                params: { Lag: [0.05, 0.9], 'Lag Unit': 'S' },
                note: 'Rises almost instantly (0.05 s) and falls slowly (0.9 s). The hard square becomes an inhale-and-sigh envelope.',
              },
              {
                id: 'math1',
                type: 'mathCHOP',
                x: 2,
                y: 2.5,
                inputs: ['lag1'],
                params: { 'From Range': [-1, 1], 'To Range': [0.25, 1] },
                note: 'Maps the envelope from −1…1 to 0.25…1, so the ring never goes completely round at the bottom of a breath.',
              },
              {
                id: 'pulse',
                type: 'nullCHOP',
                x: 3,
                y: 2.5,
                inputs: ['math1'],
                note: 'Read by `noise1`\'s *Amplitude*: the profile\'s bumps grow and shrink with the breath.',
              },
              {
                id: 'lfo2',
                type: 'lfoCHOP',
                x: 0,
                y: 3.7,
                params: { Frequency: 0.05 },
                note: 'A very slow sine (one cycle every 20 seconds). This is a *speed*, not an angle.',
              },
              {
                id: 'math2',
                type: 'mathCHOP',
                x: 1,
                y: 3.7,
                inputs: ['lfo2'],
                params: { 'From Range': [-1, 1], 'To Range': [-20, 90] },
                note: 'Turns the sine into degrees per second, from −20 (a slow backwards drift) to 90 (a brisk forward spin).',
              },
              {
                id: 'speed1',
                type: 'speedCHOP',
                x: 2,
                y: 3.7,
                inputs: ['math2'],
                params: { 'Limit Type': 'Loop', Minimum: 0, Maximum: 360 },
                note: 'Adds up the speed every frame to get an angle. Change the speed and only the *rate* changes — the angle itself never jumps. *Loop* wraps it into 0…360 so the number stays small.',
              },
              {
                id: 'spin',
                type: 'nullCHOP',
                x: 3,
                y: 3.7,
                inputs: ['speed1'],
                note: 'Read by `transform1`\'s *Rotate Z*.',
              },
            ],
            childComments: [
              { x: 4.1, y: 1.3, w: 1.8, text: '**profile**: Time Slice off. 256 samples = one outline.' },
              { x: 4.1, y: 2.5, w: 1.8, text: '**pulse**: time-sliced. One value per frame.' },
              { x: 4.1, y: 3.7, w: 1.8, text: '**spin**: a speed, integrated into an angle.' },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0, 4.5] },
            note: 'Straight on, far enough back for the ring at its widest (radius 1.4) to fit.',
          },
          {
            id: 'line1',
            type: 'lineMAT',
            x: 1,
            y: 1.2,
            params: { 'Width Near': 3, 'Width Far': 3, 'Line Near Color': [0.55, 0.9, 1] },
            note: 'Draws the line strip as a smooth, camera-facing stroke. Widths are resolution-independent (1 = a thousandth of the image width). The Line MAT is unlit, so no light is needed.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0.6,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '8x',
              'Background Color': [0.02, 0.02, 0.04, 1],
            },
            note: 'Thin lines benefit from more anti-aliasing than solid shapes. No lights in this scene, and none needed.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 3,
            y: 0.6,
            inputs: ['render1'],
            note: 'The final image.',
          },
        ],
        boxes: [
          { title: 'Per point', nodes: ['noise1', 'profile'], tone: 'green' },
          { title: 'Per frame', nodes: ['lfo1', 'lag1', 'math1', 'pulse', 'lfo2', 'math2', 'speed1', 'spin'], tone: 'blue' },
        ],
        steps: [
          {
            title: 'A ring of points',
            body: `Create a **Geometry COMP** \`geo1\`, go inside and clear it. Add a **Circle POP** \`circle1\`: *Connectivity* **Line Strip**, *Orientation* **XY Plane**, *Radius* **1, 1**, *Divisions* **400**, *Closed* on. Append a **Null POP** \`null1\` and give it the display and render flags.

Middle-click the circle: one line-strip primitive, 400 points.`,
            nodes: ['geo1', 'circle1', 'null1'],
          },
          {
            title: 'See it as a line',
            body: `Back in \`/project1\`, create a **Line MAT** \`line1\` (*Width Near* **3**, *Width Far* **3**, *Line Near Color* **0.55, 0.9, 1**) and assign it as \`geo1\`'s *Material*. Create a **Camera COMP** \`cam1\` at *Translate* **0, 0, 4.5**.`,
            nodes: ['line1', 'cam1'],
          },
          {
            title: 'Render',
            body: `Create a **Render TOP** \`render1\` (*Camera(s)* \`cam1\`, *Geometry* \`geo1\`, *Anti-Alias* **8x**, near-black background) and a **Null TOP** \`out1\`. A clean glowing circle — the canvas for everything that follows.`,
            nodes: ['render1', 'out1'],
          },
          {
            title: 'A profile curve',
            body: `Inside \`geo1\`, create a **Noise CHOP** \`noise1\`.

* Common page: **Time Slice** off.
* Channel page: *Start* **0**, *End* **255**, with both unit menus set to **I** (samples).
* Noise page: *Period* **40** with its unit on **I** (samples), *Harmonics* **2**.
* Constraints page: *Constraint* **Start/End Values**, *Starting Value* **0**, *Ending Value* **0**.
* Transform page: *Translate Y* = \`absTime.seconds * 0.4\`.

End it with a **Null CHOP** named \`profile\`. Its viewer shows one wiggly curve that starts and ends at zero and slowly changes shape.`,
            nodes: ['noise1', 'profile'],
          },
          {
            title: 'One sample per point',
            body: `Insert a **Lookup Channel POP** \`lookupchannel1\` after \`circle1\`:

* *CHOP* \`profile\`, *Lookup Index Attribute(s)* \`_PointU\`, *Interpolate* on.
* In the first *Lookup* block: *Channel Scope* \`chan1\`, *From Low* **−1**, *From High* **1**, *To Low* **0.6**, *To High* **1.4**, *Output Attribute Scope* \`radius\`.

Then insert a **Transform POP** \`transform1\`. On its **Map** page, first block: *Element* \`radius\`, *Target Parameter* **scale (Uniform Scale)**, *Combine Operation* **Multiply**. The circle now wears the noise curve as its outline.`,
            nodes: ['lookupchannel1', 'transform1'],
          },
          {
            title: 'A beat, smoothed',
            body: `Below the profile chain, create an **LFO CHOP** \`lfo1\` with *Type* **Square** and *Frequency* **0.5**. Append a **Lag CHOP** \`lag1\` with *Lag* **0.05** and **0.9** (rise, fall) and its unit menu on **S** (seconds).

Put the two viewers side by side: a hard on/off square becomes a quick swell and a long, soft decay.`,
            nodes: ['lfo1', 'lag1'],
          },
          {
            title: 'Range-map it and expose it',
            body: `Append a **Math CHOP** \`math1\`: on the *Range* page, *From Range* **−1, 1** and *To Range* **0.25, 1**. End in a **Null CHOP** named \`pulse\`.

Now wire it in by expression: set \`noise1\`'s *Amplitude* to \`op('pulse')['chan1']\`. The bumps swell on every beat and relax between them.`,
            nodes: ['math1', 'pulse'],
            focus: ['noise1'],
          },
          {
            title: 'A drifting speed',
            body: `Create a second **LFO CHOP** \`lfo2\` with *Frequency* **0.05**, and a **Math CHOP** \`math2\` with *From Range* **−1, 1** and *To Range* **−20, 90**.

This chain outputs a *speed in degrees per second*, wandering between a slow reverse and a quick forward spin.`,
            nodes: ['lfo2', 'math2'],
          },
          {
            title: 'Integrate speed into angle',
            body: `Append a **Speed CHOP** \`speed1\`: *Limit Type* **Loop**, *Minimum* **0**, *Maximum* **360**. End in a **Null CHOP** \`spin\`.

Set \`transform1\`'s *Rotate Z* to \`op('spin')['chan1']\`. Watch a full 20-second cycle: the ring slows, reverses, slows again and surges forward, and never jumps.`,
            nodes: ['speed1', 'spin'],
            focus: ['transform1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why the Speed CHOP matters

Here is the obvious way to spin something at a variable speed: put \`absTime.seconds * op('math2')['chan1']\` in *Rotate Z*. It works — until the speed changes. The expression computes the angle as *total time × current speed*. Two minutes into your show, the speed goes from 30°/s to 31°/s, and the angle instantly jumps by 120°. Every change of speed teleports the ring.

The [[Speed CHOP]] computes something different: each frame it **adds** *current speed × frame duration* to the angle it already had. Changing the speed only changes how fast the angle grows from now on. That's the difference between multiplying and integrating, and it's why anything rate-based — rotation speed, scroll speed, how fast you travel through a noise field — should go through a Speed CHOP once the rate can change live.

The *Limit Type* **Loop** setting is housekeeping: angles wrap at 360, so the number stays small and precise even after hours of running.
`,
    },
    {
      kind: 'compare',
      left: {
        title: '`absTime.seconds * speed`',
        md: 'Angle = time × speed. Fine while the speed is constant. Any change makes the result jump, and the jump grows the longer the project has been running.',
      },
      right: {
        title: 'Speed CHOP',
        md: 'Angle += speed × frame time. Changing the speed bends the motion smoothly; it can even reverse without a glitch. Reset it any time with its *Reset* pulse.',
      },
    },
    {
      kind: 'md',
      md: `
## Reading channels in expressions

The pattern you'll type a thousand times:

| Expression | Gives |
|---|---|
| \`op('pulse')['chan1']\` | the current value of the channel named *chan1* |
| \`op('pulse')[0]\` | the first channel, whatever it's called |
| \`op('pulse')['chan1'] * 2 + 0.5\` | any Python math on top |
| \`op('../pulse')['chan1']\` | a Null one level up, outside this component |

For an operator like \`transform1\` or \`noise1\`, a relative name is looked up in the network that operator sits in — here, inside \`geo1\`. That's one reason the CHOPs live there too: \`transform1\` and \`noise1\` can name them directly, and the whole ring stays self-contained. When you drag a CHOP channel onto a parameter, TouchDesigner offers to write this kind of reference for you; typing it is just as good. Either way, an expression only reads the CHOP's *current* value, so it's the per-frame route.

## Per-point values: the Lookup Channel POP

The [[Lookup Channel POP]] is the per-point route. For every point it takes a lookup index from an attribute (or built-in), finds that position along the CHOP, interpolates between samples and writes the result into an attribute. Index 0 reads the first sample and index 1 the last, unless you set *Lookup Index Units* to **Sample Index** and use whole sample numbers instead.

Three details make the ring work:

* **\`_PointU\` as the index** spreads the 256-sample profile evenly over the 400 points. The sample counts don't need to match; *Interpolate* blends between neighbors.
* **The seam.** A closed ring joins its last point back to its first, so the profile's last value must meet its first. The Noise CHOP's *Start/End Values* constraint (available because Time Slice is off) pins both ends to 0, so the join is continuous. The Lookup Channel POP also has a *Cyclic Index* toggle that treats the CHOP as a loop, wrapping from the last sample back to the first — handy for closed shapes, but it can't make a curve whose two ends differ meet smoothly.
* **Re-ranging in the block.** *From Low/High* and *To Low/High* map the raw channel values to the range you want before they're stored. You could do the same with a Math CHOP before the Null or a Math POP after the lookup — doing it in the block saves a node.

## From radius to position

\`lookupchannel1\` only *stores* \`radius\`; nothing has moved yet. The [[Transform POP]]'s Map page then lets that attribute drive *Uniform Scale* for each point individually. Because the circle is centered on the origin and the pivot is at the origin, scaling a point simply slides it in or out along its own radius. Same Map page mechanism you used on the Noise POP in the last lesson — attributes driving parameters, point by point.
`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Watch your signals',
      md: 'Turn on the viewers of `lfo1`, `lag1` and `pulse` and lay them out side by side. For time-sliced chains, a [[Trail CHOP]] after any node draws its recent history as a curve — the fastest way to tune lag times and ranges by eye.',
    },
    {
      kind: 'md',
      md: `
## Channels straight into points: CHOP to POP

The Lookup Channel POP decorates points that already exist. The [[CHOP to POP]] *creates* them: **every sample becomes a point**, and channels become attributes. Hand it three channels named \`tx ty tz\`, map them to \`P\`, and the samples become positions in space. Here a three-channel noise curve becomes a wandering 3D line.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'chop-to-line',
        title: 'Three channels → one 3D line',
        root: '/project1/geo2',
        height: 360,
        caption:
          'Inside a second Geometry COMP, `geo2`. Assign it the same `line1` material and add it to the Render TOP (*Geometry* `geo1 geo2`) to see both together.',
        nodes: [
          {
            id: 'noise2',
            type: 'noiseCHOP',
            x: 0,
            y: 0,
            params: {
              'Channel Names': 'tx ty tz',
              'Time Slice': false,
              Start: 0,
              'Start Unit': 'I',
              End: 499,
              'End Unit': 'I',
              Period: 120,
              'Period Unit': 'I',
              Amplitude: 0.8,
              Translate: [0, { expr: 'absTime.seconds * 0.1' }, 0],
            },
            note: 'Three channels, each with its own seed, 500 samples long. Read them as X, Y and Z coordinates of 500 positions along a path.',
          },
          {
            id: 'curve',
            type: 'nullCHOP',
            x: 1,
            y: 0,
            inputs: ['noise2'],
            note: 'The interface. Anything with `tx ty tz` channels can replace the noise: recorded motion, a tracked object, a [[Pattern CHOP]].',
          },
          {
            id: 'chopto1',
            type: 'choptoPOP',
            x: 2,
            y: 0,
            params: {
              CHOP: { ref: 'curve' },
              Connectivity: 'Line Strip',
              chanscope: 'tx ty tz',
              'Attribute Scope': 'P',
            },
            note: 'One point per sample. The three channels listed in *Channel Scope* fill the three components of `P`, in order, and *Line Strip* joins the points in sample order.',
          },
          {
            id: 'null2',
            type: 'nullPOP',
            x: 3,
            y: 0,
            inputs: ['chopto1'],
            flags: { display: true, render: true },
            note: 'Flags on, ready to render with the Line MAT.',
          },
        ],
        steps: [
          {
            title: 'A three-channel curve',
            body: `Create a **Geometry COMP** \`geo2\`, clear it and go inside. Add a **Noise CHOP** \`noise2\`: *Channel Names* \`tx ty tz\`, Time Slice off, *Start* **0** and *End* **499** in samples (unit menu **I**), *Period* **120** samples, *Amplitude* **0.8**, *Translate Y* \`absTime.seconds * 0.1\`. End it with a **Null CHOP** \`curve\`.`,
            nodes: ['noise2', 'curve'],
          },
          {
            title: 'Samples become points',
            body: `Add a **CHOP to POP** \`chopto1\`: *CHOP* \`curve\`, *Connectivity* **Line Strip**, *Channel Scope* \`tx ty tz\`, *Attribute Scope* \`P\`. Append a **Null POP** \`null2\` with display and render on.

Up in \`/project1\`, set \`geo2\`'s *Material* to \`../line1\` and change \`render1\`'s *Geometry* to \`geo1 geo2\`.`,
            nodes: ['chopto1', 'null2'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
**Lookup Channel or CHOP to POP?** If you already have geometry and want to color, scale or offset it from a curve, use the Lookup Channel POP: the point count and topology stay whatever they were. If the CHOP *is* the data — a recorded gesture, a waveform, a list of sensor readings — the CHOP to POP builds points from it directly, and the point count follows the sample count. You can also map channels to attributes other than \`P\` — a \`size\` channel into \`PointScale\`, say, or into a custom attribute of your own.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Keep data flowing uphill',
      md: 'CHOP → POP is the cheap direction: a few hundred samples go up to the GPU and the heavy per-point work stays there. The reverse — [[POP to CHOP]] on a large POP every frame — downloads GPU buffers to the CPU and can stall the frame. If you find yourself converting POPs to CHOPs to do math and back again, look for a POP that does the math directly (Math, Math Mix, Limit, Lookup…).',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Raise \`noise1\`'s *Harmonics* and shorten its *Period* for a nervous, electric outline; lengthen the Lag fall time for a sleepier breath.
* Later, replace \`lfo1\` with real beats: the audio analysis in Module 3 can feed the \`pulse\` Null directly.
* Copy \`geo1\` a few times, give each copy's \`noise1\` a different *Seed* and a slightly different radius, and you have a set of concentric, independently breathing rings.`,
    },
    {
      kind: 'challenge',
      title: 'Thicker where it bulges',
      md: 'Make the stroke thicker where the ring pushes outward and thinner where it pulls in, using the same profile curve.',
      hints: [
        'The Line MAT can take its line width from a point attribute: look at its *Attributes* page.',
        'You don\'t need a second Lookup Channel POP. One POP can run several lookup blocks.',
      ],
      solution:
        'Add a second block to `lookupchannel1`: *Channel Scope* `chan1`, *From Low* −1, *From High* 1, *To Low* around 0.4, *To High* around 2, *Output Attribute Scope* `LineWidth`. Then on `line1`\'s **Attributes** page set *Line Width Attribute* to `LineWidth`. Each point\'s `LineWidth` now modulates the stroke, so wide bulges get heavier lines. Tune the To range by eye — how the attribute combines with *Width Near* is easiest to judge visually.',
    },
    {
      kind: 'challenge',
      title: 'Kick on the beat',
      md: 'Every time the ring breathes in, give its spin a short forward kick that fades out — without the angle ever jumping.',
      hints: [
        'You already have a beat-shaped signal. You need to add a scaled copy of it to the *speed*, not to the angle.',
        'A Math CHOP with two inputs can add them together (*Combine CHOPs*).',
      ],
      solution:
        'Create a **Math CHOP** `math3` fed by `pulse` with *Multiply* around 120 (Mult-Add page) to turn the 0.25–1 pulse into degrees per second. Create a **Math CHOP** `math4` with `math2` in input 0 and `math3` in input 1, and set *Combine CHOPs* to **Add**. Wire `math4` into `speed1` in place of `math2`. The kick is added to the speed, and the Speed CHOP integrates it, so the ring lurches forward on each breath and eases back — a jump-free surge. Try the same thing by adding the pulse to the *angle* instead and you\'ll see why we didn\'t.',
    },
    {
      kind: 'challenge',
      title: 'Hand on the throttle',
      md: 'Replace the slow LFO speed with the horizontal position of your mouse, so moving the mouse left reverses the ring and moving it right spins it fast.',
      hints: [
        'The [[Mouse In CHOP]] outputs the cursor position as channels. Check its viewer to see the range of values it produces.',
        'Keep `math2` and `speed1`: only the source changes, and the Math CHOP\'s *From Range* adapts to it.',
      ],
      solution:
        'Create a **Mouse In CHOP** followed by a **Select CHOP** that keeps only its X position channel, and wire the Select CHOP into `math2` in place of `lfo2`. Watch its viewer while you move the mouse across the screen and set `math2`\'s *From Range* to the lowest and highest values you see, keeping *To Range* at −20, 90. Because the result still goes through `speed1`, you can whip the mouse back and forth and the ring changes direction smoothly. Add a Lag CHOP after the mouse if your hand is jittery.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Why end a control chain in a Null CHOP and reference the Null?',
          options: [
            'Null CHOPs cook faster than other CHOPs',
            'Expressions refer to it by name, so you can change everything upstream without breaking them',
            'Only Null CHOPs can be read by POP parameters',
            'It converts the channel to a POP attribute',
          ],
          answer: 1,
          explain: 'The Null is a stable interface. Rebuild, rewire or replace what feeds it and every reference keeps working.',
        },
        {
          q: 'Rotate Z is set to `absTime.seconds * op(\'math2\')[\'chan1\']`. What happens when the speed channel changes?',
          options: [
            'The rotation smoothly speeds up',
            'The angle jumps, because the whole elapsed time is multiplied by the new speed',
            'Nothing until the timeline loops',
            'The expression errors out',
          ],
          answer: 1,
          explain: 'Time × speed recomputes the angle from scratch each frame. A Speed CHOP integrates instead, so a speed change only changes the rate.',
        },
        {
          q: 'The profile Noise CHOP has Time Slice turned off. Why?',
          options: [
            'Time-sliced CHOPs cannot be referenced',
            'To get a fixed block of samples — a whole outline — rather than one value per frame',
            'To make it cook only once',
            'Because the Lookup Channel POP only reads integers',
          ],
          answer: 1,
          explain: 'With Time Slice off, the Noise CHOP generates its full Start-to-End range every cook: a list of values the Lookup Channel POP can spread over the points.',
        },
        {
          q: 'In the Lookup Channel POP with Lookup Index Units at Normalized, a point whose index attribute is 1 reads…',
          options: ['the first sample', 'the middle sample', 'the last sample', 'sample number 1'],
          answer: 2,
          explain: '0 maps to the first sample and 1 to the last; values in between are interpolated when *Interpolate* is on.',
        },
        {
          q: 'What does the CHOP to POP do with a 500-sample CHOP whose channels are `tx ty tz`, mapped to `P`?',
          options: [
            'Creates one point with an array of 500 positions',
            'Creates 500 points, each sample\'s three channel values becoming that point\'s position',
            'Moves an existing POP\'s points',
            'Creates three line strips, one per channel',
          ],
          answer: 1,
          explain: 'Each sample becomes a point, and the listed channels fill the components of the target attribute in order.',
        },
      ],
    },
  ],
};

export default lesson;
