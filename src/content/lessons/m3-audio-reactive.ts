import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'audio-reactive',
  title: 'Audio-Reactive Geometry',
  subtitle: 'Turn a song into a ring of light that listens — every point owns a frequency band, the whole image glows with loudness.',
  minutes: 40,
  summary:
    'Reduce audio to frame-rate data with the Audio Spectrum and Analyze CHOPs, smooth it musically with lag, then spread the spectrum around a ring of points with the [[Lookup Channel POP]], push the points along their normals, color them by energy and drive a Bloom TOP from loudness.',
  objectives: [
    'Explain audio rate vs frame rate, and why audio must be reduced before it can drive points',
    'Build a spectrum chain: [[Audio Spectrum CHOP]] → gain → [[Lag CHOP]] with *Lag per Sample*',
    'Measure loudness with the [[Analyze CHOP]] (RMS Power) and use it in an expression',
    'Map a multi-sample CHOP onto points with the [[Lookup Channel POP]] and a normalized built-in index',
    'Displace points along their normals and color them by energy through a ramp',
  ],
  requires: ['chops-drive-pops', 'attributes'],
  tags: ['audio', 'chops', 'spectrum', 'lookup', 'bloom'],
  blocks: [
    {
      kind: 'md',
      md: `
Music is the input TouchDesigner artists wire up most often — and the easiest one to do badly. Plug raw audio into a parameter and you get twitchy, flickering motion that seems to have nothing to do with the song. This lesson builds the opposite: a ring of points that *listens*. Every point owns a slice of the frequency spectrum, swells outward when its band gets loud and glows hotter as it does, while the whole image blooms on the loud passages.

Two ideas carry the whole build, and every audio-reactive patch you make later rests on them:

1. **Audio has to be reduced to frame-rate data before it can drive visuals.**
2. **Smoothing is a design decision, not a cleanup step.** How a value rises and falls *is* the feel of the piece.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Two clocks: audio rate and frame rate',
      md: `TouchDesigner runs two clocks at the same time.

* **Audio rate** — tens of thousands of samples per second (44 100 or 48 000 are typical). Audio CHOPs are *time-sliced*: each frame they output only the samples that arrived since the previous frame — roughly sample rate ÷ frame rate, so several hundred samples per frame at 60 fps.
* **Frame rate** — usually 60 times a second. POPs, TOPs and parameter expressions update once per frame. A parameter can hold one value; a point attribute can hold one value per point.

So nothing audio-rate ever touches a point directly. You **reduce** first. The [[Analyze CHOP]] squeezes the frame's chunk of audio into a single number (how loud). The [[Audio Spectrum CHOP]] turns the most recent window of samples into an array of frequency magnitudes (how loud *at each pitch*). After that, the CHOP's samples no longer mean "time" — they mean "band" — and everything downstream is ordinary frame-rate data you can scale, lag and look up.`,
    },
    {
      kind: 'md',
      md: `
## Anatomy of a spectrum

The Audio Spectrum CHOP performs an FFT (Fast Fourier Transform): it takes the latest *FFT Size* samples of audio and measures how much energy sits at each frequency. Three of its settings shape everything you'll see:

* **FFT Size** is a trade-off between detail and timing. A large window resolves frequencies finely but looks further back in time, so it reacts later and smears drum hits. A small window is snappier and cheaper but blurs neighbouring pitches together. The default is large; for visuals, **1024–2048** is a comfortable middle ground.
* **Mode → Visualization** (the default) reshapes the raw FFT for eyes and ears: it boosts high frequencies, which are naturally quiet, and gives the low end more room. A raw FFT spends most of its samples on frequencies that hold very little musical information; the visualization mode spreads things out more like we hear — in octaves. The *Frequency Logarithmic Scaling* and *High Frequency Boost* parameters let you adjust both effects.
* **Output Length** controls how many samples (bands) come out. Left on *Match Length To Frequency* you get a very long channel — about one sample per hertz. Switch to **Set Length Manually** and type the number of bands you want. Fewer bands means a calmer, chunkier picture and less work for everything downstream.

If you later need just a handful of bands as separate numbers, the [[Resample CHOP]] can squeeze the spectrum further (with *Linear* interpolation it averages neighbouring samples when the output is shorter), or you can read single bands in an expression — \`op('spectrum')[0][5]\` is sample 5 of the first channel.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'spectrum-ring',
        title: 'Spectrum ring',
        root: '/project1',
        height: 600,
        caption:
          'Top row: the spectrum chain. Middle: loudness. Bottom: the ring and its render. Double-click **geo1** to see the POPs; the Lookup Channel POP reads `../spectrum`, and the Lookup Texture POP reads `../ramp1` — both one level up.',
        nodes: [
          {
            id: 'audiofilein1',
            type: 'audiofileinCHOP',
            x: 0,
            y: 0,
            params: { Repeat: 'On', Mono: true },
            note: 'Streams any music file from disk. *Mono* folds it to one channel — one spectrum is all we need, and it keeps the lookup simple. Its output is time-sliced: only the samples since the last frame.',
          },
          {
            id: 'audiodevout1',
            type: 'audiodeviceoutCHOP',
            x: 1,
            y: 1,
            inputs: ['audiofilein1'],
            note: 'Sends the audio to your speakers so you can judge the visuals against what you hear. It plays no role in the analysis.',
          },
          {
            id: 'spectrum1',
            type: 'audiospectrumCHOP',
            x: 1,
            y: 0,
            inputs: ['audiofilein1'],
            params: { 'FFT Size': '2048', 'Output Length': 'Set Length Manually', 'Set Output Length': 128 },
            note: 'Audio in, frequency magnitudes out. Each frame it analyzes the latest 2048 samples and outputs 128 bands, low frequencies first. From here on, "sample index" means "band".',
          },
          {
            id: 'math1',
            type: 'mathCHOP',
            x: 2,
            y: 0,
            inputs: ['spectrum1'],
            params: { Multiply: 4 },
            note: 'Gain. Spectrum levels depend on the track and its mastering — raise *Multiply* until loud bands peak around 1 in the CHOP viewer. Everything downstream assumes a roughly 0–1 range.',
          },
          {
            id: 'lag1',
            type: 'lagCHOP',
            x: 3,
            y: 0,
            inputs: ['math1'],
            params: { Lag: [0.03, 0.3], 'Lag per Sample': true },
            note: '**The feel of the piece lives here.** A short rise (0.03 s) keeps hits punchy; a longer fall (0.3 s) lets each band decay gracefully. *Lag per Sample* makes every band lag independently over time — without it the lag runs *along* the channel and smears bands into each other.',
          },
          {
            id: 'spectrum',
            type: 'nullCHOP',
            x: 4,
            y: 0,
            inputs: ['lag1'],
            note: 'The stable name the POPs read. Swap or tweak anything upstream and the ring keeps working.',
          },
          {
            id: 'analyze1',
            type: 'analyzeCHOP',
            x: 1,
            y: 2,
            inputs: ['audiofilein1'],
            params: { Function: 'RMS Power' },
            note: 'Reduces each frame\'s slice of raw audio to one number: its RMS level, a good stand-in for perceived loudness. Analyzing the audio (not the spectrum) keeps it independent of the spectrum settings.',
          },
          {
            id: 'lag2',
            type: 'lagCHOP',
            x: 2,
            y: 2,
            inputs: ['analyze1'],
            params: { Lag: [0.05, 0.6] },
            note: 'Loudness drives a global effect, so it gets a slower release than the bands. A glow that pumps on every sample looks like a faulty bulb.',
          },
          {
            id: 'loud',
            type: 'nullCHOP',
            x: 3,
            y: 2,
            inputs: ['lag2'],
            note: 'One channel, one sample: the smoothed loudness. Read it anywhere with `op(\'loud\')[0]`.',
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 3.4,
            params: {
              'Xform:Rotate': [0, 0, { expr: 'absTime.seconds * 5' }],
              Material: { ref: '../linemat1' },
            },
            note: 'Holds the ring. A slow spin around Z (5° per second) keeps the image from feeling static between beats.',
            children: [
              {
                id: 'circle1',
                type: 'circlePOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Line Strip',
                  Closed: true,
                  Divisions: 256,
                  Normal: 'Point',
                  'Normal Direction': 'Radial',
                },
                note: 'A closed line strip of 256 points. Radial point normals point straight out from the center — exactly the direction we want to push each point.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 1,
                y: 0,
                inputs: ['circle1'],
                params: {
                  'Operation[0]': 'A * B + C',
                  'Scope A[0]': '_PointCy',
                  'Scope B[0]': '2',
                  'Scope C[0]': '-1',
                  'Result Scope[0]': 'idx',
                  'Operation[1]': 'abs(A)',
                  'Scope A[1]': 'idx',
                  'Result Scope[1]': 'idx',
                },
                note: 'Builds the lookup index. `_PointCy` runs from 0 to just under 1 around the ring; `abs(2·_PointCy − 1)` folds that into 1 → 0 → 1, so the spectrum is mirrored and there is no seam where treble would meet bass.',
              },
              {
                id: 'lookupchan1',
                type: 'lookupchannelPOP',
                x: 2,
                y: 0,
                inputs: ['mathmix1'],
                params: {
                  CHOP: { ref: '../spectrum' },
                  'Lookup Index Attribute(s)': 'idx',
                  'Lookup Index Units': 'Normalized (0-1)',
                  Interpolate: true,
                  'Channel Scope[0]': '*',
                  'Output Attribute Scope[0]': 'amp',
                },
                note: 'For each point, uses `idx` as a 0–1 position along the spectrum channel and writes the interpolated level into a new float attribute `amp`. Index 0 reads the lowest band, 1 the highest.',
              },
              {
                id: 'mathmix2',
                type: 'mathmixPOP',
                x: 3,
                y: 0,
                inputs: ['lookupchan1'],
                params: {
                  'Operation[0]': 'A * B',
                  'Scope A[0]': 'amp',
                  'Scope B[0]': '0.6',
                  'Result Scope[0]': 'push',
                  'Operation[1]': 'A + B * C',
                  'Scope A[1]': 'P',
                  'Scope B[1]': 'N',
                  'Scope C[1]': 'push',
                  'Result Scope[1]': 'P',
                  'Operation[2]': 'A * B + C',
                  'Scope A[2]': 'amp',
                  'Scope B[2]': '2',
                  'Scope C[2]': '0.4',
                  'Result Scope[2]': 'PointScale',
                },
                note: 'Three mini-equations: scale `amp` into a distance, move each point that far along its normal (`P + N · push`), and size the dots with energy via `PointScale`.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 4,
                y: 0,
                inputs: ['mathmix2'],
                params: {
                  TOP: { ref: '../ramp1' },
                  'Lookup Index Attribute U': 'amp',
                  'Lookup Index Attribute V': 'amp',
                  'Output Attribute Scope': 'Color',
                },
                note: 'Colors by energy: `amp` picks a position along the horizontal ramp. A horizontal ramp is the same all the way down, so using `amp` for V as well is just a safe way to fill the second index.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'Display and render flags live here.',
              },
            ],
            childComments: [{ x: 1, y: 0.95, w: 3, text: 'index → lookup → displace → color' }],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 4.6,
            params: { 'Xform:Translate': [0, 0, 4] },
            note: 'Straight-on view of the ring with room for it to swell.',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 1,
            y: 4.6,
            params: { Type: 'Horizontal' },
            note: 'The energy palette, read left (quiet) to right (loud). Edit its keys: try deep blue → magenta → orange → near-white.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 2,
            y: 4.6,
            params: {
              'Draw Points': true,
              'Point Type': 'Circle (Polygon)',
              'Width Near': 2,
              'Line Color Attribute': 'Color',
              'Point Color Attribute': 'Color',
              'Point Size Attribute': 'PointScale',
            },
            note: 'Draws the line strip as a stroke and each point as a dot. The *Attributes* page tells it to take color from `Color` and dot size from `PointScale`. Unlit, so no light is needed.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 3.4,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0.01, 0.01, 0.02, 1],
            },
            note: 'Renders the ring. Anti-aliasing matters for thin lines.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 3.4,
            inputs: ['render1'],
            params: { 'Bloom Intensity': { expr: "0.5 + op('loud')[0] * 6" } },
            note: 'The glow breathes with loudness. The 0.5 keeps a little bloom in quiet passages; tune the 6 to your track.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 4,
            y: 3.4,
            inputs: ['bloom1'],
            note: 'Final image.',
          },
        ],
        comments: [
          { x: 0, y: -0.7, w: 3, text: 'Audio rate ends at the Spectrum / Analyze CHOPs. Everything to their right is frame-rate data.' },
        ],
        boxes: [
          { title: 'Spectrum (per band)', nodes: ['spectrum1', 'math1', 'lag1', 'spectrum'], tone: 'green' },
          { title: 'Loudness (one value)', nodes: ['analyze1', 'lag2', 'loud'], tone: 'blue' },
        ],
        steps: [
          {
            title: 'Play the music',
            body: `Create an **Audio File In CHOP** \`audiofilein1\` and point *File* at any music file on your machine (mp3, wav, aiff…). Turn on **Mono** and set *Repeat* to **On**.

Add an **Audio Device Out CHOP** \`audiodevout1\` wired from it so you can hear the track.

Middle-click \`audiofilein1\`: the sample rate is in the tens of thousands, yet the CHOP is only a few hundred samples long. That's one frame's slice of audio — the audio-rate clock in action.`,
            nodes: ['audiofilein1', 'audiodevout1'],
          },
          {
            title: 'From time to frequency',
            body: `Wire an **Audio Spectrum CHOP** \`spectrum1\` from \`audiofilein1\`. Set *FFT Size* to **2048**, *Output Length* to **Set Length Manually** and *Set Output Length* to **128**.

Add a **Math CHOP** \`math1\` and raise *Multiply* (Mult-Add page) until the loud bands in its viewer peak around 1. Start near **4** and adjust for your track — mastered pop and quiet ambient need very different gains.`,
            nodes: ['spectrum1', 'math1'],
          },
          {
            title: 'Smooth every band',
            body: `Add a **Lag CHOP** \`lag1\`. Set *Lag* to **0.03** (rising) and **0.3** (falling), with the unit in seconds, and turn on **Lag per Sample**.

Watch the viewer with and without *Lag per Sample*: with it off, the lag runs along the channel's samples as if they were time, so bands bleed sideways. With it on, each band is smoothed *over frames* on its own.

End with a **Null CHOP** named exactly \`spectrum\`.`,
            nodes: ['lag1', 'spectrum'],
          },
          {
            title: 'A ring with outward normals',
            body: `Create a **Geometry COMP** \`geo1\`, dive in and remove its default contents. Add a **Circle POP** \`circle1\`: *Connectivity* **Line Strip**, *Closed* on, *Divisions* **256**, *Normal* **Point**, *Normal Direction* **Radial**.

Middle-click it: 256 points, one closed line strip, and an \`N\` attribute pointing away from the center.`,
            nodes: ['geo1', 'circle1'],
          },
          {
            title: 'Give every point a band',
            body: `Append a **Math Mix POP** \`mathmix1\` with two Combine blocks:

1. *Operation* **A * B + C**, *Scope A* \`_PointCy\` (find it under **>** in the attribute menu), *Scope B* \`2\`, *Scope C* \`-1\`, *Result Scope* \`idx\`.
2. *Operation* **abs(A)**, *Scope A* \`idx\`, *Result Scope* \`idx\`.

Then a **Lookup Channel POP** \`lookupchan1\`: *CHOP* \`../spectrum\`, *Lookup Index Attribute(s)* \`idx\`, *Lookup Index Units* **Normalized (0-1)**, *Interpolate* on. In the first Lookup block set *Channel Scope* \`*\` and *Output Attribute Scope* \`amp\`.

A POP to DAT (or the info popup) would now show \`amp\` changing on every frame.`,
            nodes: ['mathmix1', 'lookupchan1'],
          },
          {
            title: 'Push along the normals',
            body: `Append a **Math Mix POP** \`mathmix2\` with three blocks:

1. **A * B** — \`amp\`, \`0.6\` → \`push\`
2. **A + B * C** — \`P\`, \`N\`, \`push\` → \`P\`
3. **A * B + C** — \`amp\`, \`2\`, \`0.4\` → \`PointScale\`

The ring now bulges where the music has energy. Middle-click the node to read the pseudo-code of what you built.`,
            nodes: ['mathmix2'],
          },
          {
            title: 'Color by energy',
            body: `Back in \`/project1\`, create a **Ramp TOP** \`ramp1\` with *Type* **Horizontal** and edit its keys into a palette that goes from calm to hot.

Inside \`geo1\`, append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`../ramp1\`, *Lookup Index Attribute U* and *V* both \`amp\`, *Output Attribute Scope* \`Color\`. Finish with a **Null POP** \`null1\` with display and render flags on.`,
            nodes: ['ramp1', 'lookuptex1', 'null1'],
          },
          {
            title: 'Render lines and dots',
            body: `In \`/project1\` create a **Camera COMP** \`cam1\` at *Translate* **0, 0, 4**, and a **Line MAT** \`linemat1\`: on the *Point* page turn on *Draw Points* with *Point Type* **Circle (Polygon)**; on *Setup* set *Width Near* to **2**; on *Attributes* set *Line Color Attribute* and *Point Color Attribute* to \`Color\` and *Point Size Attribute* to \`PointScale\`.

Assign \`linemat1\` as \`geo1\`'s *Material*, give \`geo1\` a *Rotate Z* expression of \`absTime.seconds * 5\`, and add a **Render TOP** \`render1\` (camera \`cam1\`, geometry \`geo1\`, *Anti-Alias* **4x**, near-black background).`,
            nodes: ['cam1', 'linemat1', 'render1'],
            focus: ['geo1'],
          },
          {
            title: 'Measure loudness',
            body: `Wire an **Analyze CHOP** \`analyze1\` from \`audiofilein1\` with *Function* **RMS Power**. It outputs a single sample: the level of this frame's audio.

Smooth it with a **Lag CHOP** \`lag2\` (*Lag* **0.05** / **0.6**, no per-sample needed — it's one sample) and end in a **Null CHOP** \`loud\`.`,
            nodes: ['analyze1', 'lag2', 'loud'],
          },
          {
            title: 'Let loudness drive the glow',
            body: `Append a **Bloom TOP** \`bloom1\` to \`render1\` and set *Bloom Intensity* to the expression \`0.5 + op('loud')[0] * 6\`. Finish with a **Null TOP** \`out1\`.

Play a track with quiet and loud sections. The ring traces the spectrum, and the whole frame blooms when the music swells. If the glow never moves, your track's RMS is small — raise the 6.`,
            nodes: ['bloom1', 'out1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## How the ring listens

**The index is the mapping.** The Lookup Channel POP doesn't know anything about circles. It only asks each point, "where along the channel should I read?" — a 0–1 number in this setup. Whatever you put into that index attribute *is* your layout. \`_PointU\` would sweep the spectrum once around the ring, low to high, leaving a hard jump where the last point meets the first. Folding \`_PointCy\` into \`abs(2·_PointCy − 1)\` sweeps it out and back, so the ring is a mirror image with the lowest band on one side and the highest opposite. Swap in \`P.y\` remapped to 0–1 and bands stack bottom-to-top on any shape; use a random attribute and the spectrum scatters across a cloud.

**Normals make it shape-agnostic.** \`P + N · push\` says "move outward from the surface by the band's energy". It works unchanged on a circle, a sphere, a torus or a scanned mesh — anything with sensible normals. That's why the Circle POP's *Normal Direction* matters: *Radial* normals point out from the center; tangent normals would slide points along the ring instead.

**Energy is just another attribute.** Once \`amp\` lives on the points, everything can read it: displacement, color, point size, line width, a [[Delete POP]] threshold, the speed of a noise. Building one well-shaped attribute and fanning it out is far easier to tune than five separate CHOP references.

**Why the gain sits before the lag.** The Math CHOP sets the scale, the Lag CHOP sets the motion. Keeping them separate means you can re-level a new track without touching the feel you dialled in.
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Lag CHOP, Lag per Sample on',
        md: 'Smooths each band **over time**. Separate rise and fall times give the classic meter feel: snap up on a hit, sink slowly. This is what makes the ring look musical.',
      },
      right: {
        title: 'Filter CHOP, Filter per Sample off',
        md: 'Smooths **across neighbouring bands** within one frame, rounding a jagged spectrum into soft hills. Add one before the lag if the ring looks spiky; set its *Filter Width Unit* to samples so the width counts bands.',
      },
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Smoothing costs latency',
      md: 'Every lag delays the response. A 0.3 s *rise* time makes kick drums land visibly late, and the eye notices within a few frames. Keep the attack short (0.02–0.05 s) and spend your smoothing on the release, where it reads as grace rather than delay.',
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Going live',
      md: 'Replace the Audio File In CHOP with an [[Audio Device In CHOP]]: pick your interface in *Device*, set *Format* to **Mono**, and wire it into `spectrum1` and `analyze1` in its place. Nothing downstream changes, because everything reads the `spectrum` and `loud` Nulls. With a microphone in the room, deactivate the Audio Device Out CHOP to avoid acoustic feedback.',
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Keep the band count sensible',
      md: 'The FFT runs on the CPU every frame, and the CHOP is uploaded to the GPU for the lookup. 128–512 bands cost almost nothing; the default output of thousands of samples (one per hertz) is wasted work when your ring has a few hundred points. Lower *FFT Size* is also cheaper — and snappier.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Stack rings: branch a second chain off \`mathmix1\` that rewrites \`idx\` as \`1 - idx\` before its own lookup, and shrink it into an inner ring where bass and treble swap sides.
* Drive \`geo1\`'s *Uniform Scale* from \`loud\` for a gentle whole-shape pulse.
* Feed \`amp\` into a [[Noise POP]]'s *Amplitude* through its Map page so loud bands get rough, quiet bands stay smooth.
* Render only the dots, larger, with additive blending (next lesson) for a starfield that sings.`,
    },
    {
      kind: 'challenge',
      title: 'A listening sphere',
      md: 'Replace the circle with a geodesic [[Sphere POP]] so bands stack from the bottom of the sphere (bass) to the top (treble), and every point pushes out along its own normal.',
      hints: [
        'The Sphere POP can output point normals (its *Normal* menu). After that you only need a new index.',
        '`P.y` runs from about −1 to 1 on a unit sphere. You need 0–1.',
      ],
      solution:
        'Swap `circle1` for a **Sphere POP** (*Type* Geodesic, *Frequency* around 30, *Normal* **Point**). In `mathmix1` change block 0 to **A * B + C** with `P.y`, `0.5`, `0.5` → `idx`, and delete block 1 (no folding needed). Everything after it — lookup, push, color — works unchanged, because it only reads `idx`, `N` and `amp`. Set *Geodesic Connectivity* to **Point Primitives** for a cloud of dots, or keep triangles and switch to a PBR MAT for a solid, lit blob.',
    },
    {
      kind: 'challenge',
      title: 'Kick pump',
      md: 'Make the whole ring scale up on the kick drum without reacting to hi-hats.',
      hints: [
        'The kick lives in the first few bands of `spectrum`.',
        'A Channel acts like a list: `op(\'spectrum\')[0][2]` is the third band.',
      ],
      solution:
        "Set `geo1`'s **Uniform Scale** (Xform page) to `1 + op('spectrum')[0][2] * 0.25`. Try indices 1–4 until it locks onto your track's kick. For a cleaner signal, average a few bands: `1 + (op('spectrum')[0][1] + op('spectrum')[0][2] + op('spectrum')[0][3]) / 3 * 0.3`. The lag you already set in `lag1` keeps the pump from chattering.",
    },
    {
      kind: 'challenge',
      title: 'Spectrogram tunnel (preview of lesson 3.3)',
      md: 'Keep a short history of the ring so that past frames trail away into the distance — a 3D spectrogram.',
      hints: [
        'The [[Trail POP]] stores the last few seconds of its input as slices.',
        'Its *Transform* page moves the stored history over time.',
      ],
      solution:
        'Branch a **Trail POP** off `null1` with *Trail Length* around 2 seconds, and give its Transform page a small *Translate Z* so the stored history keeps moving each frame — flip the sign if it drifts toward the camera instead of away. Put a Null with the render flag after it. The trail adds a new dimension (one slice per stored frame), and *Connectivity* decides what gets joined: one line per stored ring gives stacked contours, one line per point through time gives streaks. Try **Rows** and **Columns** and keep the one that draws stacked rings — the next-but-one lesson, **Feedback Loops & Trails**, explains the difference.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Why can\'t you wire raw audio straight into a point attribute?',
          options: [
            'POPs can\'t read CHOPs at all',
            'Audio arrives at audio rate in time slices; points update once per frame, so audio must first be reduced to per-frame values',
            'Audio CHOPs only work on the CPU',
            'The Lookup Channel POP only accepts one sample',
          ],
          answer: 1,
          explain: 'Each frame delivers hundreds of new audio samples. Analyze (one number) or Audio Spectrum (one value per band) turns them into frame-rate data a POP can use.',
        },
        {
          q: 'What does *Lag per Sample* do on a Lag CHOP that receives the spectrum?',
          options: [
            'Lags only the first sample',
            'Lags each band independently over time instead of running the lag along the channel\'s samples',
            'Converts the spectrum back into audio',
            'Makes the lag use samples as its time unit',
          ],
          answer: 1,
          explain: 'A spectrum is one multi-sample channel. Per-sample lag treats every band as its own value changing over frames.',
        },
        {
          q: 'You increase *FFT Size* from 1024 to 8192. What should you expect?',
          options: [
            'Finer frequency detail, but slower, smeared reactions to transients',
            'Faster reactions with less detail',
            'No visible change',
            'More output bands regardless of Output Length',
          ],
          answer: 0,
          explain: 'A larger window resolves pitch better but spans more time, so hits are averaged into a longer stretch of audio.',
        },
        {
          q: 'In this ring, which value decides which band a point reads?',
          options: ['Its position `P`', 'Its normal `N`', 'The `idx` attribute used as the lookup index', 'The Circle POP\'s Divisions'],
          answer: 2,
          explain: 'The Lookup Channel POP reads each point\'s index attribute: 0 → first sample (lowest band), 1 → last sample.',
        },
        {
          q: 'Which lag setting gives punchy hits that fade gracefully?',
          options: ['Long rise, short fall', 'Short rise, long fall', 'Equal long rise and fall', 'No lag'],
          answer: 1,
          explain: 'A short attack keeps timing tight; the longer release is where smoothing reads as musical decay instead of latency.',
        },
      ],
    },
  ],
};

export default lesson;
