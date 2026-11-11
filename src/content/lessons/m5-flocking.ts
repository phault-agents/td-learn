import type { Lesson } from '../types';

const BOIDS_SHADER = `// boids_glsl: one thread per boid. Input 0 carries P, vel, Color and the
// neighbor arrays Nebr / NumNebrs written by neighbor1 this frame.
// Uniforms (boids1 > Vectors / Colors):
//   uDt (float)       seconds per step, from absTime.stepSeconds (clamped)
//   uWeights (vec4)   x = separation, y = alignment, z = cohesion, w = bounds
//   uSpeed (vec2)     min, max speed
//   uSepDist (float)  personal-space radius
//   uBounds (vec3)    half-size of the box the flock lives in
//   uColA, uColB      lonely / crowded colors

const uint NO_NEIGHBOR = 0xFFFFFFFFu;     // 4294967295: an empty Nebr slot

void main() {
    const uint id = TDIndex();
    if (id >= TDNumElements())
        return;

    vec3 p = TDIn_P();
    vec3 v = TDIn_vel();

    vec3 sep = vec3(0.0), ali = vec3(0.0), coh = vec3(0.0);
    float n = 0.0;

    for (uint k = 0u; k < cTDArraySize_Nebr; k++) {
        uint j = TDIn_Nebr(0, id, k);          // k-th neighbor index of this boid
        if (j == NO_NEIGHBOR || j == id)
            continue;
        vec3 pj = TDIn_P(0, j);
        vec3 d = p - pj;
        float dist = length(d);
        if (dist > 1e-5 && dist < uSepDist)
            sep += (d / dist) * (1.0 - dist / uSepDist);   // stronger when closer
        ali += TDIn_vel(0, j);
        coh += pj;
        n += 1.0;
    }

    vec3 steer = vec3(0.0);
    if (n > 0.0) {
        steer += uWeights.x * sep;
        steer += uWeights.y * (ali / n - v);   // match the neighbors' velocity
        steer += uWeights.z * (coh / n - p);   // drift toward their center
    }

    // Soft walls: the further outside the box, the harder the push back.
    steer -= uWeights.w * max(abs(p) - uBounds, 0.0) * sign(p);

    v += steer * uDt;

    // Speed limits: never stall, never teleport.
    float s = length(v);
    if (s > 1e-5)
        v *= clamp(s, uSpeed.x, uSpeed.y) / s;

    P[id]   = p + v * uDt;
    vel[id] = v;

    float crowd = float(TDIn_NumNebrs()) / float(cTDArraySize_Nebr);
    Color[id] = vec4(mix(uColA.rgb, uColB.rgb, crowd), 1.0);
}
`;

const lesson: Lesson = {
  slug: 'flocking',
  title: 'Flocking with Neighbors',
  subtitle: 'Three local rules, one GPU loop: a few thousand boids that swirl, split and regroup on their own.',
  minutes: 50,
  summary:
    'Classic boids on the GPU: a Feedback POP loop where the Neighbor POP finds each boid\'s neighbors and a GLSL POP reads them by index to apply separation, alignment and cohesion. The flock is rendered by instancing a cone oriented along each velocity.',
  objectives: [
    'Express separation, alignment, cohesion, bounds and speed limits as one steering update',
    'Use the [[Neighbor POP]]: `Nebr` index arrays, `NumNebrs`, and the empty-slot value',
    'Read array attributes and other points by index in a [[GLSL POP]]',
    'Orient instanced geometry along a velocity attribute with *Rotate to Vector*',
    'Tune neighbor search for performance: max neighbors, search distance, distribution, hash buckets',
  ],
  requires: ['glsl-pop', 'instancing', 'strange-attractors'],
  tags: ['glsl', 'simulation', 'neighbors', 'instancing', 'boids', 'advanced'],
  blocks: [
    {
      kind: 'md',
      md: `
A starling murmuration has no choreographer. Each bird watches only a handful of neighbours, yet the flock folds, splits and pours across the sky like one animal. In 1987 Craig Reynolds showed that three local rules are enough to reproduce this on a computer. He called his simulated birds **boids**.

You'll build the same thing for a few thousand boids, entirely on the GPU. The structure is the one you built for the attractor (a [[GLSL POP]] inside a [[Feedback POP]] loop), plus one new ingredient: each boid needs to know who is near it. That's the [[Neighbor POP]]'s job, and reading its answer is the main new GLSL skill in this lesson.

## Three rules and a velocity

Every boid carries two pieces of state: a position \`P\` and a velocity \`vel\` (a custom attribute, so it starts with a lowercase letter). Each frame, it looks at its neighbours and adds up three urges:

* **Separation:** move away from neighbours that are too close. This prevents collisions and clumping.
* **Alignment:** steer toward the neighbours' average velocity, which makes them fly the same way.
* **Cohesion:** steer toward the neighbours' average position so they stay together.

Two world rules keep it watchable. **Bounds** push boids back when they leave a box. **Speed limits** keep every boid between a minimum and maximum speed. The urges are added as a steering acceleration, the acceleration changes the velocity, the velocity moves the position. That's the same integration idea as last lesson, with a frame-time \`dt\` this time, because flocking is forgiving.

The weights between the rules *are* the art direction. Strong separation gives a loose, nervous swarm. Strong alignment gives sleek schools sweeping in one direction. Strong cohesion pulls everything into tight balls.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Why neighbours are the hard part',
      md: `The obvious method (every boid checks every other boid) costs N² distance tests per frame: 9 million for 3 000 boids, 900 million for 30 000. The [[Neighbor POP]] avoids that with **spatial hashing**: it sorts points into buckets by position and searches only the buckets around each point.

Its output is per point:

* \`Nebr\`, a **uint array** of neighbour *indices*. The array size is the *Max Neighbors* parameter.
* \`NumNebrs\`, how many neighbours were actually found within *Max Neighbors Distance*.
* Slots that couldn't be filled hold **4294967295**, the largest 32-bit unsigned value. Expressions in other POPs can compare against the built-in \`_NoNeighbor\`. In GLSL, write it as \`0xFFFFFFFFu\`.

The boids shader loops over that array, skips empty slots, and uses each index to read the neighbour's \`P\` and \`vel\`.`,
    },
    {
      kind: 'md',
      md: `
## Reading arrays and other points in GLSL

Two GLSL POP features from lesson 5.1 come together here:

\`\`\`glsl
uint j  = TDIn_Nebr(0, id, k);   // input 0, this boid, array element k
vec3 pj = TDIn_P(0, j);          // input 0, a *different* point: neighbour j
\`\`\`

\`TDIn_Nebr(input, element, arrayIndex)\` is the general form of every attribute reader. The constant \`cTDArraySize_Nebr\` holds the array length, so the loop adapts automatically when you change *Max Neighbors*. Readers are bounds-checked: an out-of-range array index returns the last element, which is safe but quietly wrong. Loop to \`cTDArraySize_Nebr\` and you'll never hit it.

Notice what the shader *doesn't* do: it never reads the outputs. Every boid reads last frame's state from input 0 and writes its new state to the output arrays. All boids therefore react to the same snapshot of the world, so the result doesn't depend on which thread runs first.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'boids',
        title: 'GPU boids',
        root: '/project1',
        height: 560,
        caption:
          'The simulation lives at `/project1` (it never renders directly). `geo1` renders a small cone **once per boid** by instancing `flock`. The loop is `feedback1 → neighbor1 → boids1`, with `boids1` as the feedback target.',
        nodes: [
          {
            id: 'seed1',
            type: 'pointgeneratorPOP',
            x: 0,
            y: 0,
            params: {
              Shape: 'Box',
              'Number of Points': 3000,
              Distribution: 'Volume',
              Random: true,
              Size: [6, 3, 6],
            },
            note: 'Three thousand boids scattered through the flight box.',
          },
          {
            id: 'random1',
            type: 'randomPOP',
            x: 1,
            y: 0,
            inputs: ['seed1'],
            params: {
              Type: 'Direction',
              'Random Size': '3',
              'Cone Angle': 180,
              'Output Attribute Scope': 'vel',
              'Override Automatic Attribute': true,
              'Attribute Type': 'float',
              Components: '3',
            },
            note: 'Gives every boid a random unit-length starting velocity in a new float3 attribute `vel`. With *Cone Angle* at 180 the directions spread all around. If they all start out roughly parallel, check this value.',
          },
          {
            id: 'attribute1',
            type: 'attributePOP',
            x: 2,
            y: 0,
            inputs: ['random1'],
            params: { 'Name[0]': 'Color', 'Value[0]': [1, 1, 1, 1] },
            note: 'Creates `Color` for the shader to write. It\'s later read by the instancing as per-boid color.',
          },
          {
            id: 'feedback1',
            type: 'feedbackPOP',
            x: 3,
            y: 0,
            inputs: ['attribute1'],
            params: { 'Target POP': { ref: 'boids1' } },
            note: 'Closes the loop: from the second frame on, it outputs `boids1`\'s result from the previous frame.',
          },
          {
            id: 'neighbor1',
            type: 'neighborPOP',
            x: 4,
            y: 0,
            inputs: ['feedback1'],
            params: {
              'Neighbors Type': 'By Distance',
              'Max Neighbors Distance': 0.6,
              Distribution: 'Default',
              'Num Hash Buckets': 4096,
              Output: 'Neighbors',
              'Max Neighbors': 12,
              Neighbors: true,
              'Num Neighbors': true,
            },
            note: 'Inside the loop, so neighbours are recomputed from the current positions every frame. Each boid gets up to 12 neighbour indices within 0.6 units in `Nebr`, plus `NumNebrs`. *Num Hash Buckets* close to the point count is the documented rule of thumb.',
          },
          {
            id: 'boids_glsl',
            type: 'textDAT',
            x: 5,
            y: 1,
            code: { lang: 'glsl', text: BOIDS_SHADER },
            note: 'The three rules, the walls and the speed limits in one shader.',
          },
          {
            id: 'boids1',
            type: 'glslPOP',
            x: 5,
            y: 0,
            inputs: ['neighbor1'],
            params: {
              'Compute Shader': { ref: 'boids_glsl' },
              'Output Attributes': 'P vel Color',
              'Initialize Output Attributes': false,
              'Vectors:Name[0]': 'uDt',
              'Vectors:Type[0]': 'float',
              'Vectors:Value[0]': [{ expr: 'min(absTime.stepSeconds, 1/30)' }],
              'Vectors:Name[1]': 'uWeights',
              'Vectors:Type[1]': 'vec4',
              'Vectors:Value[1]': [2.5, 1, 0.8, 2],
              'Vectors:Name[2]': 'uSpeed',
              'Vectors:Type[2]': 'vec2',
              'Vectors:Value[2]': [0.8, 2],
              'Vectors:Name[3]': 'uSepDist',
              'Vectors:Type[3]': 'float',
              'Vectors:Value[3]': [0.25],
              'Vectors:Name[4]': 'uBounds',
              'Vectors:Type[4]': 'vec3',
              'Vectors:Value[4]': [3, 1.5, 3],
              'Colors:Name[0]': 'uColA',
              'RGB[0]': [0.12, 0.35, 0.65],
              'Colors:Name[1]': 'uColB',
              'RGB[1]': [1, 0.82, 0.55],
            },
            note: 'Reads each boid and its neighbours from input 0 and writes new `P`, `vel` and `Color`. `uDt` follows the real frame time but is capped at 1/30 s, so a hitch can\'t fling boids across the box.',
          },
          {
            id: 'flock',
            type: 'nullPOP',
            x: 6,
            y: 0,
            inputs: ['boids1'],
            note: 'A stable name for the instancing to point at. Nothing here is rendered directly.',
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 6,
            y: 1.4,
            params: {
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: '../flock' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
              'Rotate to Vector: Forward Direction': '+Z',
              'Rotate to Vector X': 'vel(0)',
              'Rotate to Vector Y': 'vel(1)',
              'Rotate to Vector Z': 'vel(2)',
              R: 'Color(0)',
              G: 'Color(1)',
              B: 'Color(2)',
              Material: { ref: '../pbr1' },
            },
            note: 'One cone per point of `flock`, placed at `P`, turned so its +Z axis follows `vel`, tinted by `Color`.',
            children: [
              {
                id: 'tube1',
                type: 'tubePOP',
                x: 0,
                y: 0,
                params: {
                  Orientation: 'Z Axis',
                  Radius: [0.045, 0],
                  Height: 0.18,
                  Columns: 8,
                  Rows: 2,
                  Connectivity: 'Triangles',
                  Normal: 'Point',
                  'End Caps': true,
                },
                note: 'A tube with one radius at zero is a cone. It\'s built along Z because that\'s the *Forward Direction* the instancing expects. If your boids fly tail-first, swap the two radii.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 1,
                y: 0,
                inputs: ['tube1'],
                flags: { display: true, render: true },
                note: 'The single instance shape, with the render flag on.',
              },
            ],
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 7,
            y: 1.4,
            params: { 'Xform:Translate': [0, 3, 9], 'Look At': { ref: '../geo1' } },
            note: 'Up and back far enough to see the whole 6 × 3 × 6 box, aimed at its centre.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 7,
            y: 2.5,
            params: { 'Xform:Translate': [5, 8, 6] },
            note: 'A high key light so the cones read as little 3D shapes.',
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 6,
            y: 2.5,
            params: { 'Base Color': [1, 1, 1], Roughness: 0.5, Metallic: 0 },
            note: 'White base color, so the instance colors from `Color` come through unchanged.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 8,
            y: 1.4,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              Lights: { ref: 'light1' },
              'Anti-Alias': '4x',
              'Background Color': [0.04, 0.045, 0.06, 1],
            },
            note: 'Renders the instanced flock.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 9,
            y: 1.4,
            inputs: ['render1'],
            note: 'The final image.',
          },
        ],
        boxes: [{ title: 'Simulation loop', nodes: ['feedback1', 'neighbor1', 'boids1', 'boids_glsl'], tone: 'orange' }],
        steps: [
          {
            title: 'Boids with a position and a velocity',
            body: `At \`/project1\` create a **Point Generator POP** \`seed1\`: *Shape* **Box**, *Number of Points* **3000**, *Distribution* **Volume**, *Random* on, *Size* **6 3 6**.

Append a **Random POP** \`random1\`: *Type* **Direction**, *Random Size* **3**, *Cone Angle* **180**, *Output Attribute Scope* \`vel\`, and with *Override Automatic Attribute* on, *Attribute Type* **float** and *Components* **3**. Then an **Attribute POP** \`attribute1\` creating **Color** (1 1 1 1).

Middle-click \`attribute1\`: you should see \`P\`, \`vel\` and \`Color\`.`,
            nodes: ['seed1', 'random1', 'attribute1'],
          },
          {
            title: 'Find the neighbours',
            body: `Add a **Feedback POP** \`feedback1\` after \`attribute1\` (leave *Target POP* empty for a moment), then a **Neighbor POP** \`neighbor1\`: *Neighbors Type* **By Distance**, *Max Neighbors Distance* **0.6**, *Distribution* **Default**, *Num Hash Buckets* **4096**, *Output* **Neighbors**, *Max Neighbors* **12**, and both *Neighbors* and *Num Neighbors* on.

Middle-click it. \`Nebr\` is listed as a uint array of size 12 and \`NumNebrs\` as a uint. A [[POP to DAT]] on it would show the indices and the 4294967295 padding. Delete it afterwards, since it downloads from the GPU.`,
            nodes: ['feedback1', 'neighbor1'],
          },
          {
            title: 'The boid shader',
            body: `Create a **Text DAT** \`boids_glsl\` with the shader, and a **GLSL POP** \`boids1\` after \`neighbor1\`. Set *Compute Shader* \`boids_glsl\`, *Output Attributes* \`P vel Color\`, *Initialize Output Attributes* off.

**Vectors**:

| Name | Type | Value |
|---|---|---|
| \`uDt\` | float | expression \`min(absTime.stepSeconds, 1/30)\` |
| \`uWeights\` | vec4 | 2.5, 1, 0.8, 2 |
| \`uSpeed\` | vec2 | 0.8, 2 |
| \`uSepDist\` | float | 0.25 |
| \`uBounds\` | vec3 | 3, 1.5, 3 |

**Colors**: \`uColA\` **0.12 0.35 0.65** and \`uColB\` **1 0.82 0.55**.`,
            nodes: ['boids_glsl', 'boids1'],
          },
          {
            title: 'Close the loop',
            body: `Set \`feedback1\`'s *Target POP* to \`boids1\` and append a **Null POP** named \`flock\`. Pulse *Start* on \`feedback1\` if the points aren't moving.

Watch \`flock\`'s viewer. Within a few seconds the random cloud organises into streams and clusters that turn back at the walls.`,
            nodes: ['flock'],
            focus: ['feedback1'],
          },
          {
            title: 'A shape for each boid',
            body: `Create a **Geometry COMP** \`geo1\`. Inside, make a **Tube POP** \`tube1\` that is really a cone: *Orientation* **Z Axis**, *Radius* **0.045 0**, *Height* **0.18**, *Columns* **8**, *Rows* **2**, *Connectivity* **Triangles**, *Normal* **Point**, *End Caps* on. Cap it with a **Null POP** \`null1\` (render + display).`,
            nodes: ['geo1', 'tube1', 'null1'],
          },
          {
            title: 'Instance it along the velocity',
            body: `On \`geo1\` → **Instance**: *Instancing* on, *Instance Count Mode* **Instance OP(s) Length**, *Default Instance OP* \`../flock\`, *Translate X/Y/Z* \`P(0)\` \`P(1)\` \`P(2)\`. Use the menus next to each field: they list the POP's attributes.

On **Instance 2**: *Rotate to Vector: Forward Direction* **+Z**, *Rotate to Vector X/Y/Z* \`vel(0)\` \`vel(1)\` \`vel(2)\`, and *R/G/B* \`Color(0)\` \`Color(1)\` \`Color(2)\`.`,
            focus: ['geo1'],
          },
          {
            title: 'Light and render',
            body: `At \`/project1\` add **Camera COMP** \`cam1\` (*Translate* **0 3 9**, *Look At* \`../geo1\`), **Light COMP** \`light1\` (*Translate* **5 8 6**), **PBR MAT** \`pbr1\` (white, *Roughness* **0.5**, *Metallic* **0**) assigned as \`geo1\`'s material, a **Render TOP** \`render1\` and a **Null TOP** \`out1\`.`,
            nodes: ['cam1', 'light1', 'pbr1', 'render1', 'out1'],
          },
          {
            title: 'Direct the flock',
            body: `Now play with \`boids1\`'s **uWeights** while it runs:

* separation **4**, cohesion **0.3**: a loose, jittery swarm;
* alignment **2.5**: long, sweeping schools;
* cohesion **2**, separation **1.5**: tight, rolling balls.

On \`neighbor1\` drop *Max Neighbors* to **4** and the flock fragments into many small groups. Raise it to **24** and it behaves more like one body.`,
            focus: ['boids1', 'neighbor1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Walking through the shader

**Skipping slots.** The loop visits all \`cTDArraySize_Nebr\` slots and skips two kinds: empty ones (\`NO_NEIGHBOR\`) and the boid itself. The docs don't promise that a point is excluded from its own neighbour list, so the shader checks. A boid that counted itself as a neighbour would pull toward its own position and separate from itself, which is harmless but distorts the averages.

**Separation with a falloff.** \`(d / dist) * (1 - dist / uSepDist)\` points away from the neighbour with a strength that is 1 when touching and 0 at the edge of personal space. The textbook version divides by distance squared, which explodes when two boids nearly coincide. This falloff stays bounded, so a single frame can never produce a huge kick.

**Alignment and cohesion as differences.** \`ali / n - v\` is the change that would make this boid match its neighbours. \`coh / n - p\` points at their centre. Both are zero when the boid already agrees with its group, so a settled flock stays settled.

**Soft walls.** \`max(abs(p) - uBounds, 0.0) * sign(p)\` is zero inside the box and grows with the distance outside it, per axis. Boids overshoot slightly and curve back, which looks far more natural than a hard bounce.

**Speed limits.** Clamping the speed (not the velocity's components) keeps the direction and only rescales the length. The *minimum* matters as much as the maximum. A boid that stalls looks dead, and a zero-length \`vel\` gives *Rotate to Vector* nothing to aim along.

**Color by crowding.** \`NumNebrs / cTDArraySize_Nebr\` is how full each boid's neighbourhood is, so the color shows density directly: lonely scouts stay blue, the core of a cluster glows warm. It's a cheap way to make the hidden data structure visible.

## Orienting the instances

*Rotate to Vector* builds a rotation that turns the model's *Forward Direction* (+Z here) toward the vector you give it, per instance. Because the cone is modelled along +Z, its tip follows \`vel\`. Without an up vector each cone may roll a little as it turns. For symmetrical cones nobody notices. For asymmetrical shapes like birds with wings, set the *Rotate Up* fields on the same page, for example to a world-up vector or a "bank" attribute you compute in the shader.

Instancing reads only the point list, so the instanced flock costs one draw of 3 000 small cones. Use a [[Copy POP]] instead only if you need to deform each copy afterwards, or the [[GLSL Copy POP]] for per-boid shapes like flapping wings.
`,
    },
    {
      kind: 'md',
      md: `
## Performance: tuning the neighbour search

The shader does *k* neighbour reads per boid, so its cost scales with **boids × Max Neighbors**. The search itself depends on how many candidates sit in the buckets around each point. The knobs, in order of impact:

| Parameter | Effect | Guidance |
|---|---|---|
| **Max Neighbors** | Array size, and the shader's loop length | 8–16 is plenty for flocking; real birds track about seven |
| **Max Neighbors Distance** | Search radius. A bigger radius means more candidates per bucket | Keep it a small multiple of the separation distance |
| **Distribution** | *Default* is fastest (stops when full, in cell order). *Unique* removes rare duplicates. *Closest* sorts by distance (slowest). *Random* samples evenly | Start with Default. Try Closest if separation looks weak in dense clumps |
| **Num Hash Buckets** | How finely space is divided for the search | Roughly the number of points |
| **Output Hash Attrib** | Writes each point's bucket as an attribute | Debugging only: color by it to see the hash |

Because *Default* stops once the array is full, a boid in a dense crowd may get neighbours that are merely *nearby*, not the *nearest*. For alignment and cohesion that's fine, since any nearby sample gives a good average. For separation it can miss the one boid that's actually touching. That's the case for *Closest*.

The Neighbor POP can also copy neighbour attributes straight into arrays (*Neighbor Point Attributes*, e.g. a \`NebrP\` array with *Add Prefix*), so the shader doesn't have to read by index. That trades memory for simpler code. Indices are leaner when you need several attributes per neighbour.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Scaling up',
      md: 'Three thousand boids are trivial. To go to tens of thousands, scale *Num Hash Buckets* with the count, keep *Max Neighbors* modest, and shrink *Max Neighbors Distance* as the flock gets denser. Check cook times on `neighbor1` and `boids1` separately (the neighbour search usually dominates) and keep any [[POP to DAT]] or info popups closed while you profile.',
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'If the flock explodes or freezes',
      md: '**Explodes:** a weight is far too high or `uDt` isn\'t clamped. Check `uDt` with a stalled frame in mind, and lower the weights. **Freezes into a ball:** cohesion dominates. Raise separation or *Max Neighbors Distance*. **Nothing moves:** the Feedback POP isn\'t running (pulse *Start*), or *Target POP* doesn\'t point at `boids1`.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Give the walls a shape: replace the box with a sphere (`length(p) - radius`) or let a slowly moving uniform pull the whole flock\'s attention. Render the boids as short motion streaks by running `flock` through a [[Trail POP]] with a very short length and drawing it with the [[Line MAT]]. Or hide the boids entirely and use them to steer something else, like lights, a camera, or the attractor seeds from the last lesson.',
    },
    {
      kind: 'challenge',
      title: 'Add a predator',
      md: 'Add a `vec3` uniform `uPredator` that wanders through the box (Noise CHOP or `math.sin` expressions). Boids within 1.5 units should flee from it, harder the closer they are, overriding the other rules.',
      hints: [
        'This is separation again, with one extra "neighbour" whose position comes from a uniform.',
        'Use a large weight so fleeing wins over cohesion.',
        'Render the predator too: a Sphere POP in a second Geometry COMP whose *Translate* uses the same expressions.',
      ],
      solution: `Before \`v += steer * uDt;\` add:

\`\`\`glsl
vec3 away = p - uPredator;
float dp = length(away);
if (dp < 1.5 && dp > 1e-5)
    steer += 8.0 * (away / dp) * (1.0 - dp / 1.5);
\`\`\`

Add the \`uPredator\` block (vec3) with, for example, X = \`2.5 * math.sin(absTime.seconds * 0.3)\`, Y = \`math.sin(absTime.seconds * 0.7)\`, Z = \`2.5 * math.cos(absTime.seconds * 0.23)\`. The flock now parts around the predator like a shoal around a shark.`,
    },
    {
      kind: 'challenge',
      title: 'Stretch by speed',
      md: 'Make fast boids look fast: color them by speed instead of crowding, and stretch each cone along its direction of travel as it accelerates.',
      hints: [
        'Speed is `length(v)` after the clamp. Map it between `uSpeed.x` and `uSpeed.y` to 0–1.',
        'Instancing can scale per instance from an attribute (*Scale X/Y/Z* on the Instance page). Write a `PointScale`-style value, or a custom attribute, from the shader.',
      ],
      solution: `In the shader replace the crowd line with \`float crowd = (length(v) - uSpeed.x) / max(uSpeed.y - uSpeed.x, 1e-5);\`. To stretch, create a float attribute \`stretch\` on \`attribute1\` (second block: *Name* **Custom**, custom name \`stretch\`, type float, 1 component), add it to *Output Attributes*, and write \`stretch[id] = 0.7 + 0.8 * crowd;\`. On \`geo1\` pick \`stretch\` for *Scale Z* from the menu (leave X and Y empty). With the instance *Transform Order* on **Scale Rotate Translate**, scaling happens in the cone's own space before it's turned, so each cone lengthens along its flight direction.`,
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'What does the Neighbor POP store in `Nebr`?',
          options: [
            'The positions of the nearest points',
            'An array of indices of nearby points, padded with 4294967295 where no neighbour was found',
            'The distance to the nearest point',
            'A single index: the nearest point',
          ],
          answer: 1,
          explain: 'Nebr is a uint array of size *Max Neighbors*. Unused slots hold the maximum 32-bit value (`_NoNeighbor` in expressions, `0xFFFFFFFFu` in GLSL).',
        },
        {
          q: 'How do you read element `k` of the array attribute `Nebr` for the current point in a GLSL POP?',
          options: ['`Nebr[k]`', '`TDIn_Nebr(0, id, k)`', '`TDIn_Nebr(k)`', '`texture(Nebr, k)`'],
          answer: 1,
          explain: 'Readers take (input, element, arrayIndex). `Nebr[...]` would be the *output* array, and only if Nebr were listed as an output.',
        },
        {
          q: 'Why is the Neighbor POP inside the feedback loop rather than before it?',
          options: [
            'Neighbor POPs can\'t be placed before a Feedback POP',
            'Neighbours must be recomputed from the current positions every frame',
            'It makes the GLSL POP compile',
            'To create the `vel` attribute',
          ],
          answer: 1,
          explain: 'Boids move every frame, so who is near whom changes every frame. Before the loop it would only see the starting positions.',
        },
        {
          q: 'Why does the shader enforce a *minimum* speed?',
          options: [
            'GLSL can\'t represent zero vectors',
            'Stalled boids look lifeless, and a zero velocity gives Rotate to Vector no direction',
            'The Neighbor POP ignores slow points',
            'It saves GPU time',
          ],
          answer: 1,
          explain: 'Both aesthetic and practical: orientation comes from `vel`, so it should never collapse to zero.',
        },
        {
          q: 'Your flock of 40 000 boids is slow. Which change is most likely to help first?',
          options: [
            'Switch Distribution to Closest',
            'Reduce Max Neighbors and Max Neighbors Distance, and keep Num Hash Buckets near the point count',
            'Turn Initialize Output Attributes on',
            'Increase the cone\'s Columns',
          ],
          answer: 1,
          explain: 'Neighbour count drives both the search and the shader loop. Closest is the *slowest* distribution.',
        },
      ],
    },
  ],
};

export default lesson;
