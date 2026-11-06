import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m5. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  // ---- POPs ----
  glslPOP: {
    what: 'Runs your own compute shader once per point, vertex or primitive. It reads any attribute of any input, writes the attributes listed in *Output Attributes* (or created on its *Create Attributes* page), and takes uniforms, samplers and CHOP arrays from its parameter pages. It never changes the element count.',
    tip: 'Start every shader with `if (TDIndex() >= TDNumElements()) return;` and a pass-through line, check it compiles, then add the real work.',
  },
  glsladvancedPOP: {
    what: 'The full-control compute shader POP: one shader reads and writes point, vertex and primitive attributes together, can change the number of points and primitives, write the index buffer, and fill extra outputs that a [[GLSL Select POP]] can pick up.',
    tip: 'Unlike the [[GLSL POP]], it has no *Passes* parameter. For iterative solvers, use the GLSL POP or a feedback loop.',
  },
  neighborPOP: {
    what: 'Finds, for every point, nearby points within a search radius using a spatial hash, and stores their indices in the uint array `Nebr` (size = *Max Neighbors*) with a count in `NumNebrs`. It can also output averages or copies of the neighbours\' attributes.',
    tip: 'Unfilled slots hold 4294967295: skip them in GLSL with `j == 0xFFFFFFFFu`, or compare with `_NoNeighbor` in expressions.',
  },
  lookuptexturePOP: {
    what: 'Samples a TOP for every point at UV coordinates taken from attributes, and writes the pixel values into an attribute: a color, a height, any data an image can hold.',
    tip: 'Point it at `Tex(0)` and `Tex(1)` to wrap an image or a TOP simulation around a surface along its texture coordinates.',
  },

  // ---- TOPs ----
  constantTOP: {
    what: 'Fills an image with a single color and alpha at the resolution and pixel format you choose. A clean starting state for image-based simulations, or a flat layer to composite with.',
    tip: 'For simulations, set its *Pixel Format* to a float format on the Common page so later feedback doesn\'t inherit 8-bit precision.',
  },
  circleTOP: {
    what: 'Draws a circle, ellipse, arc or regular polygon with fill, border and soft edges. With *Comp Over Input* on, it composites the shape onto its input using any blend operation.',
    tip: 'Animate *Center* with expressions and composite with *Maximum* to "paint" into a feedback loop without erasing what\'s there.',
  },
  lookupTOP: {
    what: 'Replaces the colors of its first input with colors read from a lookup table: a line across its second input (typically a [[Ramp TOP]]) or CHOP channels. Turns a grayscale field into a palette.',
    tip: 'Pick the *Index Channel* that holds your data and narrow *Index Range* to the values that actually occur, so the whole palette gets used.',
  },
};
