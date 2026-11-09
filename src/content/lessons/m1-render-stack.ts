import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'render-stack',
  title: 'The Render Stack',
  subtitle: 'Materials, cameras, multiple objects, a feedback loop and a glow pass — from raw render to a finished, full-screen image.',
  minutes: 50,
  summary:
    'Everything between your POPs and the projector: Constant, Phong and PBR materials, environment light, drawing points with the [[Line MAT]], perspective and orthographic cameras, anti-aliasing, several Geometry COMPs in one [[Render TOP]], a feedback-trail loop, bloom, pixel formats, and output through a [[Window COMP]].',
  objectives: [
    'Choose between Constant, Phong and PBR materials, and add an environment light',
    'Render point primitives with the [[Line MAT]] and control their size with distance',
    'Switch a [[Camera COMP]] between perspective and orthographic projection',
    'Render several Geometry COMPs through one [[Render TOP]] with anti-aliasing',
    'Build a [[Feedback TOP]] trail loop and finish with [[Bloom TOP]] and [[Level TOP]]',
    'Pick a pixel format for glow and feedback, and send the result to a [[Window COMP]]',
  ],
  requires: ['first-pop-network'],
  tags: ['render', 'materials', 'camera', 'feedback', 'bloom', 'output'],
  blocks: [
    {
      kind: 'md',
      md: `
Lesson 1.1 got pixels on screen. This lesson is about making them *good* — and about the decisions behind the look, so you can make them deliberately instead of by accident.

You'll take the noise blob from 1.1, give it better materials and light, surround it with an orbiting halo of glowing points drawn by the Line MAT, and then push the image through a small post-processing chain: motion trails from a feedback loop, a bloom glow and a final grade. It ends where real work ends: in a borderless window, ready for a second screen or a projector.

## The stack, layer by layer

| Layer | Operators | Decides… |
|---|---|---|
| **Geometry** | POPs inside a [[Geometry COMP]] | shape, and where the object sits (its *Xform* page) |
| **Material** | MATs | how surfaces respond to light, or ignore it |
| **Light** | [[Light COMP]], [[Environment Light COMP]] | where light comes from, its color and strength |
| **Camera** | [[Camera COMP]] | viewpoint, lens, projection |
| **Render** | [[Render TOP]] | which cameras, objects and lights meet; resolution, anti-aliasing, pixel format |
| **Post** | TOPs | everything that happens to the image afterwards |
| **Output** | [[Null TOP]], [[Window COMP]], [[Out TOP]] | where the finished image goes |

Each layer is independent. You can swap a material without touching geometry, re-light without re-rendering your post chain, or render the same scene through two cameras. Keeping them separate is what makes a network easy to change at 2 a.m. before an opening.
`,
    },
    {
      kind: 'md',
      md: `
## Materials: three temperaments

| | [[Constant MAT]] | [[Phong MAT]] | [[PBR MAT]] |
|---|---|---|---|
| Lighting | none — flat color | diffuse + specular highlight | physically based: roughness, metallic, reflections |
| Needs a light? | no | yes | yes, and loves an environment light |
| Point \`Color\` | *Apply Point Color* multiplies it in | *Apply Point Color* (Advanced page) | *Apply Point Color* (Advanced page) |
| Reach for it for… | data viz, graphic looks, glowing elements, debugging | fast, predictable shading | anything meant to look like a material |

The Constant MAT is underrated. Data visualization usually wants colors that mean something, and lighting changes them; a flat material keeps a color scale honest. It's also the quickest way to check whether a black render is a lighting problem.

Phong and PBR both shade with lights. Phong is the older model with direct controls (*Diffuse*, *Specular*, *Shininess*). PBR describes the surface instead — *Base Color*, *Roughness*, *Metallic* — and computes how light should behave on it, so the same material reads correctly under any lighting.

**Environment light.** A [[Light COMP]] comes from a position. An [[Environment Light COMP]] comes from everywhere at once: surfaces are lit according to which way they face, not where they are. On its own it acts as a soft fill that lifts the shadow side of PBR surfaces; give its *Environment Map* an image of a real place and metallic surfaces start reflecting it. A key light plus an environment fill is a dependable default.

## Points and lines need their own material

A point with a point primitive renders, but with a surface material it's a single pixel, and a line strip is a hairline. The [[Line MAT]] is built for both:

* **Lines** become smooth, camera-facing strokes with joints and end caps.
* **Points** (*Draw Points* on) become circles, spheres, squares or cones.
* **Width is resolution-independent:** a width of 1 is a thousandth of the image width, so your look survives a change from 1280 to 4K.
* **Distance shapes the look.** With the *S Curve* depth model you set a width and color at *Distance Near* and another at *Distance Far*; points in between are blended. Near points read big and bright, far ones small and dim — depth cueing for free.
* It's **unlit**, which is exactly right for glowing particles.

Other routes exist — the [[Point Sprite MAT]] for textured sprites, and instancing (Module 2) when every point should carry real geometry.

## Cameras: perspective and orthographic

A [[Camera COMP]]'s *View* page sets its *Projection*:

* **Perspective** — things shrink with distance. *FOV Angle* is the lens: wide angles exaggerate depth, narrow ones flatten it like a telephoto. Use it for anything meant to feel like a space.
* **Orthographic** — no perspective at all. Parallel lines stay parallel, and an object's size on screen doesn't change with distance. *Ortho Width* sets how many units fit across the frame. It's the natural choice for charts, maps, 2D layouts and anything that must line up with pixels.

*Look At* (Xform page) aims a camera at another object and keeps it aimed while either one moves — much easier than hand-tuning rotations.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'polished-blob',
        title: 'Blob, halo, trails, glow',
        root: '/project1',
        height: 620,
        caption:
          'Scene on the left, post chain on the right. The boxed row is the **feedback loop**: the dashed line from `comp1` back to `feedback1` is the *Target TOP* reference that carries each finished frame into the next one.',
        nodes: [
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 0,
            y: 0,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 12' }, 0],
              Material: { ref: '../pbr1' },
            },
            note: 'The blob from lesson 1.1, unchanged except for its material.',
            children: [
              {
                id: 'sphere1',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: { Type: 'Geodesic', 'Geodesic Connectivity': 'Triangles', Frequency: 40 },
                note: 'The same evenly spaced geodesic sphere as in 1.1.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['sphere1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.4,
                  Harmonics: 2,
                  Amplitude: 0.3,
                  'Translate 4D': { expr: 'absTime.seconds * 0.15' },
                  'Compute Point Normals': true,
                },
                note: 'Morphing 4D noise with rebuilt normals, as before.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 2,
                y: 0,
                inputs: ['noise1'],
                flags: { display: true, render: true },
                note: 'Render and display flags.',
              },
            ],
          },
          {
            id: 'pbr1',
            type: 'pbrMAT',
            x: 1,
            y: 0,
            params: { 'Base Color': [0.9, 0.5, 0.28], Roughness: 0.28, Metallic: 0.6 },
            note: 'Lower roughness and more metal than in 1.1: tighter highlights and visible reflections of the environment light. Try Roughness 0.1 and 0.8 to feel the range.',
          },
          {
            id: 'geo2',
            type: 'geometryCOMP',
            x: 0,
            y: 1.3,
            params: { 'Xform:Rotate': [20, 0, -12], Material: { ref: '../line1' } },
            note: 'A second renderable object with its own material. Its *Rotate* tilts the halo so it reads as a ring in perspective rather than a flat line.',
            children: [
              {
                id: 'circle1',
                type: 'circlePOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Point Primitives',
                  Orientation: 'ZX Plane',
                  Radius: [1.75, 1.75],
                  Divisions: 600,
                  Rotate: [0, { expr: 'absTime.seconds * 25' }, 0],
                },
                note: '600 points, each with a point primitive, in a horizontal ring around the blob. The Circle POP\'s own *Rotate Y* spins the ring within its plane.',
              },
              {
                id: 'noise2',
                type: 'noisePOP',
                x: 1,
                y: 0,
                inputs: ['circle1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 0.6,
                  Amplitude: 0.12,
                  'Translate 4D': { expr: 'absTime.seconds * 0.3' },
                },
                note: 'A small three-dimensional offset scatters the ring into a fuzzy band. Because the ring spins through a noise field that stays put, each point wanders as it travels.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 2,
                y: 0,
                inputs: ['noise2'],
                flags: { display: true, render: true },
                note: 'Flags on the halo\'s last POP.',
              },
            ],
          },
          {
            id: 'line1',
            type: 'lineMAT',
            x: 1,
            y: 1.3,
            params: {
              'Depth Interpolation Model': 'S Curve',
              'Distance Near': 3.5,
              'Distance Far': 6.5,
              'Width Near': 4,
              'Width Far': 1.5,
              'Draw Lines': false,
              'Draw Points': true,
              'Point Type': 'Circle (Polygon)',
              'Point Near Color': [1.6, 1.1, 0.6],
              'Specify Point Far Color': true,
              'Point Far Color': [0.35, 0.25, 0.5],
            },
            note: 'Draws every point as a round dot. Near the camera dots are wide and hot orange (values above 1 survive in a float render and bloom strongly); toward the back they shrink and cool to violet.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 0,
            y: 2.6,
            params: { 'Xform:Translate': [0, 0.6, 5.2], 'Look At': { ref: '../geo1' }, 'FOV Angle': 38 },
            note: 'Slightly above the blob and aimed at it with *Look At*. A narrower field of view than usual flattens the perspective a little, like a longer lens.',
          },
          {
            id: 'light1',
            type: 'lightCOMP',
            x: 1,
            y: 2.6,
            params: { 'Xform:Translate': [3, 4, 5] },
            note: 'The key light: up, right and in front, as in lesson 1.1.',
          },
          {
            id: 'envlight1',
            type: 'environmentlightCOMP',
            x: 1,
            y: 3.8,
            params: { 'Light Color': [0.3, 0.36, 0.5] },
            note: 'A cool fill from all directions. It lifts the shadow side of the blob and gives the metal something to reflect. Load an image into *Environment Map* later for real reflections.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 2,
            y: 0.6,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1 geo2' },
              Lights: { ref: 'light1 envlight1' },
              'Anti-Alias': '8x',
              'Background Color': [0, 0, 0, 1],
              'Output Resolution': 'Custom Resolution',
              'Common:Resolution': [1920, 1080],
              'Pixel Format': '16-bit float (RGBA)',
            },
            note: 'Two Geometry COMPs, two lights, one camera. Rendered at the output resolution, with more anti-aliasing for the small dots, in **16-bit float** so trails fade smoothly and values above 1 survive into the bloom.',
          },
          {
            id: 'feedback1',
            type: 'feedbackTOP',
            x: 2,
            y: 1.9,
            inputs: ['render1'],
            params: { 'Target TOP': { ref: 'comp1' } },
            note: 'Outputs whatever `comp1` produced on the **previous** frame. Its input (`render1`) sets the resolution and format, and is what it passes through when the feedback is reset or bypassed.',
          },
          {
            id: 'level1',
            type: 'levelTOP',
            x: 3,
            y: 1.9,
            inputs: ['feedback1'],
            params: { Opacity: 0.9 },
            note: 'Fades last frame a little before it\'s reused. 0.9 means a trail loses about a tenth of its strength per frame; closer to 1 gives longer trails.',
          },
          {
            id: 'transform1',
            type: 'transformTOP',
            x: 4,
            y: 1.9,
            inputs: ['level1'],
            params: { Scale: [1.006, 1.006] },
            note: 'Scales the old frame up very slightly each time round, so trails drift outward from the center like a slow zoom.',
          },
          {
            id: 'comp1',
            type: 'compositeTOP',
            x: 5,
            y: 0.6,
            inputs: ['render1', 'transform1'],
            params: { Operation: 'Maximum' },
            note: 'Combines the fresh render with the faded, zoomed history. *Maximum* keeps the brighter of the two per pixel, so static parts stay at their true brightness and only moving parts leave trails.',
          },
          {
            id: 'bloom1',
            type: 'bloomTOP',
            x: 6,
            y: 0.6,
            inputs: ['comp1'],
            params: { 'Bloom Threshold': 0.6, 'Bloom Intensity': 0.8 },
            note: 'Glow around the brightest pixels — mostly the hot halo dots and the blob\'s highlights. Adjust *Bloom Intensity* and *Bloom Fill* first, then *Bloom Threshold*.',
          },
          {
            id: 'level2',
            type: 'levelTOP',
            x: 7,
            y: 0.6,
            inputs: ['bloom1'],
            params: { Contrast: 1.1 },
            note: 'The final grade. Keep it gentle; this is where the overall mood is set, after everything else is in place.',
          },
          {
            id: 'final',
            type: 'nullTOP',
            x: 8,
            y: 0.6,
            inputs: ['level2'],
            note: 'The image everything downstream refers to: the window, a recorder, a stream out. Rewire the post chain freely; `final` stays put.',
          },
          {
            id: 'window1',
            type: 'windowCOMP',
            x: 8,
            y: 1.9,
            params: {
              'Window Operator': { ref: '../final' },
              Title: 'Render Stack',
              'Opening Size': 'Custom',
              Width: 1920,
              Height: 1080,
              Borders: false,
            },
            note: 'Opens `final` in its own borderless 1920 × 1080 window. Pulse *Open as Separate Window* on its Open/Close page to try it; choose the monitor with the *Display* settings.',
          },
        ],
        boxes: [{ title: 'Trails loop', nodes: ['feedback1', 'level1', 'transform1'], tone: 'purple' }],
        steps: [
          {
            title: 'Bring back the blob',
            body: `Start from your lesson 1.1 network, or rebuild it: a **Geometry COMP** \`geo1\` containing a **Sphere POP** \`sphere1\` (*Type* **Geodesic**, *Geodesic Connectivity* **Triangles**, *Frequency* **40**) and a **Noise POP** \`noise1\` (*Type* **Simplex 4D (GPU)**, *Period* **1.4**, *Harmonics* **2**, *Amplitude* **0.3**, *Translate 4D* \`absTime.seconds * 0.15\`, *Compute Point Normals* on). Give \`geo1\` the *Rotate Y* expression \`absTime.seconds * 12\`.`,
            nodes: ['geo1', 'sphere1', 'noise1'],
          },
          {
            title: 'A shinier material',
            body: `Make sure the chain ends in a **Null POP** \`null1\` with the display and render flags. Then set up a **PBR MAT** \`pbr1\` — *Base Color* **0.9, 0.5, 0.28**, *Roughness* **0.28**, *Metallic* **0.6** — and assign it on \`geo1\`'s Render page.`,
            nodes: ['null1', 'pbr1'],
          },
          {
            title: 'Key light and environment fill',
            body: `Create a **Light COMP** \`light1\` at *Translate* **3, 4, 5** and an **Environment Light COMP** \`envlight1\` with *Light Color* **0.3, 0.36, 0.5**.

You'll see their effect once the render exists; for now, note the idea: one positioned light for shape, one ambient light for the shadows.`,
            nodes: ['light1', 'envlight1'],
          },
          {
            title: 'A second object: the halo',
            body: `Create a second **Geometry COMP** \`geo2\` with *Rotate* **20, 0, −12**. Inside, add a **Circle POP** \`circle1\`: *Connectivity* **Point Primitives**, *Orientation* **ZX Plane**, *Radius* **1.75, 1.75**, *Divisions* **600**, and *Rotate Y* \`absTime.seconds * 25\`.

Append a **Noise POP** \`noise2\`: *Type* **Simplex 4D (GPU)**, *Period* **0.6**, *Amplitude* **0.12**, *Translate 4D* \`absTime.seconds * 0.3\`.`,
            nodes: ['geo2', 'circle1', 'noise2'],
          },
          {
            title: 'Draw the points',
            body: `End the halo in a **Null POP** \`null2\` with display and render on. In \`/project1\` create a **Line MAT** \`line1\` and assign it to \`geo2\`:

* *Setup* page: *Depth Interpolation Model* **S Curve**, *Distance Near* **3.5**, *Distance Far* **6.5**, *Width Near* **4**, *Width Far* **1.5**.
* *Line* page: *Draw Lines* off. *Point* page: *Draw Points* on, *Point Type* **Circle (Polygon)**, *Point Near Color* **1.6, 1.1, 0.6**, *Specify Point Far Color* on, *Point Far Color* **0.35, 0.25, 0.5**.

Yes, colors above 1 are allowed — they'll matter in a minute.`,
            nodes: ['null2', 'line1'],
          },
          {
            title: 'One camera, two objects',
            body: `Create a **Camera COMP** \`cam1\`: *Translate* **0, 0.6, 5.2**, *Look At* \`../geo1\`, and on the View page *FOV Angle* **38**.

Create a **Render TOP** \`render1\`: *Camera(s)* \`cam1\`, *Geometry* \`geo1 geo2\`, *Lights* \`light1 envlight1\`, *Anti-Alias* **8x**, black background. On its Common page set *Output Resolution* **Custom Resolution**, *Resolution* **1920 × 1080** and *Pixel Format* **16-bit float (RGBA)**.

Both objects in one image, each with its own material.`,
            nodes: ['cam1', 'render1'],
          },
          {
            title: 'The trails loop',
            body: `Create a **Feedback TOP** \`feedback1\` wired from \`render1\`, then a **Level TOP** \`level1\` after it with *Opacity* **0.9** (Post page).

Create a **Composite TOP** \`comp1\` with \`render1\` in its first input. Set *Operation* **Maximum**. For now wire \`level1\` into its second input.

Finally close the loop: set \`feedback1\`'s *Target TOP* to \`comp1\`. Moving dots now leave trails.`,
            nodes: ['feedback1', 'level1', 'comp1'],
          },
          {
            title: 'Push the trails outward',
            body: `Insert a **Transform TOP** \`transform1\` between \`level1\` and \`comp1\`'s second input, with *Scale* **1.006, 1.006**.

Each frame the history is enlarged by 0.6% before it's combined again, so trails stream away from the center. Tiny values go a long way in a loop: try 1.02 and watch it explode.`,
            nodes: ['transform1'],
          },
          {
            title: 'Glow and grade',
            body: `After \`comp1\`, add a **Bloom TOP** \`bloom1\` (*Bloom Threshold* **0.6**, *Bloom Intensity* **0.8**), a **Level TOP** \`level2\` (*Contrast* **1.1**) and a **Null TOP** named \`final\`.

Compare \`comp1\` and \`bloom1\` side by side: the near halo dots, brighter than white, bloom hardest.`,
            nodes: ['bloom1', 'level2', 'final'],
          },
          {
            title: 'Out to a window',
            body: `Create a **Window COMP** \`window1\`: *Window Operator* \`../final\`, *Title* \`Render Stack\`, *Opening Size* **Custom**, *Width* **1920**, *Height* **1080**, *Borders* off.

On its Open/Close page pulse **Open as Separate Window**. Close it with the same page's *Close* pulse (or <kbd>Esc</kbd> if *Close on Escape Key* is on).`,
            nodes: ['window1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## How the trails loop works

TouchDesigner networks normally flow one way, and a wire from \`comp1\` back to an earlier node would be a cycle that can never finish cooking. The [[Feedback TOP]] breaks the cycle with a one-frame delay: it outputs what its *Target TOP* produced **last** frame. So each frame:

1. \`feedback1\` hands over the previous finished frame.
2. \`level1\` dims it to 90%.
3. \`transform1\` enlarges it by a hair.
4. \`comp1\` takes, per pixel, the brighter of the new render and that dimmed history.

A dot that stays still is simply re-rendered at full brightness every frame. A dot that moves leaves behind copies of itself, each one 10% dimmer than the last: a trail. The choice of **Maximum** is important. With **Add**, the render would be added to its own history every frame and anything static would pile up until it blew out to white.

Feedback loops are sensitive to everything in them. The opacity sets the trail length, the transform its direction — try a small *Rotate* in \`transform1\` for a swirl — and any blur or color change you insert compounds every frame. If a loop runs away, pulse *Reset Pulse* on the Feedback TOP to start again from the plain render.

## Why 16-bit float

An 8-bit image has 256 levels per channel between black and white, and nothing above white. Two things in this network need more than that:

* **Fading.** Each pass multiplies the history by 0.9. In 8-bit, a very dark value multiplied by 0.9 rounds back to the same level, so the faintest part of a trail can get stuck slightly above black and never clear — a permanent grey smear. With a float format the fade keeps going smoothly.
* **Overbright values.** The halo's near color is 1.6, 1.1, 0.6 — brighter than white. A float format keeps that extra energy, so the Bloom TOP can tell "white" from "really hot", and the glow looks like light rather than a flat haze. In 8-bit it would be clipped to 1 at the render.

You set this once on \`render1\` (Common page, *Pixel Format*). The filters after it default to *Use Input*, so the whole post chain inherits it. It costs twice the memory and bandwidth of 8-bit per image, which is almost always worth it for glow and feedback. Full 32-bit float is rarely needed for color; save it for images that carry data, like positions.

## Anti-aliasing and resolution

The Render TOP's *Anti-Alias* setting renders several samples per pixel and averages them. Edges of solid shapes need a little; thin lines and small dots need more, because each one covers only a few pixels and shimmers as it moves. Higher settings cost GPU time and memory, so raise it only until the shimmer goes away.

Render at the resolution you'll output. Rendering small and scaling up softens everything, and rendering big and scaling down wastes the GPU on pixels nobody sees. The post chain runs at whatever the render produces.

## Getting the image out

The [[Window COMP]] is how TouchDesigner drives a screen. Its *Window Operator* names the TOP (or panel) to show, *Opening Size* and *Width*/*Height* set its size, the *Display* and justify settings choose the monitor and position, and *Borders* off gives you a clean full-frame image. **Open as Separate Window** opens it while you keep working; **Open as Perform Window** switches TouchDesigner into perform mode with this window as the output.

Always point outputs at a Null like \`final\`, never at the middle of a chain. When you later package a look like this inside a component (Module 6), you'll end it in an [[Out TOP]] instead: the Out TOP gives the component an output connector, so the finished image can be wired onward like any other TOP.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Where the GPU time goes',
      md: `* **Pixels.** Every TOP in the post chain processes the full 1920 × 1080 image every frame. A few TOPs are cheap; dozens add up. The Probe palette tool and the [[Perform CHOP]] show where the time goes.
* **Anti-aliasing** multiplies the cost of the render itself, not the post chain.
* **Level TOP parameters** are turned into a lookup table on the CPU. Animating them rebuilds the table every frame — fine for one, but don't animate dozens.
* **Float formats** double memory traffic compared to 8-bit. Use them where they matter (render, feedback, glow), and drop to 8-bit at the very end if you're recording or streaming.`,
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'When the loop misbehaves',
      md: 'If trails never fade, check that `level1`\'s *Opacity* is below 1, that *Pre-Multiply RGB by Alpha* on its Post page is on, and that `render1` really is a float format. If the image drifts off-center, look for a *Translate* left in `transform1`. If everything turns white, you probably used **Add** instead of **Maximum** in `comp1`. Pulse the Feedback TOP\'s *Reset Pulse* after any fix.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Swap *Maximum* for **Screen** in \`comp1\` for softer, more photographic trails.
* Give \`transform1\` a *Rotate* of 0.3 for a whirlpool, or a scale just below 1 (0.995) so trails rush *inward*.
* Feed the halo's \`Point Near Color\` from a CHOP chain like last lesson's \`pulse\`, so the glow breathes.
* Put the blob on a [[Constant MAT]] in deep black with only the halo glowing: a silhouette eclipse.`,
    },
    {
      kind: 'challenge',
      title: 'Flat graphic poster',
      md: 'Turn the scene into a flat, graphic image: no perspective, no shading on the blob, and the halo dots all the same size whatever their depth.',
      hints: [
        'Two different layers are involved: the camera\'s projection, and the blob\'s material.',
        'For the dots, look at how the Line MAT decides width from distance.',
      ],
      solution:
        'On `cam1`\'s View page set *Projection* to **Orthographic** and *Ortho Width* to about **5** (adjust until the halo fits). Create a **Constant MAT** with a strong flat *Color* and assign it to `geo1` instead of `pbr1`. In `line1` set *Width Far* equal to *Width Near* (and the far color equal to the near color) so depth no longer changes the dots. With an orthographic camera the halo becomes a clean ellipse and the blob a flat silhouette — the look of a printed graphic, and exactly the setup you\'ll want for charts in Module 4.',
    },
    {
      kind: 'challenge',
      title: 'Ghost hunt',
      md: 'See the 8-bit problem for yourself. Make the trails long, then compare the render in 8-bit and in 16-bit float. Describe what changes and where.',
      hints: [
        'Longer trails make the effect easier to see: raise `level1`\'s *Opacity* toward 0.97.',
        'Change only `render1`\'s *Pixel Format*. Everything downstream inherits it.',
      ],
      solution:
        'With *Opacity* around 0.97 and `render1` set to **8-bit fixed (RGBA)**, the faint ends of the trails stop fading and leave a dim, blotchy residue that never quite reaches black; the bloom also flattens because nothing can be brighter than white. Switch back to **16-bit float (RGBA)** and pulse `feedback1`\'s *Reset Pulse*: the trails fade cleanly to black and the hot near dots glow again. Same network, different number format.',
    },
    {
      kind: 'challenge',
      title: 'Trails that change color as they age',
      md: 'Make fresh trails warm and old trails drift toward blue, without changing the colors of the objects themselves.',
      hints: [
        'Anything inside the loop is applied again on every pass, so its effect compounds with age.',
        'Multiplying by a color slightly below white in red and green, but not blue, removes red and green a little faster than blue each frame.',
      ],
      solution:
        'Create a **Constant TOP** with *Color* about **0.97, 0.98, 1**. Insert a **Composite TOP** between `transform1` and `comp1` with `transform1` in input 0 and the Constant TOP in input 1, *Operation* **Multiply**. Every trip round the loop multiplies the history by that color, so the longer a trail has existed, the more of its red and green has been removed. The objects themselves come fresh from `render1` each frame, so they keep their true colors. Keep the multipliers close to 1: they compound every frame.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Which material ignores lights entirely and shows colors exactly as given?',
          options: ['PBR MAT', 'Phong MAT', 'Constant MAT', 'Line MAT with Draw Points off'],
          answer: 2,
          explain: 'The Constant MAT is unlit. It\'s the honest choice for data colors, glowing elements and for ruling out lighting problems.',
        },
        {
          q: 'What does an orthographic camera change?',
          options: [
            'It renders in black and white',
            'Objects no longer shrink with distance; Ortho Width sets how much of the scene fits across the frame',
            'It disables the depth buffer',
            'It only works with Constant MATs',
          ],
          answer: 1,
          explain: 'Orthographic projection removes perspective. It\'s ideal for charts, maps and layouts that must line up.',
        },
        {
          q: 'In the trails loop, what does the Feedback TOP output?',
          options: [
            'Its input, delayed by one second',
            'The image its Target TOP produced on the previous frame',
            'The difference between two frames',
            'A blurred copy of the render',
          ],
          answer: 1,
          explain: 'The one-frame delay lets the loop reuse the last finished frame without creating an impossible cook cycle.',
        },
        {
          q: 'Why combine render and history with Maximum rather than Add?',
          options: [
            'Maximum is faster',
            'With Add, static objects are added to their own history every frame and blow out to white',
            'Add is not available in the Composite TOP',
            'Maximum produces longer trails',
          ],
          answer: 1,
          explain: 'Maximum keeps whichever is brighter per pixel, so still objects stay at their true brightness and only movement leaves trails.',
        },
        {
          q: 'Why render in 16-bit float for this network?',
          options: [
            'It is required by the Window COMP',
            'It halves memory use',
            'Fades in the loop keep going smoothly to black, and values brighter than white survive into the bloom',
            'It turns on anti-aliasing',
          ],
          answer: 2,
          explain: 'More precision avoids stuck trail residue, and headroom above 1 lets the bloom tell hot highlights from plain white.',
        },
      ],
    },
  ],
};

export default lesson;
