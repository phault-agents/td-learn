import type { Lesson } from '../types';

const lesson: Lesson = {
  slug: 'dataviz-globe',
  title: 'Geo Data on a Globe',
  subtitle: 'Latitude and longitude to XYZ, spikes along the normal, and a live earthquake feed refreshed every minute.',
  minutes: 50,
  summary:
    'Convert latitude/longitude to positions on a sphere with a [[Math Mix POP]], build a graticule globe from a [[Sphere POP]], and instance spikes oriented along each point\'s normal. Start from a small sample table, then swap in the live USGS earthquake GeoJSON feed fetched with the [[Web Client DAT]], parsed with [[JSON DAT]] filters and refreshed by a [[Timer CHOP]].',
  objectives: [
    'Convert latitude/longitude to XYZ on a Y-up sphere with Math Mix trig blocks — and explain the axis conventions',
    'Build a readable globe: graticule lines, an occluding core, and spikes instanced along the normal',
    'Fetch a web API with the [[Web Client DAT]] and refresh it on a schedule',
    'Use JSONPath filters in the [[JSON DAT]] to turn GeoJSON into a table the [[DAT to POP]] can read',
    'Recognise the distortions a 3D globe introduces and when a flat map is the better choice',
  ],
  requires: ['dataviz-tables', 'instancing'],
  tags: ['data viz', 'geo', 'globe', 'json', 'web client', 'instancing', 'live data'],
  blocks: [
    {
      kind: 'md',
      md: `
A globe is the most recognisable data visualization there is. Put a few hundred points on one and people immediately read *where* — the Pacific ring, a mid-ocean ridge, a cluster off the coast they live on. It's also a projection with real costs: half the data is always hidden, and things near the edge are squashed. Used well, it gives context and a sense of scale; used carelessly, it just spins.

You'll build the globe in two passes. First with a **small sample table** you type in yourself, so you can check every step by eye. Then you'll swap the table for the **live USGS earthquake feed**, refreshed every minute — with nothing downstream changing.

## From two angles to a point

Every location on Earth is two angles. **Latitude** is how far north (+) or south (−) of the equator you are, from −90° to 90°. **Longitude** is how far east (+) or west (−) of the Greenwich meridian, from −180° to 180°. To place a point on a sphere you need to turn those angles into X, Y and Z — and that's where conventions bite.

TouchDesigner is **Y-up**, and a default camera sits on **+Z looking toward −Z**. So we choose:

| | Formula | Why |
|---|---|---|
| \`y\` | \`sin(lat)\` | the north pole is at +Y, straight up |
| \`x\` | \`cos(lat) · sin(lon)\` | east is to the right on screen |
| \`z\` | \`cos(lat) · cos(lon)\` | longitude 0 faces the camera |

\`cos(lat)\` is the radius of the latitude circle you're on — 1 at the equator, 0 at the poles — which is why it multiplies both \`x\` and \`z\`. The result is a **unit vector**: it's both the position on a sphere of radius 1 *and* the outward normal at that position. We'll use it twice.
`,
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'The three classic globe bugs',
      md: `* **Z-up formulas.** Most textbooks put the pole on Z (\`z = sin(lat)\`). In TouchDesigner that lays the globe on its side.
* **Swapped sin/cos on longitude.** Your data lands mirrored or rotated by 90°: Japan in the Atlantic.
* **Lat/lon order.** Humans say "lat, lon". **GeoJSON stores \`[lon, lat]\`**, and so do many APIs. Always check one known point.

That's why the sample table below includes a row at lat 0, lon 0 — "Null Island" in the Gulf of Guinea. With these formulas it must land dead centre, facing the camera.`,
    },
    {
      kind: 'md',
      md: `
## Degrees in, no conversion needed

Math Mix's trigonometry blocks read their angles in the units set by **Angle Units** on its *Inputs* page — **degrees** unless you change it. Latitude and longitude are already in degrees, so they go straight into \`sin(A)\` and \`cos(A)\`. If your data were in radians, you'd switch *Angle Units* to *Radians* — not add a \`radians(A)\` block as well. Converting twice is a silent, very confusing bug.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'globe-sample',
        title: 'Globe from a sample table',
        root: '/project1',
        height: 620,
        caption:
          'Top row: table → points → lat/lon math → spike length and color → instance data. Below: three Geometry COMPs (graticule, solid core, instanced spikes), their materials, camera and render. All three COMPs spin with the same expression so they stay aligned.',
        nodes: [
          {
            id: 'quakes',
            type: 'tableDAT',
            x: 0,
            y: 0,
            table: [
              ['place', 'lat', 'lon', 'mag'],
              ['Null Island', '0', '0', '2.0'],
              ['Tokyo', '35.7', '139.7', '6.1'],
              ['Anchorage', '61.2', '-149.9', '5.4'],
              ['Santiago', '-33.4', '-70.7', '6.8'],
              ['Reykjavik', '64.1', '-21.9', '3.2'],
              ['Wellington', '-41.3', '174.8', '4.7'],
              ['Jakarta', '-6.2', '106.8', '5.9'],
              ['Mexico City', '19.4', '-99.1', '7.1'],
              ['Istanbul', '41.0', '29.0', '4.4'],
              ['Lima', '-12.0', '-77.0', '6.3'],
              ['Kathmandu', '27.7', '85.3', '5.0'],
              ['Los Angeles', '34.1', '-118.2', '3.9'],
            ],
            note: '**Sample values.** The coordinates are rough positions of real cities, so you can check the globe\'s orientation. The **magnitudes are invented** — these are not real events. The first row is the 0°, 0° orientation check.',
          },
          {
            id: 'dattopop1',
            type: 'dattoPOP',
            x: 1,
            y: 0,
            params: { 'Points DAT': { ref: 'quakes' }, 'Points:Convert All Excluding': true },
            note: 'One point per row with float attributes `lat`, `lon`, `mag`. Put `place` in *Exclude Columns* — it\'s text.',
          },
          {
            id: 'mathmix1',
            type: 'mathmixPOP',
            x: 2,
            y: 0,
            inputs: ['dattopop1'],
            params: {
              'Operation[0]': 'cos(A)',
              'Scope A[0]': 'lat',
              'Result Scope[0]': 'coslat',
              'Operation[1]': 'sin(A)',
              'Scope A[1]': 'lat',
              'Result Scope[1]': 'sinlat',
              'Operation[2]': 'sin(A)',
              'Scope A[2]': 'lon',
              'Result Scope[2]': 'sinlon',
              'Operation[3]': 'cos(A)',
              'Scope A[3]': 'lon',
              'Result Scope[3]': 'coslon',
              'Operation[4]': 'A * B',
              'Scope A[4]': 'sinlon',
              'Scope B[4]': 'coslat',
              'Result Scope[4]': 'nx',
              'Operation[5]': 'A * B',
              'Scope A[5]': 'coslon',
              'Scope B[5]': 'coslat',
              'Result Scope[5]': 'nz',
              'Operation[6]': 'A',
              'Scope A[6]': 'nx sinlat nz',
              'Result Scope[6]': 'N',
              'Operation[7]': 'A',
              'Scope A[7]': 'N',
              'Result Scope[7]': 'P',
            },
            note: 'Eight small blocks: four trig values, two products, then `N = (nx, sinlat, nz)` — three scalars listed in one scope form a vector — and finally `P = N`, because on a radius-1 sphere the position *is* the unit normal. Angle Units stays on Degrees. Middle-click to read the pseudo-code.',
          },
          {
            id: 'rerange1',
            type: 'rerangePOP',
            x: 3,
            y: 0,
            inputs: ['mathmix1'],
            params: {
              'Input Attribute Scope': 'mag',
              'Map from Low': 0,
              'Map from High': 8,
              'Map to Low': 0,
              'Map to High': 1,
              'Output Attribute Scope': 'h',
            },
            note: 'A fixed scale: magnitude 0–8 → `h` 0–1. `h` drives both spike length and color. Values above 8 simply overshoot, which is fine — they\'re rare and *should* stand out.',
          },
          {
            id: 'ramp1',
            type: 'rampTOP',
            x: 3,
            y: 1.2,
            params: { Type: 'Horizontal' },
            note: 'A sequential palette, e.g. pale yellow → orange → deep red. Light-to-dark ramps read as "more" without needing a legend explanation.',
          },
          {
            id: 'lookuptex1',
            type: 'lookuptexturePOP',
            x: 4,
            y: 0,
            inputs: ['rerange1'],
            params: { TOP: { ref: 'ramp1' }, 'Lookup Index Attribute U': 'h', 'Output Attribute Scope': 'Color' },
            note: 'Color from the same `h` as the length — a redundant encoding that makes big events pop.',
          },
          {
            id: 'quakepts',
            type: 'nullPOP',
            x: 5,
            y: 0,
            inputs: ['lookuptex1'],
            note: 'The instance source: one point per event with `P`, `N`, `h` and `Color`.',
          },
          {
            id: 'geo_globe',
            type: 'geometryCOMP',
            x: 1,
            y: 2.4,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 5' }, 0],
              Material: { ref: '../linemat1' },
            },
            note: 'The graticule (latitude/longitude lines), drawn by the Line MAT. Spins slowly; the other two COMPs use the identical expression.',
            children: [
              {
                id: 'sphere1',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: {
                  Type: 'Grid',
                  'Grid Connectivity': 'Rows and Columns',
                  Orientation: 'Y Axis',
                  Radius: [1, 1, 1],
                  Rows: 13,
                  Columns: 24,
                },
                flags: { display: true, render: true },
                note: 'A grid sphere whose rows and columns are connected as lines: rows become latitude circles, columns become meridians. *Orientation* Y puts the poles where our math puts them. Try 13 rows × 24 columns for lines roughly every 15°.',
              },
            ],
          },
          {
            id: 'geo_core',
            type: 'geometryCOMP',
            x: 2,
            y: 2.4,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 5' }, 0],
              Material: { ref: '../constant1' },
            },
            note: 'A solid, dark sphere just inside the graticule. It hides the far side, so you never read a spike on the back as if it were on the front.',
            children: [
              {
                id: 'sphere2',
                type: 'spherePOP',
                x: 0,
                y: 0,
                params: { Type: 'Geodesic', 'Geodesic Connectivity': 'Triangles', Frequency: 24, Radius: [0.985, 0.985, 0.985] },
                flags: { display: true, render: true },
                note: 'Slightly smaller than radius 1 so the graticule lines and spike bases draw on top of it.',
              },
            ],
          },
          {
            id: 'geo_spikes',
            type: 'geometryCOMP',
            x: 3,
            y: 2.4,
            params: {
              'Xform:Rotate': [0, { expr: 'absTime.seconds * 5' }, 0],
              Instancing: true,
              'Instance Count Mode': 'Instance OP(s) Length',
              'Default Instance OP': { ref: '../quakepts' },
              'Translate X': 'P(0)',
              'Translate Y': 'P(1)',
              'Translate Z': 'P(2)',
              'Scale Y': 'h',
              'Rotate to Vector: Forward Direction': '+Y',
              'Rotate to Vector X': 'N(0)',
              'Rotate to Vector Y': 'N(1)',
              'Rotate to Vector Z': 'N(2)',
              'Color Mode': 'Replace',
              R: 'Color(0)',
              G: 'Color(1)',
              B: 'Color(2)',
              Material: { ref: '../constant1' },
            },
            note: 'One thin box per event. *Instance*: position from `P`, length from `h`. *Instance 2*: **Rotate to Vector** turns each copy so its +Y axis points along `N` — straight out of the globe — and color comes from `Color`.',
            children: [
              {
                id: 'box1',
                type: 'boxPOP',
                x: 0,
                y: 0,
                params: { Size: [0.015, 0.5, 0.015], Translate: [0, 0.25, 0] },
                flags: { display: true, render: true },
                note: 'A needle 0.5 long whose base sits at its origin (lifted by half its length). After Rotate to Vector, the base touches the surface and the spike grows outward.',
              },
            ],
          },
          {
            id: 'linemat1',
            type: 'lineMAT',
            x: 1,
            y: 3.5,
            params: { 'Line Near Color': [0.32, 0.4, 0.52], 'Width Near': 1.2, 'Width Far': 1.2 },
            note: 'Quiet blue-grey graticule. It\'s a reference grid: present, never loud.',
          },
          {
            id: 'constant1',
            type: 'constantMAT',
            x: 2,
            y: 3.5,
            params: { Color: [0.06, 0.07, 0.09] },
            note: 'Near-black for the core. The spikes use it too, but their *Color Mode* Replace swaps in each instance\'s own color.',
          },
          {
            id: 'cam1',
            type: 'cameraCOMP',
            x: 4,
            y: 1.2,
            params: { 'Xform:Translate': [0, 0, 3.4] },
            note: 'A perspective camera is fine here: the globe is a 3D object and nobody compares spike lengths to the millimetre. (See the flat-map challenge for when you should.)',
          },
          {
            id: 'render1',
            type: 'renderTOP',
            x: 5,
            y: 1.2,
            params: {
              'Camera(s)': { ref: 'cam1' },
              Geometry: { ref: 'geo_core geo_globe geo_spikes' },
              'Anti-Alias': '4x',
              'Background Color': [0.02, 0.025, 0.035, 1],
            },
            note: 'All three COMPs, no lights needed — every material here is unlit.',
          },
          {
            id: 'out1',
            type: 'nullTOP',
            x: 6,
            y: 1.2,
            inputs: ['render1'],
            note: 'The finished globe.',
          },
        ],
        boxes: [{ title: 'data → instance attributes', nodes: ['quakes', 'dattopop1', 'mathmix1', 'rerange1', 'lookuptex1', 'quakepts', 'ramp1'], tone: 'orange' }],
        steps: [
          {
            title: 'A sample table',
            body: `Create a **Table DAT** \`quakes\` with the header \`place lat lon mag\` and the rows shown. The cities give you known positions to check against; the **magnitudes are made up**. Keep the "Null Island" row at 0, 0 — it's your orientation test.`,
            nodes: ['quakes'],
          },
          {
            title: 'Rows to points',
            body: `Create a **DAT to POP** \`dattopop1\` reading \`quakes\`. Turn on *Convert All Excluding* and type \`place\` into *Exclude Columns*. Middle-click: 12 points with \`lat\`, \`lon\` and \`mag\`.`,
            nodes: ['dattopop1'],
          },
          {
            title: 'Latitude and longitude to XYZ',
            body: `Append a **Math Mix POP** \`mathmix1\` and add eight *Combine* blocks:

| # | Operation | Scope A | Scope B | Result Scope |
|---|---|---|---|---|
| 0 | cos(A) | \`lat\` | | \`coslat\` |
| 1 | sin(A) | \`lat\` | | \`sinlat\` |
| 2 | sin(A) | \`lon\` | | \`sinlon\` |
| 3 | cos(A) | \`lon\` | | \`coslon\` |
| 4 | A * B | \`sinlon\` | \`coslat\` | \`nx\` |
| 5 | A * B | \`coslon\` | \`coslat\` | \`nz\` |
| 6 | A | \`nx sinlat nz\` | | \`N\` |
| 7 | A | \`N\` | | \`P\` |

Leave *Angle Units* on **Degrees**. The points now sit on a unit sphere.`,
            nodes: ['mathmix1'],
          },
          {
            title: 'A graticule',
            body: `Create a **Geometry COMP** \`geo_globe\` holding a **Sphere POP** \`sphere1\`: *Type* **Grid**, *Grid Connectivity* **Rows and Columns**, *Orientation* **Y Axis**, *Radius* **1**, *Rows* **13**, *Columns* **24**.

Create a **Line MAT** \`linemat1\` (dim blue-grey, *Width Near/Far* **1.2**) and assign it to \`geo_globe\` — the *Material* field reads \`../linemat1\`, since a COMP's parameters resolve paths from inside the COMP.`,
            nodes: ['geo_globe', 'sphere1', 'linemat1'],
          },
          {
            title: 'A solid core',
            body: `Create \`geo_core\` holding \`sphere2\`: a **Geodesic** Sphere POP with **Triangles**, *Frequency* **24** and *Radius* **0.985**. Create a **Constant MAT** \`constant1\` (near-black) and assign it to \`geo_core\`.`,
            nodes: ['geo_core', 'sphere2', 'constant1'],
          },
          {
            title: 'Camera and render',
            body: `Create a **Camera COMP** \`cam1\` at **0, 0, 3.4**, a **Render TOP** \`render1\` with *Geometry* \`geo_core geo_globe\` (anti-aliased, near-black background), and a **Null TOP** \`out1\`.

You should see a dark globe with a fine grid, poles at top and bottom.`,
            nodes: ['cam1', 'render1', 'out1'],
          },
          {
            title: 'Encode magnitude',
            body: `Back on the data row, append a **ReRange POP** \`rerange1\`: \`mag\` from **0–8** to **0–1** into \`h\`.

Create a **Ramp TOP** \`ramp1\` (*Type* **Horizontal**, a sequential light → dark palette) and append a **Lookup Texture POP** \`lookuptex1\`: *TOP* \`ramp1\`, *Lookup Index Attribute U* \`h\`, *Output Attribute Scope* \`Color\`.`,
            nodes: ['rerange1', 'ramp1', 'lookuptex1'],
          },
          {
            title: 'Spikes along the normal',
            body: `Append a **Null POP** \`quakepts\` to the data row. Then create a Geometry COMP \`geo_spikes\` holding a **Box POP** \`box1\`: *Size* **0.015, 0.5, 0.015**, *Translate* **0, 0.25, 0**. *Material*: \`../constant1\`.

*Instance* page: **Instancing** on, *Instance Count Mode* **Instance OP(s) Length**, *Default Instance OP* \`../quakepts\`, *Translate X/Y/Z* \`P(0)\` \`P(1)\` \`P(2)\`, *Scale Y* \`h\`.

*Instance 2* page: *Rotate to Vector: Forward Direction* **+Y**, *Rotate to Vector X/Y/Z* \`N(0)\` \`N(1)\` \`N(2)\`, *Color Mode* **Replace**, *R/G/B* \`Color(0)\` \`Color(1)\` \`Color(2)\`.`,
            nodes: ['quakepts', 'geo_spikes', 'box1'],
          },
          {
            title: 'Check the orientation',
            body: `Add \`geo_spikes\` to the Render TOP's *Geometry*. Before anything spins, check:

* the spike at **0, 0** is dead centre, pointing straight at you (so it looks like a dot);
* **Istanbul** is right of centre and up (east and north), **Reykjavik** near the top, slightly left;
* **Santiago** and **Lima** are on the left, below the equator; **Kathmandu** is near the right edge.

Tokyo, Jakarta, Wellington, Anchorage and Los Angeles are on the far side for now — the spin in the next step brings them round. If something is mirrored, look at blocks 2–5 first.`,
            focus: ['render1', 'geo_spikes'],
          },
          {
            title: 'A slow spin',
            body: `On \`geo_globe\`, \`geo_core\` and \`geo_spikes\`, set *Xform → Rotate Y* to the expression \`absTime.seconds * 5\`. The same expression on all three keeps the grid, core and spikes locked together.`,
            focus: ['geo_globe', 'geo_core', 'geo_spikes'],
          },
        ],
      },
    },
    {
      kind: 'md',
      md: `
## Why the spikes point the right way

Instancing gives every copy of the box a translate, a scale and a rotation. Working out Euler angles from latitude and longitude is possible but fiddly. **Rotate to Vector** skips it: you give it a direction per instance (\`N\`) and say which axis of the model should point along it (*Forward Direction* **+Y**, because our needle is built along Y). The Geometry COMP computes the rotation for you.

Two details make it land exactly on the surface:

* The needle's **base is at its origin** (*Translate Y* = half its length), so after rotation it starts at the instance position and grows outward. A centered box would poke halfway into the globe.
* *Scale Y* stretches along the needle's own axis *before* it's rotated, so \`h\` always means "length along the normal", wherever the point is.

## Reading a globe honestly

A spike on a globe is a length seen at an angle. Spikes near the rim are foreshortened, spikes on the back are hidden by the core, and the eye overweights whatever is near the centre. That's acceptable for **where** questions — "where are earthquakes happening today?" — and poor for **how much** questions — "was the Chilean one bigger than the Japanese one?". For the second kind, give viewers a flat map with an orthographic camera, a ranked list, or a bar chart next to the globe.

There's a second subtlety in this dataset: **magnitude is logarithmic**. Each step of 1 corresponds to roughly 32 times more energy released. A linear spike length on magnitude is a reasonable, conventional choice — it matches how people talk about earthquakes — but it hides how much bigger the big ones really are. Say so in a caption instead of pretending otherwise.

## Points, not a texture

Notice there's no Earth image anywhere. Coastlines would help orientation, and you can add them (a world map texture on the core sphere, or coastline line data converted to points with the same lat/lon math). But a graticule plus the data's own shape is often enough: earthquakes draw the plate boundaries by themselves. Fewer layers mean the data stays the brightest thing on screen.

If you do add an equirectangular map texture, the sphere's texture coordinates and your lat/lon math must agree on where longitude 0 is. For a quick sanity check of directions in POPs, the [[Normalize POP]] uses the same orientation as our formulas when it converts positions to longitude: the "front" (0.5 of its 0–1 longitude range) faces +Z.
`,
    },
    {
      kind: 'md',
      md: `
## Going live: the USGS earthquake feed

The U.S. Geological Survey publishes free, continuously updated earthquake summaries as GeoJSON. This one lists every event of the past day:

\`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson\`

Its shape (trimmed) looks like this — note the coordinate order:
`,
    },
    {
      kind: 'code',
      lang: 'json',
      title: 'all_day.geojson (structure, abridged)',
      code: `{
  "type": "FeatureCollection",
  "metadata": { "title": "USGS All Earthquakes, Past Day", "count": 250 },
  "features": [
    {
      "type": "Feature",
      "properties": { "mag": 4.6, "place": "...", "time": 1700000000000 },
      "geometry": { "type": "Point", "coordinates": [ -70.7, -33.4, 10.0 ] },
      "id": "..."
    }
  ]
}`,
    },
    {
      kind: 'md',
      md: `
Each event is a *feature*; its magnitude is under \`properties.mag\`, and its position under \`geometry.coordinates\` as **\`[longitude, latitude, depth in km]\`**. (The numbers above are illustrative.)

The plan: the [[Web Client DAT]] downloads the text, three [[JSON DAT]]s each pull out one list with a **JSONPath** filter, a [[Merge DAT]] puts the three lists side by side, and an [[Insert DAT]] adds the header row the DAT to POP needs. A [[Switch DAT]] chooses between the sample table and the live one, so the globe keeps working offline.

JSONPath reads like a path through the JSON: \`$\` is the root, \`.features\` steps into a key, \`[*]\` means "every element", \`[0]\` picks one element. So \`$.features[*].geometry.coordinates[1]\` is *the latitude of every feature*. With *Output Format* set to **Table**, a list of plain values comes out as a single column.
`,
    },
    {
      kind: 'graph',
      graph: {
        id: 'globe-live',
        title: 'Live feed → table',
        root: '/project1',
        height: 520,
        caption:
          'The timer re-requests the feed every 60 seconds. Three JSON DATs each extract one column; merged and given a header, they feed the same DAT to POP as before through a Switch DAT. Everything right of `dattopop1` is the network you already built.',
        nodes: [
          {
            id: 'timer1',
            type: 'timerCHOP',
            x: 0,
            y: 0,
            params: { 'Timer:Length': 60, 'Length Units': 'S', 'On Done': 'Re-Start', 'Callbacks DAT': { ref: 'timer1_callbacks' } },
            note: 'A 60-second timer that restarts itself when done. Pulse *Start* once to set it running. The USGS summary feeds update about once a minute, so polling faster gains nothing.',
          },
          {
            id: 'timer1_callbacks',
            type: 'textDAT',
            x: 0,
            y: 1.1,
            code: {
              lang: 'python',
              text: `# timer1_callbacks - the Timer CHOP's callbacks DAT.
# TouchDesigner fills it with empty callback functions when you create
# the Timer CHOP. Only onDone needs a body: each time the timer finishes
# (and, with On Done set to Re-Start, starts over) we ask for fresh data.
# If your generated onDone stub has a different argument list, keep
# TouchDesigner's version and just paste the body line.

def onDone(timerOp, segment, interrupt):
    op('webclient1').par.request.pulse()
    return
`,
            },
            note: 'The Timer CHOP\'s callbacks DAT. One added line in `onDone` pulses the Web Client DAT\'s *Request* parameter each time the timer completes.',
          },
          {
            id: 'webclient1',
            type: 'webclientDAT',
            x: 1,
            y: 0,
            params: { URL: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson' },
            note: 'Sends a GET request when *Request* is pulsed and outputs the response text. Pulse *Request* once by hand to get data immediately. If it stays empty, check the URL, your network and the Textport for errors.',
          },
          {
            id: 'json_lon',
            type: 'jsonDAT',
            x: 2,
            y: -1,
            inputs: ['webclient1'],
            params: { Filter: '$.features[*].geometry.coordinates[0]', 'Output Format': 'Table', 'Hold Last Non-Empty Results': true },
            note: 'Element 0 of every feature\'s coordinates: **longitude**. One value per row.',
          },
          {
            id: 'json_lat',
            type: 'jsonDAT',
            x: 2,
            y: 0,
            inputs: ['webclient1'],
            params: { Filter: '$.features[*].geometry.coordinates[1]', 'Output Format': 'Table', 'Hold Last Non-Empty Results': true },
            note: 'Element 1: **latitude**. GeoJSON puts it second.',
          },
          {
            id: 'json_mag',
            type: 'jsonDAT',
            x: 2,
            y: 1,
            inputs: ['webclient1'],
            params: { Filter: '$.features[*].properties.mag', 'Output Format': 'Table', 'Hold Last Non-Empty Results': true },
            note: 'Each feature\'s magnitude. *Hold Last Non-Empty Results* keeps the previous data on screen if a request comes back empty.',
          },
          {
            id: 'merge1',
            type: 'mergeDAT',
            x: 3,
            y: 0,
            inputs: ['json_lon', 'json_lat', 'json_mag'],
            params: { How: 'Append Columns' },
            note: 'Puts the three single-column tables side by side: row *n* is feature *n* in all three, because every filter walks the features in the same order.',
          },
          {
            id: 'header',
            type: 'insertDAT',
            x: 4,
            y: 0,
            inputs: ['merge1'],
            params: { Insert: 'One Row', At: 'Before First', Contents: 'lon lat mag' },
            note: 'Adds the header row. These names become the attribute names, so they must match what `mathmix1` and `rerange1` read.',
          },
          {
            id: 'quakes_live',
            type: 'nullDAT',
            x: 5,
            y: 0,
            inputs: ['header'],
            note: 'The live table, ready for the DAT to POP: `lon`, `lat`, `mag`, one row per earthquake.',
          },
          {
            id: 'quakes',
            type: 'tableDAT',
            x: 5,
            y: 1.2,
            note: 'Your sample table from the first network, kept as an offline fallback.',
          },
          {
            id: 'switch1',
            type: 'switchDAT',
            x: 6,
            y: 0.6,
            inputs: ['quakes', 'quakes_live'],
            params: { Index: 1 },
            note: 'Index 0 = sample data, 1 = live. Rehearse with 0, perform with 1 — or switch automatically when the live table is empty.',
          },
          {
            id: 'dattopop1',
            type: 'dattoPOP',
            x: 7,
            y: 0.6,
            params: { 'Points DAT': { ref: 'switch1' }, 'Points:Convert All Excluding': true },
            note: 'The same DAT to POP as before, now reading the switch. Column order doesn\'t matter — attributes are matched by header name. Keep `place` excluded for the sample table.',
          },
        ],
        boxes: [{ title: 'parse', nodes: ['json_lon', 'json_lat', 'json_mag', 'merge1', 'header'], tone: 'pink' }],
        steps: [
          {
            title: 'Fetch the feed',
            body: `Create a **Web Client DAT** \`webclient1\` and paste the USGS URL into *URL*. Pulse **Request**: after a moment the DAT fills with a long line of JSON.`,
            nodes: ['webclient1'],
          },
          {
            title: 'Three JSONPath filters',
            body: `Create three **JSON DAT**s wired from \`webclient1\`: \`json_lon\` with *Filter* \`$.features[*].geometry.coordinates[0]\`, \`json_lat\` with \`...coordinates[1]\`, \`json_mag\` with \`$.features[*].properties.mag\`. Set each *Output Format* to **Table** and turn on *Hold Last Non-Empty Results*.

Each shows one column of numbers, all the same length.`,
            nodes: ['json_lon', 'json_lat', 'json_mag'],
          },
          {
            title: 'One table with a header',
            body: `Wire the three into a **Merge DAT** \`merge1\` (in that order) with *How* **Append Columns**. Append an **Insert DAT** \`header\`: *Insert* **One Row**, *At* **Before First**, *Contents* \`lon lat mag\`. End with a **Null DAT** \`quakes_live\`.`,
            nodes: ['merge1', 'header', 'quakes_live'],
          },
          {
            title: 'Switch the globe to live data',
            body: `Create a **Switch DAT** \`switch1\` with your sample \`quakes\` table in input 0 and \`quakes_live\` in input 1; set *Index* to **1**. Point \`dattopop1\`'s *Points DAT* at \`switch1\`.

The globe now shows the past day's earthquakes — a few hundred spikes tracing the plate boundaries.`,
            nodes: ['quakes', 'switch1', 'dattopop1'],
          },
          {
            title: 'Refresh every minute',
            body: `Create a **Timer CHOP** \`timer1\`: *Length* **60** with *Length Units* **S** (seconds), *On Done* **Re-Start**. Open its callbacks DAT \`timer1_callbacks\` and add \`op('webclient1').par.request.pulse()\` to the body of the existing \`onDone\` function. Pulse the timer's **Start**.

Every minute the feed is re-requested, the tables update, and the spikes follow.`,
            nodes: ['timer1', 'timer1_callbacks'],
          },
        ],
      },
    },
    {
      kind: 'callout',
      tone: 'warning',
      title: 'Live data is messy',
      md: `* **Negative and missing magnitudes.** Very small events can have magnitudes below zero, and occasionally a value is missing. Negative \`h\` flips a spike into the globe. Add a Math Mix block **clamp(A, B, C)** on \`mag\` with \`0\` and \`10\` before the ReRange, or use the feed of M2.5+ events (\`2.5_day.geojson\` in the same folder), which is also less cluttered.
* **Misaligned columns.** The merge assumes all three filters return the same number of rows. If a feature lacked one value, rows would shift. If counts ever differ, rebuild the table in a [[Script DAT]] that walks \`op('webclient1')\`'s JSON feature by feature.
* **Order.** Keep \`lon\` first in your head as well as in the table: GeoJSON is lon, lat.
* **Credit the source.** If you show this publicly, add "Data: U.S. Geological Survey" somewhere on screen.`,
    },
    {
      kind: 'callout',
      tone: 'tip',
      title: 'Debugging JSONPath',
      md: 'Build the path one step at a time. Start with `$.features[0]` (just the first feature) and *Output Format* **Indented** to see its structure, then extend to `$.features[0].geometry.coordinates`, and only then replace `[0]` with `[*]`. The JSON DAT\'s *Output* menu also has an *Expression* mode where `me.result` and `me.results` let you inspect the filtered data with Python.',
    },
    {
      kind: 'callout',
      tone: 'art',
      title: 'Make it yours',
      md: `* Replace needles with **glowing dots** whose size follows magnitude — the [[Line MAT]]'s point drawing on \`quakepts\` with \`PointScale\` from \`h\`.
* Add a slow **pulse** on new events: compare each event's time with now and brighten anything less than an hour old.
* Tilt the axis by 23.4° and light the core from one side for a day/night feel — mood over measurement, so keep the data colors flat.`,
    },
    {
      kind: 'challenge',
      title: 'Flatten it',
      md: 'Make a second view of the same data as a flat **equirectangular** map: longitude → x, latitude → y, spikes pointing toward the camera, rendered with an orthographic camera. Which comparisons become easier?',
      hints: [
        'You can build `P` from `lon` and `lat` with vector constants: `A * B` with `1 0 0` and `lon`, then `A * B + C` with `0 1 0`, `lat` and the previous `P`.',
        'Scale so 360° of longitude spans twice the height of 180° of latitude — e.g. multiply both by 1/90.',
        'For the spike direction, `N` can simply be the constant `0 0 1`.',
      ],
      solution:
        'Branch from `lookuptex1` (so `h` and `Color` come along) into a second Math Mix: block 0 **A * B** (`1 0 0`, `lon`) → `P`; block 1 **A * B + C** (`0 1 0`, `lat`, `P`) → `P`; block 2 **A * B** (`P`, `0.0111`) → `P` (that\'s 1/90, so the map is 4 × 2 units); block 3 **A** (`0 0 1`) → `N`. Instance the same needle from it in a new Geometry COMP and render through an orthographic camera (*Ortho Width* about 4.5). Every event is now visible at once and lengths are directly comparable — at the cost of stretching areas near the poles.',
    },
    {
      kind: 'challenge',
      title: 'Show the depth',
      md: 'Earthquakes happen at very different depths. Use the third coordinate to place each event *inside* the globe instead of on its surface, so deep events sit closer to the centre.',
      hints: [
        'Add a fourth JSON DAT for `coordinates[2]` and a `depth` column.',
        'Earth\'s radius is about 6371 km. Depths are rarely more than ~700 km, so exaggerate if you want it visible.',
        'Scale `P` by a radius factor: `r = 1 - depth / 6371 * k`.',
      ],
      solution:
        'Add `json_depth` with *Filter* `$.features[*].geometry.coordinates[2]`, merge it as a fourth column and extend the header to `lon lat mag depth`. In `mathmix1`, replace block 7 with **A * B + C** (`depth`, `-0.0005`, `1`) → `r`, then **A * B** (`N`, `r`) → `P`. That factor maps 700 km to a radius of 0.65 — exaggerated about 3×, so say so in a caption. Make the core sphere transparent or remove it so the inner points are visible, and shrink the needles to dots.',
    },
    {
      kind: 'challenge',
      title: 'Fade by age',
      md: 'Make the most recent earthquakes bright and older ones dim, so the globe reads as a living record of the past day.',
      hints: [
        '`properties.time` is each event\'s time in milliseconds since 1 January 1970 (UTC).',
        'You don\'t need the wall clock: "recent" can mean "close to the newest event in the feed".',
        'This is a case where a data-driven scale is exactly right — which POP rescales an attribute to 0–1 from the data\'s own range?',
      ],
      solution:
        'Add `json_time` with *Filter* `$.features[*].properties.time` as a fourth merged column and extend the header to `lon lat mag time`. After `lookuptex1`, append a [[Normalize POP]] with *Input Attribute Scope* `time` and *Output Attribute Scope* `recency` (0 = oldest event in the feed, 1 = newest). Then a Math Mix: **A * B + C** (`recency`, `0.75`, `0.25`) → `fade`; **A * B** (`Color.rgb`, `fade`) → `Color.rgb`. Old events keep a quarter of their brightness instead of vanishing. The times are huge numbers stored as 32-bit floats, so they are only precise to a few minutes — plenty for a day-long fade.',
    },
    {
      kind: 'quiz',
      questions: [
        {
          q: 'In a Y-up scene with longitude 0 facing a camera on +Z, which formula gives the Y coordinate of a point on a unit sphere?',
          options: ['`cos(lat) · cos(lon)`', '`sin(lat)`', '`sin(lon)`', '`cos(lat) · sin(lon)`'],
          answer: 1,
          explain: 'Height above the equator depends only on latitude: `sin(lat)`. The cos(lat) factor shrinks the horizontal circle toward the poles.',
        },
        {
          q: 'Your lat/lon data is in degrees. What should Math Mix\'s *Angle Units* be, and do you need `radians(A)` blocks?',
          options: [
            'Radians, plus radians(A) blocks',
            'Degrees, and no conversion blocks',
            'Degrees, plus radians(A) blocks',
            'Cycles, plus radians(A) blocks',
          ],
          answer: 1,
          explain: 'Math Mix\'s trig functions interpret angles in the chosen Angle Units. Degrees in, Degrees set — converting as well would apply the conversion twice.',
        },
        {
          q: 'What order are coordinates stored in GeoJSON?',
          options: ['[latitude, longitude]', '[longitude, latitude, (depth/elevation)]', '[x, y, z] in metres', 'It varies by feature'],
          answer: 1,
          explain: 'GeoJSON is longitude first. Mixing this up is the most common geo-viz bug — always check a known point.',
        },
        {
          q: 'What does *Rotate to Vector* (Forward Direction +Y, vector `N`) do for each instanced needle?',
          options: [
            'Moves it along N',
            'Rotates it so its local +Y axis points along N',
            'Scales it by the length of N',
            'Colors it by N',
          ],
          answer: 1,
          explain: 'It computes the rotation that aligns the chosen model axis with the given vector, so needles point straight out of the globe.',
        },
        {
          q: 'Why is a JSONPath filter like `$.features[*].properties.mag` useful here?',
          options: [
            'It downloads the feed faster',
            'It extracts one value from every feature, giving a clean column without writing a parser',
            'It converts magnitudes to energy',
            'It sorts the earthquakes by size',
          ],
          answer: 1,
          explain: '`[*]` walks every feature and the rest of the path picks one field. With Output Format = Table, the result is a single column ready to merge.',
        },
      ],
    },
  ],
};

export default lesson;
