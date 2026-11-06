import type { OpBlurb } from '../types';

/** Atlas-only blurbs (lowest priority): operators described for the Atlas even if no lesson uses them. */
export const blurbs: Record<string, OpBlurb> = {
  // ---- Generators ----
  boxPOP: {
    what: 'Builds a six-sided box, either with 8 shared corner points or with 24 points so every face is separate (*Unique Points*), output as quads, triangles, point primitives or bare points. Corners can be rounded, and it can add normals, texture coordinates (per face or cube-map style) and color.',
    tip: 'Need more faces to deform? Send it into a [[Subdivide POP]] with *Crease Weight* at 1 to split the faces without rounding the box.',
  },
  circlePOP: {
    what: 'Places points around a circle, ellipse or partial arc and connects them as a line strip, a filled triangle surface, separate lines or point primitives. Normals and tangents can point outward from the center or along the curve.',
    tip: 'Wire any POP into its input and the circle is fitted to that geometry\'s bounding box.',
  },
  curvePOP: {
    what: 'Draws a shaping function in XY: X steps evenly from point to point while Y follows a chain of segments (constant, linear, eases or Bezier), also stored in a `Curve` attribute. It is built to be a lookup table for the [[Lookup Attribute POP]].',
    tip: 'Its *Lookup* page can apply the curve straight to an input POP\'s attribute, which stays exact even where the curve jumps sharply between segments.',
  },
  gridPOP: {
    what: 'Lays out columns and rows of points on a plane (add *Slices* for a 3D lattice), connected as triangles, quads, lines, line strips or point primitives. It passes its column/row/slice counts downstream as Dimensions.',
    tip: 'Set *Random* to 1 to jitter every point inside its own cell: an even but organic scatter where no two points share a cell.',
  },
  patternPOP: {
    what: 'Generates line strips whose X, Y and Z each follow a simple waveform (sine, cosine, triangle, square, eases or random) with control over cycles, phase, bias and output range. Given an input, it instead writes those curves into a new attribute or adds/multiplies them onto an existing one.',
    tip: 'Raise *Parameter Size* to 3 so X, Y and Z each get their own waveform settings.',
  },
  planePOP: {
    what: 'A flat grid of rows and columns in the XY, YZ or ZX plane, connected as triangles, alternating triangles, quads, row/column lines or point primitives. Unlike the [[Grid POP]] it has no slices or random jitter: just a clean 2D surface.',
  },
  pointPOP: {
    what: 'Creates points by hand, one sequential block per point, carrying any attributes you define on its *Setup* page, with or without a `P` attribute. Ideal for single-point POPs that act as constants in a [[Math Mix POP]], or for one-point-per-entry spec lists for the [[Field POP]].',
  },
  pointgeneratorPOP: {
    what: 'Scatters a chosen number of points on the surface or inside the volume of an ideal shape (sphere, box, torus, tube, rectangle, circle or line), either randomly or in an even pattern. It can also add normals and tangents.',
    tip: 'To scatter over real polygon geometry instead of a math shape, use the [[Sprinkle POP]].',
  },
  rectanglePOP: {
    what: 'A four-corner rectangle, optionally with rounded corners, output as a quad, two triangles, a line strip, separate lines or points. In *Fill Camera View* orientation it sizes itself to exactly cover a camera\'s view at a set distance, perfect for background plates.',
  },
  spherePOP: {
    what: 'Makes spheres and ellipsoids, either geodesic (evenly spaced triangles you can refine with *Frequency*) or a latitude/longitude grid of rows and columns. The *Details* page carves out partial spheres, and texture coordinates can be equirectangular or fisheye.',
  },
  sprinklePOP: {
    what: 'Scatters points over the triangles and quads of its input (roughly the same number per primitive, whatever its size) or randomly inside its closed volume. Each new point gets a point primitive by default so it renders immediately.',
    tip: 'Turn off *Create Point Primitives* when you only need positions, for copying or instancing, to save memory.',
  },
  textPOP: {
    what: 'Turns text in any TrueType/OpenType font into real geometry: filled triangles (optionally extruded) or outline line strips. A *Specification DAT* can lay out many independently positioned and styled text blocks in one node.',
    tip: 'Primitives carry `GlyphIndex` and `GlyphId` attributes, so later POPs can treat each character separately.',
  },
  torusPOP: {
    what: 'A ring of rows and columns of points with separate radii for the ring and its cross-section, connected as triangles, quads, row/column lines or point primitives. The *Details* page makes partial rings by limiting the arc angles.',
  },
  tubePOP: {
    what: 'A cylinder of rows and columns with separate bottom and top radii, so it can taper into a cone. Turn on *End Caps* to close it into a solid, or use the *Details* page to cut a partial arc.',
  },

  // ---- Attributes & math ----
  accumulatePOP: {
    what: 'Writes a running total of an attribute through the point, vertex or primitive list into a new attribute: inclusive (each element adds itself) or exclusive (each gets the sum of everything before it).',
  },
  analyzePOP: {
    what: 'Boils an attribute down to statistics (average, centroid, min, max, size, sum, RMS, and the index of the min/max element) and outputs them on a single point that stays on the GPU.',
    tip: 'Wire that point into a [[Math Mix POP]] rather than pulling it into a parameter: staying on the GPU avoids a slow readback to the CPU.',
  },
  attributePOP: {
    what: 'The attribute toolbox: create attributes of any name, type (float, double, int, uint), component count or array length with starting values, build matrix attributes, and rename, duplicate or delete existing ones.',
    tip: 'This is also where you give an attribute a qualifier such as Color, Direction or Quaternion.',
  },
  attributecombinePOP: {
    what: 'Gathers attributes from several POPs into one: the first input passes through whole, and from each other input you pick attributes by name or pattern, optionally renaming them. The point count stays the same, so it adds data per point rather than more points.',
    tip: 'Pairs with the [[Select POP]]: split attributes off, process them in separate branches, then reunite them here.',
  },
  attributeconvertPOP: {
    what: 'Copies an attribute from one class to another (point to vertex, vertex to primitive, primitive to point and so on), optionally deleting the original. Where several values land on one element, such as a point shared by many primitives, it simply picks one.',
  },
  blendPOP: {
    what: 'Combines the same attribute(s) across all its inputs: average, add, multiply, minimum, maximum, differencing, or proportional mixes driven by a *Blend Input* weight per input. Weights can come from parameters, a CHOP or input attributes.',
    tip: 'Unlike the [[Switch POP]], which only crossfades neighboring inputs, Blend can mix any combination of inputs at once.',
  },
  fieldPOP: {
    what: 'Writes a 0–1 `Weight` attribute that says how far inside a 3D shape each point is (sphere, box, torus, tubes, capsule, planes, parabola and more) with an adjustable soft edge. It can also output a signed distance, or delete the points that end up with zero weight.',
    tip: 'Use the `Weight` as a mask: the [[Transform POP]] reads it directly, and multiplying it into `PartForce` confines a force to a region.',
  },
  histogramPOP: {
    what: 'Counts how many values of one attribute component fall into each of N equal bins across a range, outputting one point per bin with a `Count` attribute: a frequency distribution of your data.',
    tip: 'For a vector attribute, collapse it to one number first (e.g. `length()` in a [[Math POP]]), and view the bins with a [[POP to CHOP]].',
  },
  limitPOP: {
    what: 'Keeps an attribute inside a range by clamping, looping (wrapping around) or zig-zagging (bouncing back) at the minimum, the maximum or both. Raise *Parameter Size* to give each component its own limits.',
  },
  mathPOP: {
    what: 'One-attribute arithmetic: a pre-operation, add, multiply, add again and a post-operation (abs, sqrt, trig, logs, dB conversions and more), then optional range mapping and rounding. The result goes back in place or into any new attribute.',
    tip: 'Reorder components on the way in: an input scope of `P(1) P(0)` swaps X and Y.',
  },
  mathcombinePOP: {
    what: 'The most complete math POP: explicitly pick and rename attributes from every input, then run pre-process blocks, a stack of 70+ combine operations on up to three operands, and post-process blocks with re-ranging and casting.',
    tip: 'Reach for it instead of the [[Math Mix POP]] when attributes from several inputs should all reach the output under names you choose.',
  },
  mathmixPOP: {
    what: 'Chains mini-equations in one node: each block applies one of 70+ operations (A + B, sin(A), mix(A, B, C), length, cross…) to attributes or constants and writes the result to any attribute. Extra inputs appear with `in1_`, `in2_` name prefixes.',
    tip: 'A single-point input acts as a constant for every point, handy for feeding in a value computed by an [[Analyze POP]].',
  },
  noisePOP: {
    what: 'Displaces points through a smooth Perlin or Simplex noise field (2D to 4D) with period, harmonics, amplitude and offset controls. Beyond moving `P`, it can write raw noise, gradient or curl vectors into any attribute.',
    tip: 'Animate it by putting `absTime.seconds` into *Translate*, or into *Translate 4D* with a 4D noise type.',
  },
  normalPOP: {
    what: 'Computes normals (`N`) and optionally tangents from triangle and quad faces, as point, vertex or primitive attributes, weighting faces equally, by angle or by area. Add one after any deformation so shading matches the new shape.',
    tip: 'For hard, faceted edges, make points unique with a [[Facet POP]] first, or compute vertex or primitive normals.',
  },
  normalizePOP: {
    what: 'Rescales an attribute into 0–1 across its full range, or converts positions into normalized spherical or cylindrical coordinates (longitude, latitude, radius). It can then bias, ease, apply an exponent and re-range the result.',
    tip: 'A quick per-point gradient: normalize `P` and write it into `Color` or `Tex`.',
  },
  projectionPOP: {
    what: 'Converts a 3-component attribute between coordinate systems: Cartesian, spherical, cylindrical, camera screen space and normalized device coordinates, with angles in degrees, radians, cycles or normalized 0–1.',
    tip: 'Generate random values in spherical space with a [[Random POP]], then project to Cartesian for radial scatters.',
  },
  quantizePOP: {
    what: 'Snaps an attribute to steps (floor, round or ceiling with any step size and offset) or turns it into 0/1 by comparing it against a value. It can also cast the result to integers.',
  },
  randomPOP: {
    what: 'Sets, adds or multiplies random values into an attribute per point, vertex or primitive, from many distributions: uniform, Gaussian, two-value coin flips, unit directions within a cone, points inside a sphere, exponential and more.',
    tip: '*Extra Points per Source Point* clones each input point several times, a quick way to thicken a sparse cloud before scattering it.',
  },
  rerangePOP: {
    what: 'Maps an attribute from one range to another (*Map from Low/High* to *Map to Low/High*), per component if you raise *Parameter Size*, writing in place or to a new attribute.',
  },
  selectPOP: {
    what: 'Passes along only the attributes you choose (point, vertex, primitive) from its input or any referenced POP, with points and topology unchanged. Use it to work on attributes separately, then reunite them with an [[Attribute Combine POP]].',
    tip: 'It costs no GPU memory: POPs share unchanged attribute data by reference.',
  },
  sortPOP: {
    what: 'Reorders the point list and/or primitive list by any attribute, by distance to a point, along a vector, relative to an object\'s Z axis, or randomly, and can reverse or cyclically shift the order.',
    tip: 'When sorting by an unsigned integer attribute, set *Attrib is UInt* with the smallest max that fits: fewer sorting passes are needed.',
  },
  texturemapPOP: {
    what: 'Creates texture coordinates (`Tex`) by projection: normalized XYZ, cylindrical, per face, equirectangular (inside or outside a sphere), fisheye for domes, perspective from a camera (projection mapping) or triplanar.',
    tip: 'Write to `Tex2`, `Tex3`… when a material needs more than one set of coordinates.',
  },
  transformPOP: {
    what: 'Translates, rotates and scales `P` (keeping `N` in step) or any 3-component attribute, with optional look-at, a matrix from a CHOP or DAT, and bounding-box alignment. A `Weight` attribute can apply the transform partially per point.',
    tip: 'The *Map* page lets attributes drive translate, rotate and scale, so every point can get its own transform.',
  },
  trigPOP: {
    what: 'Applies sin, cos, tan, their inverses (including two-input atan2) or the hyperbolic versions to an attribute, with separate angle units (degrees, radians or cycles) for input and output.',
  },
  twistPOP: {
    what: 'Bends space around a pivot: twist, bend, shear, taper, linear taper or squash & stretch along one or two axes, with *Strength* and *Rolloff* controls. It can deform any attribute, not just `P`.',
    tip: 'A `Weight` attribute (from a [[Field POP]], say) scales the strength per point.',
  },
  skindeformPOP: {
    what: 'Skinning: deforms geometry (or a chosen attribute) so each point follows a weighted mix of bone transforms, using capture attributes stored on the geometry and a *Skeleton Root Path* that points at the bones. It is how rigged characters bend with their skeleton.',
  },

  // ---- Lines ----
  linePOP: {
    what: 'Builds line strips from points you place one sequential block at a time (with any custom attributes), then subdivides them linearly or as Cardinal, B-spline or Bezier curves. It can split into several strips, close them, or output just the control points for a [[Line Divide POP]] later.',
  },
  linebreakPOP: {
    what: 'Re-cuts a point list into line strips: start a new strip wherever a `LineBreak` attribute is 1, group by a `LineStripIndex` attribute, break every N points or where the gap to the next point is too large, or simply join all points into one strip.',
  },
  linedividePOP: {
    what: 'Subdivides existing line strips by count, per segment, by distance or by curvature, using linear, Cardinal, B-spline or Bezier interpolation, and honors spline attributes such as `Weight`, `TanIn`/`TanOut` or `SegMethod` when present.',
    tip: 'If long strips come out truncated, raise *Maximum Number of Vertices*: the GPU has to reserve that space in advance.',
  },
  linemetricsPOP: {
    what: 'Measures every point in the context of its line strip and stores the results as attributes: direction and distance to neighbors, tangent, curvature, distance along the strip (raw or 0–1), strip length and index, and full orientation frames.',
    tip: '*Distance from Start Normalized* gives each strip its own 0–1 ramp, ready to drive color or `LineWidth` along the line.',
  },
  lineresamplePOP: {
    what: 'Redistributes points along line strips without changing their shape: a fixed count per strip, even spacing, denser spacing where curvature is high, or even steps of another attribute (*Points as Keyframes*).',
    tip: 'A `ControlPoint` attribute forces the resampled line to still pass exactly through those original points.',
  },
  linesmoothPOP: {
    what: 'Smooths line strips by blending each point with its neighbors along the strip, either within an edge distance (Gaussian or box weighting) or over a number of point steps. End points can stay pinned, and it can subdivide first.',
    tip: 'Want even spacing but the exact same shape? Use the [[Line Resample POP]] instead.',
  },

  // ---- Topology & conversion ----
  connectivityPOP: {
    what: 'Rebuilds the primitives of any structured point set (rows, columns, slices) the way a generator would: lines or line strips along a dimension, triangles or quads across two, point primitives or none, plus zig-zag and spiral strips.',
    tip: 'Check the input\'s Dimensions in its middle-click info: that structure is what this POP connects.',
  },
  convertPOP: {
    what: 'Keeps the points but changes how they are connected: strip all primitives, add a point primitive per point, break strips into lines, turn faces into strips, quads into triangles, open or close strips, or reverse the winding.',
    tip: '*Unique and Reorder Points by Prim/Vertex Order* flattens geometry into a tidy list whose point order follows the primitives.',
  },
  copyPOP: {
    what: 'Duplicates its input a set number of times with a cumulative transform per copy (stacks, spirals, arrays), and/or onto every point of a template POP using its attributes for placement and orientation. The result is real geometry you can keep editing, unlike render instancing.',
    tip: 'Turn on *CopyId Attribute* to tag each copy with its number, so later POPs can vary them.',
  },
  deletePOP: {
    what: 'Removes points or primitives (or keeps only them) chosen by attribute tests, thinning (ranges, steps, random), index patterns, groups or a bounding box/sphere. Condition blocks combine with AND, OR and related logic.',
    tip: '*Line Strip Behavior* decides what happens to a strip that loses points: drop the point, split the strip, or delete it.',
  },
  dimensionPOP: {
    what: 'Changes how a POP\'s point list is structured into Dimensions (for example 12 × 5 × 30 into 60 × 30, or adding a size-1 dimension) or reorders the dimensions. The product of the new sizes must equal the point count.',
    tip: 'Use it to restore rows and columns after a [[SOP to POP]], which does not carry mesh dimensions over.',
  },
  extrudePOP: {
    what: 'Gives line strips, triangles or quads thickness: it offsets a copy of each by a *Distance*, can taper it inward, and builds side walls in between. Follow it with a [[Normal POP]] for faceted shading.',
  },
  facetPOP: {
    what: 'Controls point sharing between primitives: *Unique Points* gives every vertex its own point, *Consolidate Points* fuses points within a distance, and *Cusp Polygons* splits points only along edges sharper than an angle.',
    tip: 'Run a [[Normal POP]] afterwards: unique points shade flat and faceted, shared points shade smooth.',
  },
  groupPOP: {
    what: 'Puts points or primitives into named groups with the same selection tools as the [[Delete POP]] (attribute tests, thinning, patterns, existing groups, bounding regions) so other POPs can act on just that subset. It also renames groups and converts point groups to primitive groups and back.',
    tip: 'Turn on *Debug Color* to see the groups colored in the viewer.',
  },
  mergePOP: {
    what: 'Stacks the points, vertices and primitives of all its inputs into one POP, keeping groups and shared attributes. Inputs can be wired or picked by name pattern, and each can contribute just a chosen group.',
  },
  nullPOP: {
    what: 'Passes its input through untouched and allocates nothing. End chains with one, give it a meaningful name, and point references and display/render flags at it so you can rework the chain upstream freely.',
  },
  polygonizePOP: {
    what: 'Builds a closed polygon surface (an isosurface) around everything above a threshold in a volume: either a 3D texture TOP or a POP arranged as a 3D grid, such as a sliced [[Grid POP]] carrying a noise attribute.',
    tip: 'Lower *Resolution Multiplier* for a lighter mesh.',
  },
  primitivePOP: {
    what: 'Hand-builds primitives: add points, then create triangles, quads, lines, line strips or point primitives from every N points or from index patterns like `[0-9]`. Given an input, it can strip the original primitives and reconnect the existing points.',
  },
  proximityPOP: {
    what: 'Draws 2-point lines between points that lie within a min/max distance of each other (or between two inputs), with a cap on lines per point: the classic plexus look. It can add `LineDir` and `LineLength` attributes to each line.',
  },
  revolvePOP: {
    what: 'Spins each line strip around an axis to sweep out a surface of revolution (vases, bottles, lathe shapes) connected as quads, triangles, row/column strips or points. By default the axis runs from the strip\'s first point to its last.',
  },
  skinPOP: {
    what: 'Connects points with a 2D structure, such as several line strips of equal length, into a mesh of triangles or quads, using the input\'s Dimensions to tell rows from columns. It can also skin groups of N primitives or every Nth primitive.',
  },
  subdividePOP: {
    what: 'Smooths a surface by repeated subdivision (the Loop method): quads become triangles, each triangle splits into four, and points blend with their neighbors. *Depth* sets the number of passes.',
    tip: 'Set *Crease Weight* to 1 to add resolution while keeping the original shape.',
  },
  switchPOP: {
    what: 'Outputs one of its inputs, chosen by *Index*; the inputs may differ completely. A fractional index blends two neighboring inputs when their point, vertex and primitive counts match.',
    tip: 'To blend from the last input back to the first, wire the first input in again as the last.',
  },
  topologyPOP: {
    what: 'Advanced: assembles or rewires topology from unsigned-int point-index attributes (often written by GLSL POPs), merges in vertex and primitive attributes from other POPs, and sets max or exact element counts so downstream POPs allocate less GPU memory.',
  },
  tracePOP: {
    what: 'Traces the bright (or dark) regions of a TOP into outline lines, line strips or filled triangles, with threshold, channel, smoothing and resolution controls. A quick way to turn a logo or silhouette image into geometry.',
    tip: 'If outlines get cut off, raise *Max Num Line Strips* or *Max Num Verts per Line Strip*: the GPU needs these limits in advance.',
  },
  triangulatePOP: {
    what: 'Fills each closed line strip with triangles; open strips and other primitives pass through, and quads can optionally be split too. The default assumes convex outlines: switch *Mode* to *Convex and Concave* for shapes like letters, at a speed cost.',
  },

  // ---- Simulation & time ----
  particlePOP: {
    what: 'The particle engine: emits particles from input points (by rate or a per-point birth attribute), gives them velocity, mass, drag and lifespan, and each frame integrates `PartForce` and `PartVel` through a feedback loop that ends at a target POP you choose.',
    tip: 'Whatever you put between it and the loop\'s target Null (a [[Force Radial POP]], noise, math) edits the particles every frame.',
  },
  forceradialPOP: {
    what: 'Adds forces into a `PartForce` attribute for a particle loop: a global force and wind, plus a local radial, axial, spiral or planar force with position, falloff and strength. Chain several and their forces add up.',
    tip: 'Multiply its result by a [[Field POP]] `Weight` to confine a force to a region.',
  },
  feedbackPOP: {
    what: 'Brings a target POP\'s output from the previous frame back to the top of a chain, so geometry can evolve frame after frame. *Initialize* captures the starting state, *Start* runs the loop, and *Pre-Roll* can advance it before you start.',
  },
  cachePOP: {
    what: 'Holds the last N frames of its input in GPU memory and outputs any one of them, acting as a time delay for geometry. The [[Cache Select POP]] and [[Cache Blend POP]] can read the stored frames too.',
    tip: '*Step Size* stores only every Nth frame, stretching the time covered without using more memory.',
  },
  cacheselectPOP: {
    what: 'Outputs one stored frame from a [[Cache POP]]: index 0 is the newest, -1 the one before, and so on. Use several to show the same geometry at different moments.',
  },
  cacheblendPOP: {
    what: 'Mixes several stored frames from a [[Cache POP]] point by point, each with its own index and weight, for time-blurred geometry or for working out how fast each point is moving.',
  },
  trailPOP: {
    what: 'Keeps a rolling history of its input\'s points over the last N frames or seconds and connects each point through time, typically one line strip per point for streaks and motion trails. When point counts change (particles), it matches points by an ID attribute.',
    tip: 'Express *Trail Length* in seconds so trails look the same at any frame rate; the optional `Age` attribute lets you fade the tail.',
  },
  timefilterPOP: {
    what: 'Smooths attributes over time to remove jitter, with Gaussian, triangle or box windows or the adaptive One Euro filter, then optional lag/overshoot and a freeze blend. It can follow points across frames by an ID such as `PartId`.',
    tip: 'One Euro suits tracking data: steady when still, quick to respond when moving fast.',
  },
  phaserPOP: {
    what: 'Staggered animation: as one *Fraction* value goes from 0 to 1, each point\'s output rises from 0 to 1 at a different time, set by a per-point phase attribute. Use the result to blend positions, colors or anything else in a wave across the points.',
    tip: 'It works like the [[Phaser CHOP]]; animate *Fraction* to play the wave.',
  },

  // ---- Lookups & data exchange ----
  lookupattributePOP: {
    what: 'Uses a 0–1 attribute (or a point index) on each point to sample values from a second POP, typically a [[Curve POP]] acting as a lookup table, and writes them into new or existing attributes, with interpolation and extend modes.',
  },
  lookupchannelPOP: {
    what: 'Uses a 0–1 attribute (or a sample index) on each point to read interpolated values from a CHOP\'s channels into POP attributes, with re-ranging: a direct route from CHOP curves or audio to per-point values.',
  },
  lookuptexturePOP: {
    what: 'Samples a TOP at UV coordinates taken from point attributes (such as `Tex`) and writes the RGBA result into attributes like `Color`, painting geometry with any image, video or render. Add a W attribute to sample 3D textures.',
  },
  neighborPOP: {
    what: 'Finds each point\'s nearest points within a radius (or its directly connected neighbors) and stores their indices in a `Nebr` array attribute plus a `NumNebrs` count. It can instead output an average over those neighbors (plain or inverse-distance weighted), or copy their attributes.',
  },
  rayPOP: {
    what: 'Casts a ray from every point along a direction attribute against the triangles and quads of a second input, and reports the hits as attributes: distance, normal, primitive index, barycentric coordinates, the surface\'s attributes, reflections and inside/outside. By default it moves points onto the surface they hit.',
    tip: 'It can use hardware ray tracing for speed.',
  },
  choptoPOP: {
    what: 'Converts CHOP channels into a POP: each sample becomes a point, and channels map to attributes through explicit lists, sequential blocks, or automatic naming that mirrors the [[POP to CHOP]]. Points can be joined as a line strip, lines or point primitives.',
    tip: 'No position channels? It can lay the points out on a line between a start and end position you set.',
  },
  dattoPOP: {
    what: 'Builds a POP from DAT tables laid out like [[POP to DAT]] output: columns such as `P(0)`, `P(1)`, `P(2)` become attributes, and optional tables add primitives, groups and dimensions.',
  },
  soptoPOP: {
    what: 'Converts SOP geometry into POPs, renaming attributes to POP conventions (`Cd` to `Color`, `uv` to `Tex`, `pscale` to `PointScale`). Since POP faces stop at quads, polygons with five or more sides become triangles or closed line strips, your choice.',
  },
  toptoPOP: {
    what: 'Turns an image into points, one per pixel, reading RGBA as color, as positions, as depth seen through a camera, or as height for displacement; *Custom* maps channels to any attributes. The points can be connected like a grid.',
    tip: 'Depth mode plus the camera\'s field of view or focal lengths reconstructs a point cloud from a depth image.',
  },
  inPOP: {
    what: 'Brings a POP into a component through one of its input connectors, one connector per In POP. If nothing is wired to the component, it outputs whatever is connected to the In POP\'s own second input instead.',
    tip: 'Use that fallback input to keep test geometry inside the component.',
  },
  outPOP: {
    what: 'Sends a POP out of its component through an output connector, one connector per Out POP. Wire a POP in or reference one with *Select POP*, and set *Label* to name the connector.',
  },

  // ---- GLSL & scripting ----
  glslPOP: {
    what: 'Runs your own GLSL compute shader over one attribute class (points, vertices or primitives) to modify or create attributes, with TOPs, CHOPs, uniforms and other POPs available as inputs. It cannot change the number of elements; the [[GLSL Advanced POP]] can.',
  },
  glsladvancedPOP: {
    what: 'The full-control compute shader POP: one shader can read and write point, vertex and primitive attributes together, dispatch once per primitive batch, generate new geometry up to the maximums you set, and publish extra outputs. Use it when the [[GLSL POP]] is too limited.',
  },
  glslcopyPOP: {
    what: 'Makes copies of its input (a set number, or one per template point) and runs your compute shader on each copy, so every copy can be warped or animated differently based on its template point\'s attributes.',
  },
  glslselectPOP: {
    what: 'Picks one of the named extra outputs of a [[GLSL Advanced POP]] and outputs it as an ordinary POP.',
  },
  scriptPOP: {
    what: 'Builds a POP in Python: its cook callback fills a staging object with points, attributes and primitives, which is then uploaded to the GPU in one go. It works as a generator or as a filter of its inputs.',
    tip: 'The Python runs on the CPU each cook, so keep heavy per-frame point work in GLSL POPs.',
  },
  cplusplusPOP: {
    what: 'Loads a custom POP operator that you write and compile in C++ as a plugin, for CPU-side code or libraries the built-in POPs and GLSL cannot provide.',
  },

  // ---- Devices & IO ----
  fileinPOP: {
    what: 'Loads geometry files (`.obj`, `.ply`, TouchDesigner `.tog` and classic Houdini formats) straight into GPU memory, including from `http://` URLs.',
    tip: 'For point clouds with custom fields use the [[Point File In POP]]; for Alembic caches, the [[Alembic In POP]].',
  },
  fileoutPOP: {
    what: 'Writes a POP to disk as OBJ, PLY, EXR, E57 or SPZ (Gaussian splats), either a single file or a recorded file sequence. PLY and EXR can carry arbitrary point attributes.',
  },
  pointfileinPOP: {
    what: 'Loads point clouds from PLY, OBJ, EXR, FITS and text formats (CSV, XYZ, PTS…), as single files or sequences, mapping any fields to attributes. It reads Gaussian splat files with all their attributes, and can thin or re-range points on load.',
    tip: 'EXR is the recommended format for point-cloud sequences: it is binary and read ahead like a movie file.',
  },
  alembicinPOP: {
    what: 'Plays back Alembic (`.abc`) meshes, curves and point caches, including animated sequences, with transport controls (play, cue, speed, trim) and a choice of which objects in the archive to load.',
  },
  alembicoutPOP: {
    what: 'Records POPs to an Alembic (`.abc`) file, as one frame or an animation, with several inputs written as separate objects. Each input must hold a single kind of primitive: points, triangles/quads, or lines/line strips.',
  },
  importselectPOP: {
    what: 'Loads one geometry item from a [[USD COMP]] or [[FBX COMP]] import directly onto the GPU, converting meshes, points, curves and patches to POP primitives, with blend shape selection and animation playback.',
  },
  dmxfixturePOP: {
    what: 'Maps geometry to DMX: each primitive is a fixture, and a channel profile you define turns its attributes (color, position…) into channel values laid out across universes. Pair it with a [[DMX Out POP]].',
    tip: 'Attach a DMX Map DAT to inspect the universes it builds.',
  },
  dmxoutPOP: {
    what: 'Sends the universes built by one or more [[DMX Fixture POP]]s to lighting hardware over DMX USB, Art-Net, sACN or KiNET, with optional routing tables and multipliers.',
    tip: 'A single DMX Out POP can gather every fixture POP in a project through a wildcard path.',
  },
  oakselectPOP: {
    what: 'Receives point cloud data from a stream of an OAK depth camera pipeline running in an [[OAK Device CHOP]].',
  },
};
