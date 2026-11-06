import type { OpBlurb } from '../types';

/**
 * Core operator blurbs shared by the whole course. Original text written for this course.
 * Keys are TouchDesigner op types (e.g. 'noisePOP').
 */
export const blurbs: Record<string, OpBlurb> = {
  // ---- COMPs ----
  geometryCOMP: {
    what: 'A 3D object you can render. Put POPs inside it (render + display flag on the last one), assign a material on its *Render* page, and move it with its *Xform* page. Its *Instance* pages can also stamp the geometry onto every point of another POP.',
    tip: 'Right-click any POP and choose *Geometry COMP* to wrap it in a Geo in one step.',
  },
  cameraCOMP: {
    what: 'The viewpoint for a [[Render TOP]]. Position it with Translate/Rotate or point it with *Look At*; the *View* page switches between perspective and orthographic projection.',
  },
  lightCOMP: {
    what: 'A light source for lit materials (Phong, PBR). Choose point, cone or distant light types, and optionally cast shadows.',
    tip: 'If a Phong/PBR render is black, check for a light first — or temporarily switch to a [[Constant MAT]].',
  },
  baseCOMP: {
    what: 'A plain container for a network — the building block for organizing projects and packaging reusable tools with custom parameters and extensions.',
  },
  containerCOMP: {
    what: 'A panel component: a container that also has a 2D UI presence (size, background, children laid out as a control panel).',
  },
  windowCOMP: {
    what: 'Opens an output window — on a second monitor, projector or LED processor — showing a TOP or panel at a chosen size, monitor and position.',
  },

  // ---- MATs ----
  pbrMAT: {
    what: 'Physically based material: base color, metallic, roughness and emission, plus texture maps. Looks best with an environment light; reads POP `Color` when *Apply Point Color* is on.',
  },
  phongMAT: {
    what: 'The classic lit material: diffuse, specular and shininess with optional texture maps. Fast and predictable.',
  },
  constantMAT: {
    what: 'Unlit flat color (optionally textured). Ignores lights entirely — ideal for data viz, glowing elements, and debugging renders.',
  },
  lineMAT: {
    what: 'Draws line strips as thick, camera-facing strokes and points as circles, spheres or squares, with width and color that can fade with distance. Its *Attributes* page chooses which POP attributes drive line width, point size and color — e.g. `LineWidth`.',
    tip: 'The fastest way to make particles and line art look good without instancing.',
  },
  pointspriteMAT: {
    what: 'Renders each point primitive as a camera-facing square sprite, optionally textured — a lightweight way to draw large point clouds.',
  },

  // ---- TOPs ----
  renderTOP: {
    what: 'Renders 3D: combines a camera, the geometry COMPs and lights into an image. *Geometry* and *Lights* accept patterns like `geo*` and `light*`.',
    tip: 'Raise *Anti-Alias* for clean lines and points; it costs GPU time.',
  },
  nullTOP: {
    what: 'A pass-through image. End TOP chains with a Null so downstream references stay stable when you rewire what comes before it.',
  },
  outTOP: {
    what: 'Sends an image out of a component through its output connector.',
  },
  noiseTOP: {
    what: 'Generates procedural noise images (GPU Perlin and Simplex in 2D/3D/4D, plus Sparse, Hermite and others) with transform, period, harmonics and amplitude controls. Animate it by translating through the noise over time.',
  },
  rampTOP: {
    what: 'Makes gradients (vertical, horizontal, radial, circular) from a table of color keys — perfect as a color palette to look up from.',
  },
  levelTOP: {
    what: 'Adjusts brightness, contrast, gamma, black/white levels and opacity of an image.',
  },
  compositeTOP: {
    what: 'Layers several images with a chosen blend operation (over, add, multiply, screen…).',
  },
  bloomTOP: {
    what: 'Adds a soft glow around bright areas of an image — a staple finishing pass for renders.',
  },
  blurTOP: {
    what: 'Blurs an image with adjustable size and filter type (Gaussian, Box and others).',
  },
  feedbackTOP: {
    what: 'Feeds an image from later in a chain back into an earlier point on the next frame — the basis of trails, echoes and image-based simulations.',
  },
  glslTOP: {
    what: 'Runs your own GLSL pixel (or compute) shader to generate or process images.',
  },
  moviefileinTOP: {
    what: 'Plays a movie or loads an image file from disk.',
  },
  videodeviceinTOP: {
    what: 'Live video from a webcam or capture device.',
  },
  textTOP: {
    what: 'Renders text into an image, with font, size, alignment and color controls.',
  },
  transformTOP: {
    what: 'Translates, rotates and scales an image within its frame.',
  },

  // ---- CHOPs ----
  lfoCHOP: {
    what: 'A low-frequency oscillator: sine, triangle, ramp, square, pulse or Gaussian waves at a set frequency, amplitude and offset. The quickest source of rhythmic motion.',
  },
  noiseCHOP: {
    what: 'Smooth random curves over time (or across samples). Great for organic, never-repeating motion and wandering values.',
  },
  nullCHOP: {
    what: 'A pass-through for channels. End control chains with a Null and reference it from parameters — you can then change the chain without breaking expressions.',
  },
  mathCHOP: {
    what: 'Arithmetic on channels: offset, multiply, range-map (*From Range → To Range*), combine channels or inputs.',
  },
  lagCHOP: {
    what: 'Smooths changes in a channel with separate lag times for rising and falling values.',
  },
  filterCHOP: {
    what: 'Smooths channels with Gaussian, box or edge-preserving filters — calms down jittery input.',
  },
  speedCHOP: {
    what: 'Integrates a value over time: feed it a speed and it outputs an ever-growing position. Changing the speed never makes the output jump.',
  },
  constantCHOP: {
    what: 'Outputs named channels with constant values — handy as a control panel of numbers.',
  },
  selectCHOP: {
    what: 'Picks channels (by name or pattern) from another CHOP, even one far away in the project.',
  },
  infoCHOP: {
    what: 'Exposes an operator\'s internal state as channels — cook times, timer states, counts.',
  },

  // ---- DATs ----
  tableDAT: {
    what: 'A spreadsheet-like grid of text cells — type data by hand, or fill it from files and scripts.',
  },
  textDAT: {
    what: 'Free-form text: notes, Python scripts, GLSL shaders, JSON.',
  },

  // ---- POPs ----
  spherePOP: {
    what: 'Generates a sphere as a geodesic (evenly spaced triangles), a UV grid, or a tetrahedron-based mesh. Choose its connectivity — triangles, lines or just point primitives.',
  },
  gridPOP: {
    what: 'Generates a flat grid of points (optionally with slices for a 3D lattice), connected as quads, triangles, lines or point primitives. It records rows/columns as Dimensions.',
  },
  boxPOP: {
    what: 'Generates a box, optionally subdivided, as surfaces, lines or points.',
  },
  noisePOP: {
    what: 'Pushes points through a 3D/4D noise field (Perlin or Simplex). By default it offsets `P`, but it can write any attribute, output curl or gradient vectors, and be driven per point from the *Map* page.',
    tip: 'Animate it by putting `absTime.seconds * speed` into *Translate 4D* with a 4D noise type — the shape morphs instead of sliding.',
  },
  nullPOP: {
    what: 'A pass-through POP. Put one at the end of chains to hold the display/render flags and to give other operators a stable thing to reference.',
  },
  transformPOP: {
    what: 'Translates, rotates and scales points (or any vector attribute). A *Weight Attribute* blends the effect per point, and the *Map* page can drive translate/rotate/scale from attributes.',
  },
  mathPOP: {
    what: 'Per-attribute arithmetic in one node: pre-add, multiply, post-add, range-map and more, writing to the same or a new attribute.',
  },
  mathmixPOP: {
    what: 'A stack of mini-equations: each block combines up to three attributes or constants (A+B, sin(A), mix(A,B,C), cross, length…) and writes the result to any attribute. Math without writing code.',
    tip: 'Middle-click it to read the pseudo-code of what your blocks do.',
  },
  attributePOP: {
    what: 'Creates attributes with initial values (any name, type, size or array), and renames, duplicates or deletes them.',
  },
  normalPOP: {
    what: 'Computes surface normals (and optionally tangents) — run it after deforming geometry so lighting matches the new shape.',
  },
  mergePOP: {
    what: 'Combines several POPs into one, keeping attributes that match.',
  },
  switchPOP: {
    what: 'Outputs one of its inputs, chosen by index — for A/B looks or scene changes.',
  },
};
