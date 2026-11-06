import type { Lesson } from '../types';

const extensionCode = `"""
SparksExt - helpers for the sparks particle component.
Capitalized members are promoted: op('sparks').Restart() works from anywhere.
"""

PRESETS = {
    'calm':  {'Birthrate': 2000,  'Life': 5.0, 'Turbulence': 0.4, 'Drag': 0.08},
    'storm': {'Birthrate': 20000, 'Life': 1.5, 'Turbulence': 2.5, 'Drag': 0.01},
}


class SparksExt:

    def __init__(self, ownerComp):
        # The component this extension is attached to
        self.ownerComp = ownerComp

    def Restart(self):
        """Clear every particle and start emitting again."""
        self.ownerComp.op('particle1').par.startpulse.pulse()

    def ApplyPreset(self, name):
        """Copy a named preset into the component's custom parameters."""
        values = PRESETS.get(name)
        if values is None:
            debug('SparksExt: unknown preset', name)
            return
        for parName, value in values.items():
            getattr(self.ownerComp.par, parName).val = value

    def ParticleCount(self):
        """Live particle count, one frame late so it never stalls the GPU."""
        return self.ownerComp.op('null1').numPoints(delayed=True)
`;

const parexecCode = `# Parameter Execute DAT inside sparks.
# OPs = parent()   Parameters = Preset Reset
# Value Change and On Pulse are on. The other default
# callbacks can stay as they are.

def onValueChange(par, val, prev):
    if par.name == 'Preset':
        parent().ApplyPreset(par.eval())
    return

def onPulse(par):
    if par.name == 'Reset':
        parent().Restart()
    return
`;

const lesson: Lesson = {
  slug: 'reusable-components',
  title: 'Reusable Components & Custom Parameters',
  subtitle: 'Turn a particle effect into a tool: one component with its own controls, behaviour and version number, ready to drop into any project.',
  minutes: 50,
  summary:
    'Package a POP particle system inside a [[Base COMP]] with In and Out POPs, give it custom parameters, react to them with a [[Parameter Execute DAT]], add a promoted Python extension, and save it as a versioned `.tox`.',
  objectives: [
    'Design a component boundary with [[In POP]] and [[Out POP]] connectors',
    'Create custom parameters in the Component Editor and read them with `parent().par.Name`',
    'Respond to menu and pulse parameters with a [[Parameter Execute DAT]]',
    'Write a Python extension with promoted methods and call it from inside and outside the component',
    'Save, reference and version a component as an external `.tox`',
  ],
  requires: ['particles', 'performance'],
  tags: ['components', 'custom parameters', 'python', 'extensions', 'tox', 'production'],
  blocks: [
    {
      kind: 'md',
      md: `
By now you've built several particle systems, and each time you rebuilt the same loop: a Particle POP, a few forces, a Null as the loop target. In production you want to build that once, give it a clean set of controls, and then *use* it — in this project, the next one, and in a teammate's.

That's what a component is for. In this lesson you'll wrap a curl-noise particle effect into a Base COMP called \`sparks\`. From the outside it will look like any other operator: one POP input (where to emit from), one POP output (the particles), and a parameter page with **Birth Rate**, **Life**, **Turbulence**, **Drag**, a **Preset** menu and a **Reset** button. Inside, a tiny Python extension gives it methods you can call from scripts, and at the end you'll save it as a versioned \`.tox\` file.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'What makes a component reusable',
      md: `* **A boundary.** Data enters through *In* operators and leaves through *Out* operators. Nothing inside reaches out to a hard-coded path like \`/project1/sphere1\`.
* **An interface.** Custom parameters are the only knobs a user needs. Internals read them with \`parent().par.Name\`.
* **Behaviour.** Things that aren't a simple value — "restart", "apply a preset" — live in Python callbacks and an extension, so the component responds the same way whether a person clicks or a script calls.
* **Identity.** A version number and a file on disk, so you know which copy is running.`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'sparks-component',
        title: 'The sparks component',
        root: '/project1',
        height: 560,
        caption:
          'Dive into **sparks** to see the particle loop, the extension DAT and the Parameter Execute DAT. Outside, `sphere1` feeds the component and `geo1` renders its output. The custom parameters themselves live on the `sparks` node — see the table after the graph.',
        nodes: [
          {
            id: 'sphere1',
            type: 'spherePOP',
            x: 0,
            y: 0,
            params: { Type: 'Geodesic', 'Geodesic Connectivity': 'None', Frequency: 6, Radius: [0.3, 0.3, 0.3] },
            note: 'The emitter shape, *outside* the component. Anything with points can be wired in instead — a text outline, a point cloud, a moving circle.',
          },
          {
            id: 'sparks',
            type: 'baseCOMP',
            x: 1,
            y: 0,
            inputs: ['sphere1'],
            params: {
              'Object[0]': "op('./SparksExt').module.SparksExt(me)",
              'Promote[0]': true,
            },
            note: 'The tool. Its **Sparks** page holds the custom parameters, its *Extensions* page loads `SparksExt` with *Promote* on, so methods like `Restart()` are callable directly on the component. The Component Editor fills in the extension fields for you.',
            children: [
              {
                id: 'in1',
                type: 'inPOP',
                x: 0,
                y: 0,
                note: 'Creates the component\'s POP input connector. Whatever is wired into `sparks` from outside appears here.',
              },
              {
                id: 'particle1',
                type: 'particlePOP',
                x: 1,
                y: 0,
                inputs: ['in1'],
                params: {
                  'Target Feedback Loop POP': { ref: 'null1' },
                  'Create Point Primitives': true,
                  'Maximum Particles': { expr: 'parent().par.Maxparticles' },
                  'Birth Rate': { expr: 'parent().par.Birthrate' },
                  'Life Expect': { expr: 'parent().par.Life' },
                  'Life Variance (Fraction)': 0.3,
                  'Jitter Birth Position': 0.02,
                  'Velocity Damping': { expr: 'parent().par.Drag' },
                },
                note: 'The simulation. Every value a user might want to change is an expression that reads the parent\'s custom parameters — nothing is typed in here twice.',
              },
              {
                id: 'noise1',
                type: 'noisePOP',
                x: 2,
                y: 0,
                inputs: ['particle1'],
                params: {
                  Type: 'Simplex 4D (GPU)',
                  Period: 1.2,
                  Amplitude: { expr: 'parent().par.Turbulence' },
                  'Translate 4D': { expr: 'absTime.seconds * 0.2' },
                  'Combine Entity': 'Curl 3D',
                  'Combine Attribute Scope': 'PartForce',
                  'Output Attribute Scope': 'PartForce',
                },
                note: 'Adds curl noise to `PartForce` instead of moving `P`, so the Particle POP integrates it into smooth, swirling velocity. *Amplitude* is the **Turbulence** knob.',
              },
              {
                id: 'null1',
                type: 'nullPOP',
                x: 3,
                y: 0,
                inputs: ['noise1'],
                note: 'The loop target: the Particle POP reads this node\'s state on the next frame. The extension also reads its point count.',
              },
              {
                id: 'out1',
                type: 'outPOP',
                x: 4,
                y: 0,
                inputs: ['null1'],
                note: 'Creates the component\'s POP output connector. Downstream, the particles are just a POP stream.',
              },
              {
                id: 'SparksExt',
                type: 'textDAT',
                x: 1,
                y: 1.3,
                code: { lang: 'python', text: extensionCode },
                note: 'The extension class. Capitalized methods are promoted to the component; `ownerComp` is the component itself. The preset table is plain Python data at the top of the file.',
              },
              {
                id: 'parexec1',
                type: 'parameterexecuteDAT',
                x: 2.5,
                y: 1.3,
                params: {
                  OPs: { expr: 'parent()' },
                  Parameters: 'Preset Reset',
                  'Value Change': true,
                  'On Pulse': true,
                },
                code: { lang: 'python', text: parexecCode },
                note: 'Turns parameter *events* into behaviour: picking a preset applies it, pressing **Reset** restarts the simulation. The callbacks hand the work to the extension so scripts and clicks share one code path.',
              },
            ],
            childComments: [{ x: 0, y: 1.1, w: 1, text: 'In → loop → Out. Nothing inside points outside.' }],
          },
          {
            id: 'geo1',
            type: 'geometryCOMP',
            x: 2,
            y: 0,
            inputs: ['sparks'],
            params: { Material: { ref: 'line1' } },
            note: 'Renders whatever comes out of `sparks`. Keeping rendering outside the component means the same tool can feed a Line MAT here and an instancer somewhere else.',
            children: [
              {
                id: 'geo_in',
                type: 'inPOP',
                x: 0,
                y: 0,
                note: 'Receives the particles wired into `geo1`.',
              },
              {
                id: 'null2',
                type: 'nullPOP',
                x: 1,
                y: 0,
                inputs: ['geo_in'],
                flags: { display: true, render: true },
                note: 'Holds the render and display flags.',
              },
            ],
          },
          {
            id: 'line1',
            type: 'lineMAT',
            x: 2,
            y: 1.2,
            params: { 'Draw Points': true, 'Point Type': 'Circle', 'Point Near Color': [1, 0.7, 0.35] },
            note: 'Draws each particle\'s point primitive as a small camera-facing circle. Tune the size on the *Setup* and *Point* pages to taste.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 3,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0, 6] },
            note: 'Far enough back to see the swirl spread out.',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 3,
            y: 0,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo1' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.02, 0.03, 1],
            },
            note: 'No lights needed — the Line MAT is unlit.',
          },
          {
            id: 'final',
            type: 'nullTOP',
            x: 4,
            y: 0,
            inputs: ['render1'],
            note: 'The finished image.',
          },
        ],
        steps: [
          {
            title: 'A box with a door in',
            body: `In \`/project1\` create a **Sphere POP** \`sphere1\`: *Type* **Geodesic**, *Geodesic Connectivity* **None**, *Frequency* **6**, *Radius* **0.3**. Its points are where particles will be born.

Create a **Base COMP** \`sparks\` and wire \`sphere1\` into it — the wire won't connect until the component has an input, so go inside first and add an **In POP** \`in1\`. Back outside, the connector appears; wire it up.`,
            nodes: ['sphere1', 'sparks', 'in1'],
          },
          {
            title: 'The particle loop, inside',
            body: `Inside \`sparks\`, build a loop you know from the particles lesson: **Particle POP** \`particle1\` (from \`in1\`) → **Noise POP** \`noise1\` → **Null POP** \`null1\`. On \`particle1\` set *Target Feedback Loop POP* to \`null1\` and turn on *Create Point Primitives*.

On \`noise1\`: *Type* **Simplex 4D (GPU)**, *Period* **1.2**, *Translate 4D* = \`absTime.seconds * 0.2\`, and on the *Output* page set *Combine Entity* **Curl 3D**, *Combine Attribute Scope* and *Output Attribute Scope* both \`PartForce\`.

For now, type plain numbers into Birth Rate, Life Expect and the others. You'll replace them with expressions in step 5.`,
            nodes: ['particle1', 'noise1', 'null1'],
          },
          {
            title: 'A door out, and something to show it',
            body: `Append an **Out POP** \`out1\` to \`null1\`. Go up: \`sparks\` now has an output connector.

Create a **Geometry COMP** \`geo1\`, delete its default contents, and inside add an **In POP** \`geo_in\` → **Null POP** \`null2\` with render and display flags. Wire \`sparks\` into \`geo1\`.`,
            nodes: ['out1', 'geo1', 'geo_in', 'null2'],
          },
          {
            title: 'Render it',
            body: `Create a **Line MAT** \`line1\` (*Draw Points* on, *Point Type* **Circle**, a warm *Point Near Color*) and assign it as \`geo1\`'s *Material*. Add a **Camera COMP** \`cam1\` at *Translate* **0, 0, 6**, a **Render TOP** \`render1\` (*Anti-Alias* **4x**, dark background) and a **Null TOP** \`final\`.

You should see sparks swirling off the sphere.`,
            nodes: ['line1', 'cam1', 'render1', 'final'],
          },
          {
            title: 'Custom parameters',
            body: `Right-click \`sparks\` → **Customize Component…** to open the Component Editor. Add a page called **Sparks**, then add parameters one at a time (name, type, *Add Par*), and set each one's label, default and slider range in the editor:

\`Birthrate\` (Float), \`Life\` (Float), \`Turbulence\` (Float), \`Drag\` (Float), \`Maxparticles\` (Int), \`Preset\` (Menu with entries \`calm\` and \`storm\`) and \`Reset\` (Pulse). Add a second page **About** with a \`Version\` (Str) parameter.

Now go inside and replace the typed numbers with expressions: \`particle1\` *Birth Rate* = \`parent().par.Birthrate\`, *Life Expect* = \`parent().par.Life\`, *Velocity Damping* = \`parent().par.Drag\`, *Maximum Particles* = \`parent().par.Maxparticles\`, and \`noise1\` *Amplitude* = \`parent().par.Turbulence\`.`,
            focus: ['sparks', 'particle1', 'noise1'],
          },
          {
            title: 'An extension with promoted methods',
            body: `In the Component Editor, open **Extension Code**, type \`SparksExt\` and click **Add**. TouchDesigner creates a Text DAT \`SparksExt\` inside the component and fills in \`sparks\`' *Extensions* page: *Object* becomes \`op('./SparksExt').module.SparksExt(me)\`. Make sure **Promote** is on.

Replace the DAT's text with the code from the inspector, then pulse **Re-Init Extensions** on the *Extensions* page. Test it in the Textport: \`op('/project1/sparks').ParticleCount()\`.`,
            nodes: ['SparksExt'],
            focus: ['sparks'],
          },
          {
            title: 'React to Preset and Reset',
            body: `Inside \`sparks\`, create a **Parameter Execute DAT** \`parexec1\`. Put *OPs* in expression mode as \`parent()\`, set *Parameters* to \`Preset Reset\`, and turn on **Value Change** and **On Pulse**.

Paste the two callbacks from the inspector. Now choose **storm** from the Preset menu: the sliders jump and the sparks go wild. Press **Reset** and the particles clear and start over.`,
            nodes: ['parexec1'],
          },
          {
            title: 'Save it as a .tox',
            body: `Set *Version* on the About page to \`1.0.0\`. Right-click \`sparks\` → **Save Component .tox…** and save it into a \`tox\` folder next to your project file, as \`sparks.tox\`.

On \`sparks\`' *Common* page, point **External .tox Path** at that file and make sure **Enable External .tox** is on. From now on, the project loads the component from the file every time it starts — and any other project can do the same.`,
            focus: ['sparks'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## The parameter interface

These are the parameters the steps create. Ranges are starting points — set them so that the whole slider is useful, not just the first 5 %.

| Name | Label | Type | Suggested range | Drives |
|---|---|---|---|---|
| \`Birthrate\` | Birth Rate | Float | 0 – 30 000 | particles born per second |
| \`Life\` | Life | Float | 0.2 – 8 | seconds each particle lives |
| \`Turbulence\` | Turbulence | Float | 0 – 4 | curl noise amplitude |
| \`Drag\` | Drag | Float | 0 – 0.3 | velocity damping |
| \`Maxparticles\` | Max Particles | Int | 1 000 – 500 000 | memory reserved (see lesson 6.1) |
| \`Preset\` | Preset | Menu | calm, storm | applies a set of values |
| \`Reset\` | Reset | Pulse | — | restarts the simulation |
| \`Version\` | Version | Str | — | on the About page |

**Naming.** Custom parameter names start with a capital letter followed by lowercase letters or digits — \`Birthrate\`, not \`BirthRate\` or \`birth_rate\`. The *label* is what users read, so make that friendly. Keep names short; they show up in every expression.

**Reading them.** Inside the component, \`parent().par.Birthrate\` is the parent's parameter. If you nest components deeper, counting parents gets fragile — set the component's **Parent Shortcut** (on its *Common* page) to \`Sparks\` and write \`parent.Sparks.par.Birthrate\` at any depth instead.

**Expressions or callbacks?** Use an expression whenever a parameter is simply a *value* somewhere inside — it updates continuously and costs almost nothing. Use a callback when a parameter means an *action*: a pulse, a menu that should set several other values, anything that must happen once.
`,
    },
    {
      kind: 'md',
      md: `
## How the Python fits together

### The Parameter Execute DAT

The Parameter Execute DAT watches the parameters you list on the operators you point it at, and calls a function when something happens. The callbacks you'll use most:

* \`onValueChange(par, val, prev)\` — the value changed. \`par\` is the Par object, \`val\` the new value, \`prev\` the old one.
* \`onPulse(par)\` — a pulse parameter was pressed (or \`par.pulse()\` was called from a script).

There are also \`onExpressionChange\`, \`onExportChange\`, \`onEnableChange\` and \`onModeChange\` with the same \`(par, val, prev)\` signature, each switched on by its own toggle. Remember that the DAT reacts to **changes**: choosing the preset that's already selected does nothing. To re-apply it, a script can call \`op('sparks').ApplyPreset('storm')\` directly.

### The extension

An extension is an ordinary Python class that TouchDesigner instantiates with the component as its argument (\`ownerComp\`). Because **Promote** is on, every method or attribute whose name starts with a capital letter is reachable directly on the component:

* from inside: \`parent().Restart()\`
* from anywhere: \`op('/project1/sparks').ApplyPreset('calm')\`
* without promotion, through the \`ext\` member: \`op('/project1/sparks').ext.SparksExt.Restart()\`

Lowercase names stay private to the class. Three details worth copying into every extension you write:

1. **It can be re-created at any time** — editing the DAT, re-initializing or reloading the file builds a fresh instance. Don't keep important state only in Python attributes; keep it in custom parameters, where it's saved with the component.
2. **Resolve operators relative to \`ownerComp\`** (\`self.ownerComp.op('particle1')\`), never by absolute path. That's what lets a copy of the component work anywhere.
3. **Never stall the GPU from Python.** \`ParticleCount()\` uses \`numPoints(delayed=True)\`, exactly as lesson 6.1 recommends.
`,
    },
    {
      kind: 'code',
      lang: 'python',
      title: 'Driving the component from the Textport (or any script)',
      code: `s = op('/project1/sparks')

s.ApplyPreset('storm')      # promoted method from SparksExt
s.par.Turbulence = 1.0      # custom parameters are ordinary Pars
s.par.Reset.pulse()         # triggers onPulse in parexec1 -> Restart()
print(s.ParticleCount())    # one frame late, never stalls`,
    },
    {
      kind: 'md',
      md: `
## Shipping it: .tox files and versions

A \`.tox\` is a component saved on its own. With **External .tox Path** set and **Enable External .tox** on, the project loads the component's contents from that file at startup — so fixing a bug in \`sparks.tox\` fixes every project that references it. A few parameters on the *Common* page control the details:

* **Reload Custom Parameters** — when on, the top-level custom parameter values also come from the file when it reloads. Turn it off if each project should keep its own settings (its own Birth Rate, say) while the internals update.
* **Save Backup of External** — keeps a copy inside the \`.toe\` as a fallback in case the file is missing on another machine.
* **Enable External .tox Pulse** — reloads from disk right now, handy after you've edited the file from another project.

**Versioning** is a habit, not a feature. Bump the *Version* parameter whenever behaviour changes (\`1.0.0\` → \`1.1.0\` for a new parameter, \`2.0.0\` when an old parameter is renamed or removed, because that breaks the expressions people wrote against it). Keep the file the project references under a stable name (\`sparks.tox\`) and archive dated or numbered copies next to it, or put the \`tox\` folder under version control. When something looks wrong on site, the About page tells you instantly which version is running.
`,
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'The boundary leaks',
      md: 'The most common bug in a "reusable" component is a path that only works in the project it was built in: `op(\'/project1/audio\')` inside an expression, a Render TOP pointing at `../geo1`. Before saving a `.tox`, drop a copy into an empty project and check for errors. Anything the component needs from outside should come in through an In operator or a custom parameter (an *OP* type parameter is perfect for "which CHOP should I listen to?").',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: 'Add a *Colour* parameter (RGB) and write it into a `Color` attribute inside the component with a [[Math Mix POP]] — then the tool controls its own palette even though rendering happens outside. Or add an *OP* parameter called *Audio* that accepts any CHOP, and let its first channel scale Turbulence. One component, many shows.',
    },
    {
      kind: 'challenge',
      title: 'Three instances, one geo',
      md: 'Make two more copies of `sparks` fed by different emitters, each on a different preset, and render all three in `geo1`.',
      hints: [
        'A Geometry COMP can have several In POPs — or you can merge the streams before they enter.',
        'Presets are applied through the extension, so a one-line script can set up each copy.',
      ],
      solution:
        'Copy/paste `sparks` twice (`sparks1`, `sparks2`), wire a [[Circle POP]] and a [[Box POP]] into them, and merge the three outputs with a [[Merge POP]] before `geo1` (or give `geo1` three In POPs feeding a Merge POP inside). Set the presets with `op(\'sparks1\').ApplyPreset(\'calm\')` and so on, or just pick them from each Preset menu. Because every expression inside uses `parent()`, each copy reads its own parameters.',
    },
    {
      kind: 'challenge',
      title: 'A Burst button',
      md: 'Add a **Burst** pulse parameter that multiplies the birth rate by 10 for a quarter of a second, then returns to normal — without permanently changing the Birth Rate slider.',
      hints: [
        'Keep the multiplier separate from the user\'s value: an extra hidden-ish custom parameter (say `Burstgain`, default 1) multiplied into the Birth Rate expression works well.',
        'TouchDesigner\'s `run()` can call a function after a delay: `run(callable, delayMilliSeconds=250)`.',
      ],
      solution:
        'Add `Burst` (Pulse) and `Burstgain` (Float, default 1). Change `particle1`\'s Birth Rate to `parent().par.Birthrate * parent().par.Burstgain`. Add `Burst` to `parexec1`\'s *Parameters*, and in the extension:\n\n```python\ndef Burst(self, gain=10, ms=250):\n    p = self.ownerComp.par.Burstgain\n    p.val = gain\n    run(lambda: setattr(p, \'val\', 1), delayMilliSeconds=ms)\n```\n\nThen in `onPulse`: `if par.name == \'Burst\': parent().Burst()`. The slider the user set is never touched, so repeated bursts can\'t ratchet the value up.',
    },
    {
      kind: 'challenge',
      title: 'Version check',
      md: 'Make the component print a warning to the Textport when the project opens with a `sparks.tox` older than `1.1.0`.',
      hints: ['An extension\'s `__init__` runs when the component initializes. `ownerComp.par.Version.eval()` gives you the string.'],
      solution:
        'In `__init__`, compare the version as a tuple of integers: `v = tuple(int(x) for x in ownerComp.par.Version.eval().split(\'.\'))` and `if v < (1, 1, 0): debug(\'sparks is older than 1.1.0\')`. If it doesn\'t fire on startup, turn on *Init Extensions On Start* on the Extensions page — extensions normally initialize when first used.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'Inside `sparks`, how does the Particle POP read the component\'s **Birthrate** parameter?',
          options: ["`op('/project1/sparks').par.Birthrate`", '`parent().par.Birthrate`', '`me.par.Birthrate`', "`op('Birthrate')`"],
          answer: 1,
          explain: '`parent()` is the component the operator lives in, so the expression keeps working in any copy of the component, wherever it is placed.',
        },
        {
          q: 'Why can a script call `op(\'sparks\').Restart()` directly on the component?',
          options: [
            'All Python functions in a component are global',
            'The method name is capitalized and the extension has Promote on',
            'Because Restart is a built-in COMP method',
            'Because the Parameter Execute DAT defines it',
          ],
          answer: 1,
          explain: 'Promotion exposes an extension\'s capitalized members on the component. Without it you would write `op(\'sparks\').ext.SparksExt.Restart()`.',
        },
        {
          q: 'Which callback runs when the **Reset** pulse parameter is pressed?',
          options: ['`onValueChange(par, val, prev)`', '`onPulse(par)`', '`onOffToOn(channel, sampleIndex, val, prev)`', '`onFrameEnd(frame)`'],
          answer: 1,
          explain: 'Pulse parameters fire `onPulse(par)` in a Parameter Execute DAT, provided its *On Pulse* toggle is on and the parameter is listed.',
        },
        {
          q: 'You want every project using `sparks.tox` to get your bug fixes, but keep its own Birth Rate and Life settings. Which setting matters?',
          options: [
            'Turn **Reload Custom Parameters** off',
            'Turn **Enable External .tox** off',
            'Turn **Save Backup of External** on',
            'Rename the parameters in each project',
          ],
          answer: 0,
          explain: 'With Reload Custom Parameters off, the internals reload from the file while the component\'s top-level custom parameter values stay as each project saved them.',
        },
        {
          q: 'Why does the extension keep the presets\' *results* in custom parameters rather than in Python attributes?',
          options: [
            'Python attributes are slower to read',
            'Extensions can be re-created at any time, and custom parameter values are saved with the component',
            'Custom parameters run on the GPU',
            'Python attributes cannot hold numbers',
          ],
          answer: 1,
          explain: 'Re-initializing builds a fresh instance of the class. Anything that must survive saves and reloads belongs in parameters (or explicit storage).',
        },
      ],
    },
  ],
};

export default lesson;
