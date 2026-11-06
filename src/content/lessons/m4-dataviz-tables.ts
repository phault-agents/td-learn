import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'dataviz-tables',
  title: 'From Table to Geometry: 3D Bar Charts',
  subtitle: 'Turn rows into points, columns into attributes, and attributes into honest, animated bars.',
  minutes: 45,
  summary:
    'Build a data-driven bar chart: a Table DAT becomes points through the [[DAT to POP]], ReRange and Normalize POPs act as scales, instanced boxes become bars colored from a [[Ramp TOP]], and a [[Time Filter POP]] eases every change. Rendered through an orthographic camera with gridlines and labels.',
  objectives: [
    'Format a table so the [[DAT to POP]] turns its columns into point attributes',
    'Use the [[ReRange POP]] as a fixed linear scale and know when the [[Normalize POP]] is (and is not) appropriate',
    'Instance boxes as bars whose height, position and color come from attributes',
    'Smooth data changes with the [[Time Filter POP]] instead of letting bars jump',
    'Add gridlines and category labels, and frame the chart with an orthographic camera',
  ],
  requires: ['attributes', 'instancing'],
  tags: ['data viz', 'dat to pop', 'instancing', 'scales', 'text pop', 'orthographic'],
  blocks: [
    {
      kind: 'md',
      md: `
A bar chart is the most humble chart there is — and that's exactly why it's the right first project for data visualization in TouchDesigner. Everything that matters later (getting data in, mapping it to visual properties, keeping it honest, making it move) shows up here in its simplest form.

You'll build a twelve-bar chart driven by a table. Every row becomes a point, every column becomes an attribute, and a single instanced box turns those points into bars. When the data changes, the bars glide to their new heights instead of snapping. The finished network is small, but it's a real template: swap the table for a CSV, a database export or a live feed and nothing downstream needs to change.

## Data in, geometry out

The bridge between tables and POPs is the [[DAT to POP]]. It reads a table and creates **one point per row**. Each column header becomes the name of an attribute, and each cell becomes that point's value. A table like this:

| text | tx | value |
|---|---|---|
| Jan | 0 | 42 |
| Feb | 1 | 48 |

turns into two points, each carrying a \`tx\` attribute and a \`value\` attribute. Headers follow POP naming rules, so a vector needs **one column per component**: \`P(0)\`, \`P(1)\`, \`P(2)\` become the three components of \`P\`, and \`Color(0)\` … \`Color(3)\` build an RGBA color. A plain name like \`value\` becomes a scalar float.

Text columns are a different matter: a point attribute holds numbers, not words. We keep the month names in the table (the labels will need them) and tell the DAT to POP to **exclude** that column.
`,
    },
    {
      kind: 'callout',
      tone: 'concept',
      title: 'Encodings: what the eye reads best',
      md: `A chart is a set of *encodings* — rules that turn a data attribute into a visual property. People compare some properties far more accurately than others. Roughly, from best to worst:

1. **Position** along a common scale
2. **Length** (bars)
3. Angle and slope
4. Area
5. **Color** intensity or hue

So the value goes into the bar's **length** first. Color can *repeat* the same value to make the pattern pop, but it should never be the only carrier of a quantity. In this build: \`tx\` → horizontal position (which month), \`value\` → bar height, and \`value\` again → color.`,
    },
    {
      kind: 'md',
      md: `
## Scales: from data units to world units

Your data lives in its own units (cups per day, euros, degrees). The scene lives in world units. A **scale** is the function between the two, defined by a *domain* (the data range) and a *range* (the output range). In POPs, a linear scale is exactly what the [[ReRange POP]] does: *Map from Low/High* is the domain, *Map to Low/High* is the range.

The [[Normalize POP]] looks similar but works differently: it inspects the data it receives and stretches it so the values span 0 to 1. That's handy, but it's *data-driven*: the smallest bar would always end up at zero height and the tallest at full height, whatever the real numbers are. For bar length that's a lie. For a color lookup, where you want to use the whole palette, it's a reasonable choice — as long as you remember the colors are relative to the current data.

> Bars must start at zero. A bar's length *is* its value; cut off the bottom and a 10 % difference can look like a 300 % one.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'bar-chart',
        title: 'Animated bar chart',
        root: '/project1',
        height: 600,
        caption:
          'Data flows left to right: two sample tables → a Switch DAT → points → scales and color → time filter → instanced bars. Below: the gridlines and labels, then camera, materials and the Render TOP. Dive into each Geometry COMP to see the single POP it renders.',
        nodes: [
          {
            id: 'dataA',
            type: 'tableDAT',
            x: 0,
            y: 0,
            table: [
              ['text', 'tx', 'value'],
              ['Jan', '0', '42'],
              ['Feb', '1', '48'],
              ['Mar', '2', '55'],
              ['Apr', '3', '61'],
              ['May', '4', '70'],
              ['Jun', '5', '78'],
              ['Jul', '6', '85'],
              ['Aug', '7', '83'],
              ['Sep', '8', '72'],
              ['Oct', '9', '60'],
              ['Nov', '10', '50'],
              ['Dec', '11', '46'],
            ],
            note: '**Illustrative sample data — invented numbers.** Read it as "average cups of cold brew sold per day" at a café that doesn\'t exist. `text` is the label, `tx` is the category slot (its x position), `value` is the quantity.',
          },
          {
            id: 'dataB',
            type: 'tableDAT',
            x: 0,
            y: 1,
            table: [
              ['text', 'tx', 'value'],
              ['Jan', '0', '38'],
              ['Feb', '1', '41'],
              ['Mar', '2', '59'],
              ['Apr', '3', '66'],
              ['May', '4', '64'],
              ['Jun', '5', '81'],
              ['Jul', '6', '92'],
              ['Aug', '7', '88'],
              ['Sep', '8', '69'],
              ['Oct', '9', '57'],
              ['Nov', '10', '44'],
              ['Dec', '11', '52'],
            ],
            note: 'A second invented "year" with the **same columns and the same rows in the same order**. Matching structure is what lets the bars morph smoothly from one dataset to the other.',
          },
          {
            id: 'switch1',
            type: 'switchDAT',
            x: 1,
            y: 0.5,
            inputs: ['dataA', 'dataB'],
            params: { Index: { expr: 'int(absTime.seconds / 4) % 2' } },
            note: 'Picks one of its inputs. The expression flips between 0 and 1 every 4 seconds, so you can watch the transitions. Later, replace it with a button, a timer or a live source.',
          },
          {
            id: 'dattopop1',
            type: 'dattoPOP',
            x: 2,
            y: 0.5,
            params: {
              'Points DAT': { ref: 'switch1' },
              'Points:Convert All Excluding': true,
            },
            note: 'One point per row; every column becomes an attribute. Type `text` into the *Exclude Columns* field beside the toggle — words can\'t become point attributes. Middle-click: you should see 12 points with `tx` and `value`.',
          },
          {
            id: 'mathmix1',
            type: 'mathmixPOP',
            x: 3,
            y: 0.5,
            inputs: ['dattopop1'],
            params: {
              'Operation[0]': 'A * B',
              'Scope A[0]': '1 0 0',
              'Scope B[0]': 'tx',
              'Result Scope[0]': 'P',
            },
            note: 'Builds the position vector: the constant vector `1 0 0` times the scalar `tx` gives `P = (tx, 0, 0)`. Every bar now sits on the baseline at its own slot.',
          },
          {
            id: 'rerange1',
            type: 'rerangePOP',
            x: 4,
            y: 0.5,
            inputs: ['mathmix1'],
            params: {
              'Input Attribute Scope': 'value',
              'Map from Low': 0,
              'Map from High': 100,
              'Map to Low': 0,
              'Map to High': 6,
              'Output Attribute Scope': 'h',
            },
            note: 'The **length scale**. Domain 0–100 (cups per day) → range 0–6 (world units), written to a new attribute `h`. The domain is fixed and starts at zero, so bar heights are comparable between datasets.',
          },
          {
            id: 'normalize1',
            type: 'normalizePOP',
            x: 5,
            y: 0.5,
            inputs: ['rerange1'],
            params: {
              'Input Attribute Scope': 'value',
              'Output Attribute Scope': 'u',
            },
            note: 'A **data-driven** 0–1 version of `value`, stored as `u`, used only to pick a color. The lowest month of the current dataset lands at the start of the palette and the highest at the end.',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 5,
            y: 1.6,
            params: { Type: 'Horizontal' },
            note: 'The palette. Horizontal, so left-to-right in the image maps to 0→1 in the lookup. In the ramp editor, set a few keys for a sequential palette — e.g. deep blue → teal → pale yellow. Avoid rainbows: they invent boundaries that aren\'t in the data.',
          },
          {
            id: 'lookuptex1',
            type: 'lookuptexturePOP',
            x: 6,
            y: 0.5,
            inputs: ['normalize1'],
            params: {
              TOP: { ref: 'ramp1' },
              'Lookup Index Attribute U': 'u',
              'Output Attribute Scope': 'Color',
            },
            note: 'Samples the ramp at each point\'s `u` and writes the RGBA result to `Color`.',
          },
          {
            id: 'timefilter1',
            type: 'timefilterPOP',
            x: 7,
            y: 0.5,
            inputs: ['lookuptex1'],
            params: {
              'Always Cook': true,
              'Input Attributes': 'h Color',
              Type: 'Gaussian',
              'Filter Width': 0.6,
            },
            note: 'Averages `h` and `Color` over a short time window, so a data change becomes a smooth glide. Filter the *visual* attributes, after all the mapping. Check that the unit menu beside *Filter Width* reads seconds.',
          },
          {
            id: 'barpts',
            type: 'nullPOP',
            x: 8,
            y: 0.5,
            inputs: ['timefilter1'],
            note: 'The finished instance data: 12 points, each with `P`, `h` and `Color`. The bars Geometry COMP reads from here, so you can rework anything upstream without touching the instancing settings.',
          },
          {
            id: 'geo_bars',
            type: 'geometryCOMP',
            x: 9,
            y: 0.5,
            params: {
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: 'barpts' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
              'Scale Y': 'h',
              'Color Mode': 'Replace',
              R: 'Color(0)',
              G: 'Color(1)',
              B: 'Color(2)',
              Material: { ref: 'constant1' },
            },
            note: 'One box, drawn once per point of `barpts`. *Instance* page: position from `P`, height from `h` (Scale Y). *Instance 2* page: color from `Color`. Leave Scale X and Z empty so the box keeps its own width.',
            children: [
              {
                id: 'box1',
                type: 'boxPOP',
                x: 0,
                y: 0,
                params: { Size: [0.7, 1, 0.7], Translate: [0, 0.5, 0] },
                flags: { display: true, render: true },
                note: 'A unit-tall box lifted by half its height, so it spans y = 0 to 1. Scaling it in Y then grows the bar **up from the baseline** instead of in both directions from its middle.',
              },
            ],
          },
          {
            id: 'geo_grid',
            type: 'geometryCOMP',
            x: 9,
            y: 1.6,
            params: { Material: { ref: 'linemat1' } },
            note: 'The gridlines, in their own Geometry COMP so they can use the Line MAT while the bars use a Constant MAT.',
            children: [
              {
                id: 'grid1',
                type: 'gridPOP',
                x: 0,
                y: 0,
                params: {
                  Connectivity: 'Line Strips',
                  Size: [12.4, 6],
                  Columns: 2,
                  Rows: 5,
                  Translate: [5.5, 3, -0.2],
                },
                flags: { display: true, render: true },
                note: 'Five horizontal rules at y = 0, 1.5, 3, 4.5 and 6 — the world positions of 0, 25, 50, 75 and 100 cups. With only *Line X* switched on (in the *Line X/Y/Z* toggles), every row becomes one horizontal strip. Pushed slightly back in Z so bars draw in front.',
              },
            ],
          },
          {
            id: 'geo_labels',
            type: 'geometryCOMP',
            x: 9,
            y: 2.7,
            params: { 'Xform:Translate': [0, -0.35, 0], Material: { ref: 'constant1' } },
            note: 'Holds the category labels. Translating the whole COMP down a little parks every label just under the baseline.',
            children: [
              {
                id: 'text1',
                type: 'textPOP',
                x: 0,
                y: 0,
                params: {
                  Mode: 'Specification DAT/CHOP',
                  'Specification DAT': { ref: '../switch1' },
                  'Font Size': 0.32,
                  'Horizontal Align': 'Center',
                  'Vertical Align': 'Top',
                },
                flags: { display: true, render: true },
                note: 'In specification mode every row of the DAT becomes its own text block: the `text` column is the string and the `tx` column moves the block along X. Because it reads the **same table** as the bars, labels and bars can never disagree. (`../` because the table lives one level up.)',
              },
            ],
          },
          {
            id: 'constant1',
            type: 'constantMAT',
            x: 10,
            y: 2.7,
            params: { Color: [0.86, 0.88, 0.92] },
            note: 'Unlit color: what you set is what you see, with no shading to distort the values. Bars replace this color with their instance color; the labels keep it.',
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 10,
            y: 1.6,
            params: {
              'Line Near Color': [0.3, 0.32, 0.37],
              'Width Near': 1,
              'Width Far': 1,
            },
            note: 'Thin, quiet gridlines. Same width near and far so depth never changes their weight. Gridlines are reference marks: they should be the faintest thing on screen.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 10,
            y: -0.6,
            params: {
              'Xform:Translate': [5.5, 2.6, 10],
              Projection: 'Orthographic',
              'Ortho Width': 14,
            },
            note: 'Orthographic: no perspective, so equal values always look equal wherever the bar sits. Centered on the chart (bars run from x = 0 to 11, heights 0 to 6).',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 11,
            y: 0.5,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo_grid geo_bars geo_labels' },
              'Anti-Alias': '4x',
              'Background Color': [0.05, 0.055, 0.07, 1],
            },
            note: 'Renders the three Geometry COMPs. No lights needed — both materials are unlit.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 12,
            y: 0.5,
            inputs: ['render1'],
            note: 'The finished chart image.',
          },
        ],
        boxes: [
          { title: 'data', nodes: ['dataA', 'dataB', 'switch1'], tone: 'pink' },
          { title: 'scales + encodings', nodes: ['dattopop1', 'mathmix1', 'rerange1', 'normalize1', 'lookuptex1', 'ramp1'], tone: 'orange' },
        ],
        comments: [{ x: 0, y: 2.1, w: 2.4, text: 'Both tables are **invented sample data** — replace them with your own.' }],
        steps: [
          {
            title: 'Two small tables and a switch',
            body: `Create a **Table DAT** \`dataA\` and type in the twelve rows shown in the inspector (header \`text tx value\`). Create a second one, \`dataB\`, with the same header and months but different values. These are **made-up sample numbers** — the point is the structure.

Wire both into a **Switch DAT** \`switch1\` and put its *Index* in expression mode: \`int(absTime.seconds / 4) % 2\`. Its output now alternates between the two tables every four seconds.`,
            nodes: ['dataA', 'dataB', 'switch1'],
          },
          {
            title: 'Rows become points',
            body: `Create a **DAT to POP** \`dattopop1\`. On the *Points* page, set *Points DAT* to \`switch1\`, turn on **Convert All Excluding** and type \`text\` into the *Exclude Columns* field next to it.

Middle-click the node: 12 points, with float attributes \`tx\` and \`value\`. There's no \`P\` yet — that's the next step.`,
            nodes: ['dattopop1'],
          },
          {
            title: 'A position for every bar',
            body: `Append a **Math Mix POP** \`mathmix1\`. In the first *Combine* block set *Operation* to **A * B**, *Scope A* to \`1 0 0\` (a constant vector), *Scope B* to \`tx\` and *Result Scope* to \`P\`.

Vector × scalar gives \`P = (tx, 0, 0)\`: the points line up along X, one unit apart.`,
            nodes: ['mathmix1'],
          },
          {
            title: 'Scale value to height',
            body: `Append a **ReRange POP** \`rerange1\`: *Input Attribute Scope* \`value\`, *Map from Low/High* **0 / 100**, *Map to Low/High* **0 / 6**, *Output Attribute Scope* \`h\`.

This is your length scale. Note the domain: 0 to 100, **not** the data's own min and max. Zero cups maps to zero height.`,
            nodes: ['rerange1'],
          },
          {
            title: 'Color from a palette',
            body: `Append a **Normalize POP** \`normalize1\`: *Input Attribute Scope* \`value\`, *Output Attribute Scope* \`u\`.

Create a **Ramp TOP** \`ramp1\`, set *Type* to **Horizontal** and give it a sequential palette in the ramp editor (dark → light, or one hue getting more intense).

Append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`u\`, *Output Attribute Scope* \`Color\`. Each point now has a color.`,
            nodes: ['normalize1', 'ramp1', 'lookuptex1'],
          },
          {
            title: 'Ease every change',
            body: `Append a **Time Filter POP** \`timefilter1\`: turn on *Always Cook*, set *Input Attributes* to \`h Color\`, *Type* **Gaussian**, *Filter Width* **0.6** (seconds).

Finish with a **Null POP** \`barpts\`. Open its viewer and wait for the switch to flip: \`h\` and \`Color\` now drift to their new values instead of jumping.`,
            nodes: ['timefilter1', 'barpts'],
          },
          {
            title: 'Instance the bars',
            body: `Create a **Geometry COMP** \`geo_bars\`. Inside, replace the default contents with a **Box POP** \`box1\`: *Size* **0.7, 1, 0.7**, *Translate* **0, 0.5, 0**; render + display flags on.

Back at the root, create a **Constant MAT** \`constant1\` (a light grey) and assign it on \`geo_bars\` → *Render* → *Material*.

On \`geo_bars\` → *Instance*: turn on **Instancing**, set *Instance Count Mode* to **Instance OP(s) Length**, and drag \`barpts\` onto *Default Instance OP*. Set *Translate X/Y/Z* to \`P(0)\`, \`P(1)\`, \`P(2)\` and *Scale Y* to \`h\` (clear Scale X and Z). On *Instance 2*, set *Color Mode* to **Replace** and *R/G/B* to \`Color(0)\`, \`Color(1)\`, \`Color(2)\`.`,
            nodes: ['geo_bars', 'box1', 'constant1'],
          },
          {
            title: 'Orthographic camera and render',
            body: `Create a **Camera COMP** \`cam1\`: *Translate* **5.5, 2.6, 10**; on the *View* page set *Projection* to **Orthographic** and *Ortho Width* to **14**.

Create a **Render TOP** \`render1\` with *Camera(s)* \`cam1\` and *Geometry* \`geo_bars\` for now, *Anti-Alias* **4x** and a near-black background. End with a **Null TOP** \`out1\`. Your bars are on screen, breathing between the two datasets.`,
            nodes: ['cam1', 'render1', 'out1'],
          },
          {
            title: 'Gridlines',
            body: `Create a Geometry COMP \`geo_grid\` holding a **Grid POP** \`grid1\`: *Connectivity* **Line Strips**, *Size* **12.4, 6**, *Columns* **2**, *Rows* **5**, *Translate* **5.5, 3, -0.2**. In the *Line X/Y/Z* toggles keep only **X** on, so you get horizontal rules only.

Create a **Line MAT** \`linemat1\` with a dim *Line Near Color* and *Width Near*/*Width Far* both **1**, and assign it to \`geo_grid\`. Add \`geo_grid\` to the Render TOP's *Geometry* field.`,
            nodes: ['geo_grid', 'grid1', 'linemat1'],
          },
          {
            title: 'Category labels',
            body: `Create a Geometry COMP \`geo_labels\` (*Translate* **0, -0.35, 0**, *Material* \`constant1\`) holding a **Text POP** \`text1\`: *Mode* **Specification DAT/CHOP**, *Specification DAT* \`../switch1\`, *Font Size* **0.32**, *Horizontal Align* **Center**, *Vertical Align* **Top**.

Add \`geo_labels\` to the Render TOP. Each month name now sits under its bar — placed by the very same \`tx\` column that placed the bar.`,
            nodes: ['geo_labels', 'text1'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why the network is shaped like this

Read the top row as a sentence: *take the rows, give them positions, scale the values, color them, smooth them, draw a bar for each*. Each POP adds exactly one attribute, and nothing is computed twice. That's the same pipeline a web charting library runs — data, scales, encodings, marks — just expressed as operators.

**Points are the data, the box is the mark.** The 12 points never get rendered themselves. They're a table living on the GPU, and instancing stamps the box onto each one, reading \`P\`, \`h\` and \`Color\` per copy. You could stamp a cylinder, a sphere or a stack of discs instead without touching the data side. If you ever need to *deform* the bars after placing them — bevel them, add noise, cut them — switch to a [[Copy POP]], which produces real geometry you can keep processing. For plain bars, instancing is lighter.

**One table drives bars *and* labels.** The \`tx\` column is used twice: the DAT to POP turns it into the bar's X position, and the [[Text POP]] uses a column called \`tx\` to move each text block. Because both read \`switch1\`, adding a thirteenth row adds a thirteenth bar *and* its label in one go. Any time you find yourself typing the same numbers into two places, look for a way to make one the source of the other.

**The Box POP is anchored at the bottom.** A box centered on its point grows up *and* down when scaled. Lifting it by half its height (*Translate Y* 0.5 on a box of height 1) puts its bottom face on the point, so instance *Scale Y* grows it upward from the baseline — the same trick you'd use for any "grows from the floor" instance.

## Smoothing: where and how

The [[Time Filter POP]] keeps a short history of each attribute and outputs a weighted average over the last *Filter Width* seconds. When \`h\` jumps from 4.6 to 5.5, the output slides between them over roughly that window. Three details matter:

* **Filter late, not early.** Smoothing \`value\` before the scales would work too, but filtering \`h\` and \`Color\` means you're smoothing exactly what the viewer sees. If you later swap the length scale for a log scale, the motion still looks right.
* **It needs to keep cooking.** A filter only catches up if it gets frames to do it. *Always Cook* makes sure it keeps cooking on frames where nothing upstream changed.
* **Points are matched by index.** Row 3 this frame is assumed to be row 3 last frame. That's true here because both tables list the months in the same order. If your rows can be added, removed or re-sorted, give each row a stable id column and turn on *Match by Attribute* so each bar follows its own row.

Want a little life in the motion? The *Lag* page offers lag with overshoot. Use it sparingly: overshoot means the bar briefly shows a value that isn't in the data.
`,
    },
    {
      kind: 'compare',
      left: {
        title: 'ReRange POP — a fixed scale',
        md: 'You choose the domain (0–100) and the range (0–6). The same value always gets the same height, across datasets and over time. **Use it for anything the viewer compares**: lengths, positions, sizes.',
      },
      right: {
        title: 'Normalize POP — a data-driven scale',
        md: 'The data chooses: its own minimum and maximum become 0 and 1. Great for spending a whole palette on whatever is present. **Don\'t use it for bar length** — the smallest bar would always vanish.',
      },
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Honest axes',
      md: `* **Bars start at zero.** Never let the length scale's domain start at the data minimum.
* **Keep the domain fixed** while data animates. If the scale re-fits itself every time the data changes, bars stay the same height while the numbers change — the motion lies.
* **Pick round domain ends** (0–100, not 0–92) so gridlines land on readable values.
* **Perspective distorts length.** Seen through a perspective camera, a bar further from the lens looks shorter. That's why this chart uses an orthographic camera.`,
    },
    {
      kind: 'md',
      md: `
## Loading real data

Typing rows is fine for a demo, but real data comes from files:

* **CSV files:** the [[Table DAT]] itself can load comma-separated (\`.csv\`) and tab-separated (\`.tsv\`) files through its *File* parameter — or just drag the file into the network. The [[File In DAT]] is meant for text and \`.dat\` table files and treats other files as plain or tab-delimited text, so for CSVs the Table DAT is the more direct route.
* **Header row:** the first row must hold the attribute names the DAT to POP should create. If your file says \`Average cups/day\`, rename the column to \`value\` (in the file, or with DATs downstream) — attribute names are letters and digits only.
* **Many columns:** *Convert All Excluding* turns every column into an attribute except the ones you list. For finer control — renaming, choosing types, grouping three columns into one vector — add blocks under *New Attribute* on the same page.
* **Check the result:** a [[POP to DAT]] on \`barpts\` shows the points as a table again. It downloads from the GPU, so delete it when you're done.

## Labels: Text POP or something else?

The [[Text POP]] makes real geometry from a font — triangles or outlines — so labels live in the 3D scene, get lit or unlit like anything else, and can be transformed per block from a table. In *Specification DAT/CHOP* mode each row is a block with its own string and position; columns named after Text POP parameters (\`tx\`, \`ty\`, \`fontsize\` and others) override them per row. It does most of its work on the CPU, which is fine for a few dozen labels that change occasionally.

For text that's purely 2D — a title, a legend, a caption — compositing a [[Text TOP]] over the render is often simpler and sharper. The [[Geo Text COMP]] is another option: it draws text in the 3D scene directly as textured quads rather than converting it to POP geometry.
`,
    },
    {
      kind: 'callout',
      tone: 'perf',
      title: 'Where the cost is',
      md: 'Almost nowhere. The DAT to POP only re-cooks when the table changes; uploading a few rows to the GPU is trivial. The Text POP is the most expensive node here (CPU work), and only when the table changes. Instancing draws all copies of the box in one batch, so the same network handles 12 bars or 12 000 points of data without breaking a sweat.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Swap the box for a [[Sphere POP]] stack or a rounded box (*Round Corners* on the Box POP) for a softer feel.
* Tilt the camera a few degrees in X for a hint of depth — keep it orthographic so heights stay comparable.
* Let color carry a *different* variable than height (say, temperature next to sales). Then it adds information instead of repeating it.
* Add a [[Bloom TOP]] after the render — gently. Glow makes bright bars look bigger than they are.`,
    },
    {
      kind: 'challenge',
      title: 'Add a value axis',
      md: 'Gridlines without numbers are decoration. Label the five gridlines `0`, `25`, `50`, `75`, `100` on the left side of the chart, vertically centered on each line.',
      hints: [
        'You need a second spec table: one row per label, with `text`, `tx` and `ty` columns.',
        'The world height of a value is value × 6 / 100 — the same mapping as `rerange1`.',
        'Two Text POPs can be combined inside `geo_labels` with a [[Merge POP]]; move the render flag to the merge.',
      ],
      solution:
        'Create a Table DAT `ticks` with header `text tx ty` and rows `0 -0.9 0.35`, `25 -0.9 1.85`, `50 -0.9 3.35`, `75 -0.9 4.85`, `100 -0.9 6.35` (the extra +0.35 cancels the COMP\'s -0.35 offset). Inside `geo_labels` add a second Text POP `text2` in *Specification DAT/CHOP* mode reading `../ticks`, with *Horizontal Align* **Right** and *Vertical Align* **Center**, then a Merge POP fed by `text1` and `text2` with the render and display flags. If you later change the ReRange domain, update the `ty` column — or compute it with an expression so it can\'t drift.',
    },
    {
      kind: 'challenge',
      title: 'Highlight one month',
      md: 'Make July stand out in a warm accent color while every other bar stays on the palette — and keep the highlight smooth when the data switches.',
      hints: [
        'The built-in `_PointI` is each point\'s row index; July is row 6.',
        'Math Mix can compare (`A == B`) and blend (`mix(A, B, C)`).',
        'Where in the chain should this go so the Time Filter still smooths it?',
      ],
      solution:
        'Insert a Math Mix POP between `lookuptex1` and `timefilter1`. Block 0: **A == B**, *Scope A* `_PointI`, *Scope B* `6`, *Result Scope* `hl`. Block 1: **mix(A, B, C)**, *Scope A* `Color`, *Scope B* `1 0.65 0.2 1`, *Scope C* `hl`, *Result Scope* `Color`. Because it sits before the Time Filter, the colour change eases like everything else. Better still, add a `highlight` column (0/1) to the table so the choice lives in the data.',
    },
    {
      kind: 'challenge',
      title: 'Both years at once',
      md: 'Instead of morphing between the two datasets, show them side by side: two thinner bars per month, one per year, in two clearly different colors.',
      hints: [
        'You need two point sets — one per table — merged into one instance source.',
        'Offset one set by a fraction of a slot in X, and make the box narrower.',
        'With two series, a fixed color per series is clearer than a ramp.',
      ],
      solution:
        'Branch the data side: `dattopop1` reads `dataA`, a second DAT to POP reads `dataB`. Give each its own Math Mix building `P`, then shift them with a second block (**A + B**, *Scope A* `P`, *Scope B* `-0.18 0 0` for year A, `0.18 0 0` for year B). Set `Color` per branch with an [[Attribute POP]] (*Name* Color, a different *Value* each), ReRange both to `h`, then [[Merge POP]] the branches into `barpts`. Set the box *Size* to 0.32, 1, 0.7. Add a small legend (two Text POP lines in matching colors) so viewers know which is which.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'How should a table look for the DAT to POP to build a `float3` attribute `P`?',
          options: [
            'One column named `P` containing "x y z"',
            'Three columns headed `P(0)`, `P(1)`, `P(2)`',
            'Three columns headed `x`, `y`, `z`',
            'It can only create scalar attributes',
          ],
          answer: 1,
          explain: 'Vector attributes are written one column per component using POP notation, exactly as a POP to DAT would output them.',
        },
        {
          q: 'Why use a ReRange POP with a fixed 0–100 domain for bar height instead of a Normalize POP?',
          options: [
            'ReRange is faster on the GPU',
            'Normalize only works on `P`',
            'Normalize maps the current minimum to 0, so the smallest bar would always vanish and heights wouldn\'t be comparable',
            'ReRange is the only POP that can create new attributes',
          ],
          answer: 2,
          explain: 'A bar\'s length must be proportional to its value with a zero baseline. A data-driven min–max normalization breaks both properties.',
        },
        {
          q: 'The Box POP has height 1 and *Translate Y* 0.5. What does that achieve?',
          options: [
            'It centers the box on the point',
            'It puts the box\'s bottom on the point, so instance Scale Y grows the bar upward from the baseline',
            'It doubles the bar height',
            'It prevents the box from being instanced',
          ],
          answer: 1,
          explain: 'Instance scale happens around the instance origin. With the box spanning y = 0..1, scaling in Y stretches it upward only.',
        },
        {
          q: 'Your rows sometimes arrive in a different order. What keeps the Time Filter POP smoothing each bar correctly?',
          options: [
            'Increase *Filter Width*',
            'Switch *Type* to One Euro',
            'Add a stable id column and turn on *Match by Attribute*',
            'Put the Time Filter before the DAT to POP',
          ],
          answer: 2,
          explain: 'By default points are matched by index. Matching by an id attribute lets each point follow its own history even when order or count changes.',
        },
        {
          q: 'Why is the camera orthographic?',
          options: [
            'Orthographic cameras render faster',
            'Text POP labels only work with orthographic cameras',
            'Without perspective, equal values look equally long wherever they are in the frame',
            'Instancing requires it',
          ],
          answer: 2,
          explain: 'Perspective shrinks things with distance, which distorts length — the encoding the whole chart depends on.',
        },
      ],
    },
  ],
};

export default lesson;
