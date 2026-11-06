import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'particles',
  title: 'Particle Systems with the Particle POP',
  subtitle: 'Births, lifespans, forces and curl noise — build a column of embers that rises, swirls and burns out.',
  minutes: 45,
  summary:
    'The Particle POP and its feedback loop from the ground up: an emitter, launch directions mapped onto initial velocity, buoyancy and swirl from a [[Force Radial POP]], curl noise added into `PartForce`, the Initialize/Start lifecycle, and age-based color and size rendered as additive glowing dots.',
  objectives: [
    'Describe what makes a point a particle: the `Part*` attributes and how the Particle POP integrates them',
    'Build the feedback loop: Particle POP → forces → Null referenced by *Target Feedback Loop POP*',
    'Control population with birth rate, life expectancy, variance and *Maximum Particles*',
    'Add forces with the [[Force Radial POP]] and curl noise written into `PartForce` by the [[Noise POP]]',
    'Run the system with Initialize / Start / Play / Pre-Roll and read its state in an [[Info CHOP]]',
    'Color and size particles by age and render them as additive dots with the [[Line MAT]]',
  ],
  requires: ['attributes', 'render-stack'],
  tags: ['particles', 'simulation', 'feedback', 'curl noise', 'forces'],
  blocks: [
    {
      kind: 'md',
      md: `
Embers rising off a fire are the perfect first particle system: thousands of tiny lights that are born, drift upward, get caught in eddies and fade out. Nothing about any single ember is interesting. All the beauty is in the *rules* — and particle systems are nothing more than rules applied to every point, every frame.

In this lesson you build those rules with POPs. By the end you'll have a self-sustaining column of embers whose launch, buoyancy, swirl, turbulence, color and size are each one small, readable node — and you'll know exactly where to plug in your own.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'A particle is a point with a memory',
      md: `A particle is an ordinary POP point that carries a few extra attributes from frame to frame. The [[Particle POP]] creates and maintains them:

| Attribute | Type | Meaning |
|---|---|---|
| \`PartId\` | uint | unique id, stays with the particle for life |
| \`PartVel\` | float3 | velocity, in units per second |
| \`PartForce\` | float3 | the sum of forces acting on it |
| \`PartMass\` | float | mass — the same force moves heavy particles less |
| \`PartAge\` | float | seconds since birth |
| \`PartLifeSpan\` | float | seconds it will live |
| \`PartDrag\` | float | drag factor slowing it against its motion |
| \`PartDeath\` | uint | optional — set it to 1 or more to kill the particle |

Every frame the Particle POP **integrates**: it turns force into a change of velocity, and velocity into a change of position, scaled by the time step:

\`PartVel += PartForce / PartMass × dt\`  then  \`P += PartVel × dt\`

Drag and *Velocity Damping* then bleed off speed. Everything else — which forces exist, how strong, where — is up to the POPs you place in the loop.`,
    },
    {
      kind: 'md',
      md: `
## The loop

The Particle POP is built on the same idea as the [[Feedback POP]]: it needs to see *last frame's* particles to compute this frame's. So the network is a loop, though you never draw the wire back:

1. **Emitter → Particle POP.** The input's points are the birth positions. The Particle POP adds new particles, ages them, removes the dead, and integrates motion.
2. **Particle POP → force POPs → Null.** Anything in between edits the particles: adds to \`PartForce\`, tweaks velocities, sets \`PartDeath\`.
3. **Null → back to the Particle POP.** The Particle POP's *Target Feedback Loop POP* parameter names that Null. Next frame, it reads the Null's result — with your forces in it — as the state to integrate.

Two rules keep the loop healthy. **Only the Particle POP creates and removes particles** — no Delete POPs or merges inside the loop, because the point count coming back must match what went out. And **keep the reserved \`Part*\` attributes intact** on their way round. Add your own attributes freely; they travel with the particles.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'ember-system',
        title: 'Curl-noise embers',
        root: '/project1',
        height: 580,
        caption:
          'Inside **geo1**, the top row is the simulation loop: `particle1` reads `loop_end` (dashed reference) one frame later. The bottom row only *looks* at the particles — coloring and sizing them for render — so it never feeds back into the simulation.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: { Material: { ref: 'linemat1' } },
            note: 'Holds the whole particle system. Only `null1` is flagged for render.',
            children: [
              {
                id: 'pointgenerator1',
                type: 'pointgeneratorPOP',
                x: 0,
                y: 0,
                params: {
                  Shape: 'Sphere',
                  Distribution: 'Volume',
                  'Number of Points': 2000,
                  Random: true,
                  Translate: [0, -1.2, 0],
                  Scale: [0.6, 0.1, 0.6],
                },
                note: 'The emitter: 2000 random points filling a flattened sphere — a glowing bed of coals below the frame center. Births are picked from these points.',
              },
              {
                id: 'random1',
                type: 'randomPOP',
                x: 1,
                y: 0,
                inputs: ['pointgenerator1'],
                params: {
                  Type: 'Direction',
                  'Random Size': '3',
                  'Cone Direction': [0, 1, 0],
                  'Cone Angle': 35,
                  'Random:Combine Operation': 'Set',
                  'Output Attribute Scope': 'launch',
                },
                note: 'Gives every emitter point a random unit vector inside a 35° cone around +Y, stored as `launch`. The Particle POP\'s Map page turns it into each particle\'s initial velocity.',
              },
              {
                id: 'particle1',
                type: 'particlePOP',
                x: 2,
                y: 0,
                inputs: ['random1'],
                params: {
                  'Target Feedback Loop POP': { ref: 'loop_end' },
                  'Create Point Primitives': true,
                  'Maximum Particles': 100000,
                  'Birth Rate': 4000,
                  'Randomize Input Points': true,
                  'Life Expect': 4,
                  'Life Variance (Fraction)': 0.5,
                  'Jitter Births During Frame': true,
                  'Initial Velocity': [1.2, 1.2, 1.2],
                  'Velocity Damping': 0.02,
                  'Pre-Roll': 4,
                  'Element[0]': 'launch',
                  'Parameter[0]': 'initvelocity',
                  'Combine Operation[0]': 'Multiply',
                },
                note: 'The engine. About 4000 births per second, each living around 4 s ± 50 %. The Map block multiplies *Initial Velocity* by each emitter point\'s `launch` vector, so every ember leaves at 1.2 units/s in its own direction. *Velocity Damping* bleeds that launch off quickly; the forces take over.',
              },
              {
                id: 'forceradial1',
                type: 'forceradialPOP',
                x: 3,
                y: 0,
                inputs: ['particle1'],
                params: {
                  'Global Force': [0, 0.5, 0],
                  'Enable Radial': false,
                  'Enable Spiral': true,
                  Direction: [0, 1, 0],
                  'Spiral Strength': 0.6,
                  Falloff: 'S Curve',
                  Radius: 2,
                },
                note: 'Two forces summed into `PartForce`: a constant upward push (hot air rises) from the *Global* page, and a spiral around the vertical axis from the *Force* page that twists the column. The falloff limits the swirl to the area around the center.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 4,
                y: 0,
                inputs: ['forceradial1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.5,
                  Harmonics: 1,
                  Amplitude: 1,
                  'Translate 4D': { expr: 'absTime.seconds * 0.15' },
                  'Output:Combine Operation': 'Add',
                  'Combine Entity': 'Curl 3D',
                  'Combine Attribute Scope': 'PartForce',
                  'Output Attribute Scope': 'PartForce',
                },
                note: 'Turbulence. Instead of moving `P`, this Noise POP computes the **curl** of the noise field at each particle and **adds** it to `PartForce`. Curl noise swirls without creating sinks where particles would clump — the signature smoke look.',
              },
              {
                id: 'loop_end',
                type: 'nullPOP',
                x: 5,
                y: 0,
                inputs: ['noise1'],
                note: 'The end of the loop. `particle1` reads this node one frame later. Never put anything that adds or removes points between `particle1` and here.',
              },
              {
                id: 'mathmix1',
                type: 'mathmixPOP',
                x: 5,
                y: 1,
                inputs: ['loop_end'],
                params: {
                  'Operation[0]': 'A / B',
                  'Scope A[0]': 'PartAge',
                  'Scope B[0]': 'PartLifeSpan',
                  'Result Scope[0]': 'life',
                  'Operation[1]': 'B - A',
                  'Scope A[1]': 'life',
                  'Scope B[1]': '1',
                  'Result Scope[1]': 'PointScale',
                },
                note: 'Normalized age: `life` goes from 0 at birth to 1 at death, whatever each particle\'s lifespan. `PointScale = 1 − life` shrinks embers as they burn out.',
              },
              {
                id: 'lookuptex1',
                type: 'lookuptexturePOP',
                x: 6,
                y: 1,
                inputs: ['mathmix1'],
                params: {
                  TOP: { ref: '../ramp1' },
                  'Lookup Index Attribute U': 'life',
                  'Lookup Index Attribute V': 'life',
                  'Output Attribute Scope': 'Color',
                },
                note: 'Colors each ember by its normalized age from the ramp: white-hot at birth, orange, deep red, then black.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 7,
                y: 1,
                inputs: ['lookuptex1'],
                flags: { display: true, render: true },
                note: 'What gets rendered. It sits *outside* the loop, so render-only attributes never feed back into the simulation.',
              },
            ],
            childComments: [
              { x: 2, y: -0.75, w: 3, text: 'Simulation loop: particle1 → forces → loop_end ⟲' },
              { x: 5, y: 1.85, w: 3, text: 'Render branch: looks, never feeds back' },
            ],
          },
          {
            id: 'info1',
            type: 'infoCHOP',
            x: 0,
            y: 1.2,
            params: { Operator: { ref: 'geo1/particle1' } },
            note: 'Shows the system\'s state: `initializing`, `ready`, `running`, `done`, plus timer channels. Your first stop when "nothing happens".',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 1,
            y: 1.2,
            params: { Type: 'Horizontal' },
            note: 'Age palette, left = newborn, right = dying. With additive blending, black means invisible, so end the ramp in black for a clean fade-out.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 2.4,
            params: { 'Xform:Translate': [0, 0.4, 5] },
            note: 'Slightly raised and pulled back to frame the column from the coals up.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 1,
            y: 2.4,
            params: {
              'Draw Points': true,
              'Point Type': 'Circle',
              'Width Near': 3,
              'Point Color Attribute': 'Color',
              'Point Size Attribute': 'PointScale',
              'Blending (Transparency)': true,
              'Destination Color *': 'One',
              'Write Depth Values': false,
            },
            note: 'Draws each point primitive as a dot sized by `PointScale` and colored by `Color`. On the *Common* page, blending with *Destination Color* **One** makes it **additive**: overlapping embers add up to bright cores. Depth writes are off so dots don\'t hide each other.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0, 0, 0, 1],
            },
            note: 'Pure black background so additive dots read as light.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 3,
            y: 0,
            inputs: ['render1'],
            params: { 'Bloom Intensity': 1.2 },
            note: 'Halos around the hottest clusters sell the heat.',
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
            title: 'An emitter',
            body: `Create a **Geometry COMP** \`geo1\`, dive in and clear it. Add a **Point Generator POP** \`pointgenerator1\`: *Shape* **Sphere**, *Distribution* **Volume**, *Number of Points* **2000**, *Random* on. On its *Transform* page set *Translate* **0, −1.2, 0** and *Scale* **0.6, 0.1, 0.6** — a flat lens of points below center.

These points are not particles yet; they are the places where particles will be born.`,
            nodes: ['geo1', 'pointgenerator1'],
          },
          {
            title: 'Launch directions',
            body: `Append a **Random POP** \`random1\`: *Type* **Direction**, *Random Size* **3**, *Cone Direction* **0, 1, 0**, *Cone Angle* **35**, *Combine Operation* **Set**, *Output Attribute Scope* \`launch\`.

Middle-click it: every emitter point now carries a unit-length float3 \`launch\` pointing roughly upward.`,
            nodes: ['random1'],
          },
          {
            title: 'The Particle POP',
            body: `Append a **Particle POP** \`particle1\`. On the *Particles* page:

* *Create Point Primitives* **on** — without primitives, points don't render.
* *Maximum Particles* **100000**, *Birth Rate* **4000** with its unit menu on seconds, *Randomize Input Points* **on**.
* *Life Expect* **4** (seconds), *Life Variance (Fraction)* **0.5**, *Jitter Births During Frame* **on**.
* *Initial Velocity* **1.2, 1.2, 1.2**, *Velocity Damping* **0.02**.

On the *Map* page (add a block with **+** if there is none): *Element* \`launch\`, *Parameter* **initvelocity (Initial Velocity)**, *Combine Operation* **Multiply**. Each particle's start velocity is now 1.2 × its emitter point's \`launch\` vector.`,
            nodes: ['particle1'],
          },
          {
            title: 'Close the loop and start it',
            body: `Append a **Null POP** named \`loop_end\`. Back on \`particle1\`, set *Target Feedback Loop POP* to \`loop_end\` — a dashed reference line appears.

Now pulse **Initialize**, then **Start**. Particles stream up out of the emitter, slow down (damping) and vanish when their lifespan runs out. Pulse *Initialize* any time to reset.`,
            nodes: ['loop_end'],
            focus: ['particle1'],
          },
          {
            title: 'Watch the state',
            body: `In \`/project1\` add an **Info CHOP** \`info1\` with *Operator* \`geo1/particle1\`. Watch \`initializing\`, \`ready\`, \`running\` and \`done\` as you press *Initialize* and *Start*.

Now set \`particle1\`'s *Pre-Roll* to **4** seconds and pulse *Initialize* again: TouchDesigner simulates four seconds while initializing, \`ready\` turns on, and when you press *Start* the column is already full. Use this whenever a piece has to look "lived-in" from its first frame.`,
            nodes: ['info1'],
            focus: ['particle1'],
          },
          {
            title: 'Buoyancy and swirl',
            body: `Insert a **Force Radial POP** \`forceradial1\` between \`particle1\` and \`loop_end\`.

* *Global* page: *Global Force* **0, 0.5, 0**.
* *Force* page: *Enable Radial* **off**, *Enable Spiral* **on**, *Direction* **0, 1, 0**, *Spiral Strength* **0.6**, *Falloff* **S Curve**, *Radius* **2**.

Embers now keep rising after the launch dies away, and the column twists. A negative *Spiral Strength* turns the other way.`,
            nodes: ['forceradial1'],
          },
          {
            title: 'Curl-noise turbulence',
            body: `Insert a **Noise POP** \`noise1\` after \`forceradial1\`: *Type* **Simplex 4D (GPU)**, *Period* **1.5**, *Harmonics* **1**, *Amplitude* **1**, and *Translate 4D* as the expression \`absTime.seconds * 0.15\`.

On the **Output** page: *Combine Operation* **Add**, *Combine Entity* **Curl 3D**, *Combine Attribute Scope* \`PartForce\`, *Output Attribute Scope* \`PartForce\`. The noise no longer touches positions — it adds a swirling force. Re-*Initialize* and watch the column break into eddies. If the turbulence shreds the column completely, lower *Amplitude*; if it barely wobbles, raise it.`,
            nodes: ['noise1'],
          },
          {
            title: 'Age drives color and size',
            body: `In \`/project1\` create a **Ramp TOP** \`ramp1\` (*Type* **Horizontal**) with keys running white → yellow → orange → deep red → black.

Inside \`geo1\`, branch a **Math Mix POP** \`mathmix1\` off \`loop_end\`: block 0 **A / B** — \`PartAge\`, \`PartLifeSpan\` → \`life\`; block 1 **B - A** — \`life\`, \`1\` → \`PointScale\`.

Then a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`../ramp1\`, *Lookup Index Attribute U* and *V* \`life\`, *Output Attribute Scope* \`Color\`.`,
            nodes: ['ramp1', 'mathmix1', 'lookuptex1'],
          },
          {
            title: 'Additive dots',
            body: `Finish the branch with a **Null POP** \`null1\` and give it the display and render flags.

In \`/project1\` add a **Camera COMP** \`cam1\` at **0, 0.4, 5** and a **Line MAT** \`linemat1\`: *Draw Points* on, *Point Type* **Circle**, *Width Near* **3**, *Point Color Attribute* \`Color\`, *Point Size Attribute* \`PointScale\`. On its **Common** page turn on *Blending (Transparency)*, set *Destination Color* to **One**, and turn off *Write Depth Values*. Assign it as \`geo1\`'s *Material*.`,
            nodes: ['null1', 'cam1', 'linemat1'],
            focus: ['geo1'],
          },
          {
            title: 'Render and glow',
            body: `Add a **Render TOP** \`render1\` (camera \`cam1\`, geometry \`geo1\`, *Anti-Alias* **4x**, black background), a **Bloom TOP** \`bloom1\` with *Bloom Intensity* **1.2**, and a **Null TOP** \`out1\`.

Re-initialize with pre-roll and start. You should see a dense, glowing bed at the bottom feeding a twisting column of embers that cool and shrink as they rise.`,
            nodes: ['render1', 'bloom1', 'out1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Controlling the population

At steady state, the number of live particles is roughly **birth rate × average lifespan**: 4000 per second × 4 s ≈ 16 000 embers, give or take what the variance adds. *Maximum Particles* is a ceiling on that population, so keep it comfortably above your estimate; if the system hits it, new births have to wait for old particles to die and the emitter starts to look patchy.

**Life Variance (Fraction)** spreads lifespans as a fraction of *Life Expect*: at 0.5, lifespans vary by around half of the expectancy. Without variance, every particle born in the same frame dies in the same frame and the top of the column ends in a hard, flat edge. The variance pattern repeats over time; if you notice a rhythm in it, animate *Random Seed* slowly.

*Jitter Births During Frame* spreads each frame's births across the frame's duration instead of releasing them all at once. With fast launches this removes the "pulsing" bands you'd otherwise see — each frame's batch travelling as a layer.

## Why forces, not positions

You could move particles by editing \`P\` directly, like you did with the noise blob in lesson 1.1. But then every particle would follow the field exactly and the motion would look rigid. Writing into **\`PartForce\`** instead lets the integrator do its job: forces change *velocity*, velocity changes position, so each particle has momentum. A particle carried past an eddy keeps going a little; heavy particles (higher \`PartMass\`) respond more slowly than light ones. That inertia is what makes it look physical.

Forces are **additive by design**. The Force Radial POP adds its sum to any \`PartForce\` already on its input, and the Noise POP's *Add* combine does the same. So you can chain as many force nodes as you like, in any order, and each one contributes. You don't need the Force Radial POP at all: Math Mix, Pattern, Lookup or GLSL POPs can all write into \`PartForce\`.

## Curl noise in one paragraph

Plain vector noise used as a force has spots where the arrows point toward each other; particles pile up there and the cloud clumps into knots. The **curl** of a noise field is a different vector field built from the noise's slopes. It has a useful property: it never converges or diverges — whatever flows into a region flows out again. Particles in a curl field swirl around each other forever without collapsing into sinks, which is why it's the standard trick for smoke, ink and flocks of sparks. *Period* sets the size of the eddies; *Amplitude* (with period) sets how hard they push; sliding *Translate 4D* makes the eddies themselves evolve.
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'Noise added to P',
        md: 'Points snap to the field. Every particle at the same spot moves identically, regardless of history. Fine for deforming shapes; stiff for simulations.',
      },
      right: {
        title: 'Curl noise added to PartForce',
        md: 'The field nudges velocity. Particles carry momentum through eddies, overshoot, and diverge from neighbours over time. This is what reads as smoke.',
      },
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Initialize, Start, Play — the lifecycle',
      md: `* **Initialize** snapshots the starting state (and runs *Pre-Roll* seconds of simulation if set) and waits in \`ready\`.
* **Start** begins running. Pressing Start without Initialize does both at once.
* **Play** off pauses the loop and stops the chain from cooking; the *Step* pulse beside it nudges the paused loop forward — perfect for debugging forces.
* **Speed** scales simulation time: 0.25 is instant slow motion.
* **Go to Done** stops the loop until the next Initialize.

After changing emitter or birth parameters, re-Initialize to see a clean result rather than a mix of old and new particles.`,
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Things that break the loop',
      md: `* A [[Delete POP]], merge or anything else that changes the point count between \`particle1\` and \`loop_end\`. To kill particles, set \`PartDeath\` instead (with *Use Death Attribute* on — Attributes page).
* Overwriting or deleting \`Part*\` attributes inside the loop.
* Pointing *Target Feedback Loop POP* at a node *outside* the loop (like \`null1\`). It may appear to work, but render-only attributes then feed back into the simulation.`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Particles are cheap; pixels are not',
      md: 'The simulation is a handful of compute passes, so hundreds of thousands of particles are realistic on a decent GPU. The usual bottleneck is drawing: big additive dots overdraw the same pixels many times. If the frame rate drops, shrink *Width Near* before you cut the particle count, lower the Line MAT\'s *Num Points in Circle*, and remember that bloom works on the final image — its cost doesn\'t depend on how many particles you have.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* **Snow**: Global Force pointing down, no spiral, slower curl with a large *Period*, a white-to-blue ramp.
* **Ink in water**: emit from a single point with high *Jitter Birth Position*, strong curl, long lifespans, *Speed* 0.3, and a dark-on-light render.
* **Galaxy**: emit from a ring, set a strong spiral and a weak inward radial force, very long lives.
* Swap the emitter for the audio ring from the previous lesson and let \`amp\` drive births (see challenge 2).`,
    },
    {
      kind: 'challenge',
      title: 'A ceiling that kills',
      md: 'Make any ember that rises above **y = 2.5** die immediately instead of burning out at the top of the frame.',
      hints: [
        'Particles are never deleted inside the loop — they are *marked* for death.',
        'You need a `PartDeath` attribute of 1 or more, computed per particle, before `loop_end`.',
      ],
      solution:
        'Turn on **Use Death Attribute** on `particle1`\'s Attributes page. Then insert a **Math Mix POP** between `noise1` and `loop_end` with one block: **A > B**, *Scope A* `P.y`, *Scope B* `2.5`, *Result Scope* `PartDeath`. The comparison gives 1 above the ceiling and 0 below, and particles with `PartDeath` ≥ 1 are removed on the next frame — freeing your birth budget for new ones. Middle-click `loop_end` to check that `PartDeath` arrives; the Particle POP documents it as a `uint`, so if nothing dies, create it as a uint with an [[Attribute POP]] before the Math Mix.',
    },
    {
      kind: 'challenge',
      title: 'Births where it\'s hot',
      md: 'Instead of a constant birth rate, emit particles only from parts of the emitter where an animated noise is high, so the source flickers like real coals.',
      hints: [
        '*Emission from* has a second mode: **Birth Attribute**.',
        'The attribute is read as an integer number of particles per point *per frame*, so keep values small — 0, 1 or 2 — and reduce the emitter to a few hundred points.',
      ],
      solution:
        'Lower `pointgenerator1` to about 300 points. Add a **Noise POP** after `random1` with *Combine Operation* **None** and the *Noise* toggle on (Output page), which writes a scalar `Noise` attribute; animate its *Translate 4D*. Then a **Math Mix POP** with two blocks: **max(A, B)** — `Noise`, `0` → `births`, then **A * B** — `births`, `3` → `births`. The emission value is converted to a whole number, so most points emit nothing and the hottest emit one to three particles per frame. On `particle1` set *Emission from* to **Birth Attribute** and *Input Birth Attribute* to `births`, and add a small *Jitter Birth Position* so particles born at the same point don\'t stack.',
    },
    {
      kind: 'challenge',
      title: 'Embers that hear',
      md: 'Combine this lesson with the previous one: the louder the music, the more embers are born and the harder they swirl.',
      hints: ['Both *Birth Rate* and *Spiral Strength* accept expressions.', 'You built a `loud` Null CHOP in the audio lesson.'],
      solution:
        "Copy the loudness chain (Audio File In → Analyze → Lag → `loud`) into this project. Set `particle1`'s **Birth Rate** to `1000 + op('/project1/loud')[0] * 20000` and `forceradial1`'s **Spiral Strength** to `0.3 + op('/project1/loud')[0] * 3` (absolute paths because both nodes live inside `geo1`). Keep *Maximum Particles* above the peak population — birth rate × life at full volume.",
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does the Particle POP\'s *Target Feedback Loop POP* point at?',
          options: [
            'The emitter POP',
            'A POP downstream — usually a Null at the end of the force chain — whose result it reads back next frame',
            'The Geometry COMP',
            'The Render TOP',
          ],
          answer: 1,
          explain: 'The loop closes by reference: the Particle POP reads that Null\'s previous-frame result, with all your forces in it, as the state to integrate.',
        },
        {
          q: 'Birth Rate 2000/s, Life Expect 3 s. Roughly how many particles are alive at steady state?',
          options: ['2000', '3000', '6000', '666'],
          answer: 2,
          explain: 'Population ≈ birth rate × average lifespan. Set Maximum Particles above that, with headroom for variance.',
        },
        {
          q: 'Why add curl noise to `PartForce` rather than adding noise to `P`?',
          options: [
            'It cooks faster',
            'Forces change velocity, so particles keep momentum, and curl fields swirl without clumping',
            'P can\'t be modified inside the loop',
            'The Line MAT ignores P',
          ],
          answer: 1,
          explain: 'Integration gives inertia; the curl field is divergence-free, so particles swirl rather than collecting in sinks.',
        },
        {
          q: 'How do you remove specific particles from inside the loop?',
          options: [
            'Add a Delete POP before the target Null',
            'Set their `PartDeath` attribute to 1 or more and turn on *Use Death Attribute*',
            'Set their `PartAge` to 0',
            'Lower Maximum Particles',
          ],
          answer: 1,
          explain: 'Only the Particle POP creates and removes particles; the point count in the loop must stay the same. `PartDeath` asks it to remove them next frame.',
        },
        {
          q: 'You want the system to look fully developed on its first visible frame. What do you use?',
          options: ['Speed', 'Pre-Roll, then Initialize, then Start', 'Go to Done', 'A higher Birth Rate'],
          answer: 1,
          explain: 'Pre-Roll simulates that many seconds during Initialize, so the system is already populated when you press Start.',
        },
      ],
    },
  ],
};

export default lesson;
