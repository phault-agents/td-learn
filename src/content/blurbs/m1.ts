import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m1. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  poptoDAT: {
    what: 'Lays a POP\'s points, vertices or primitives out as a table — one row per element, one column per attribute component — so you can read the actual numbers. It can thin the data out by range, step or randomly, and filter by group.',
    tip: 'Every update copies data from the GPU to the CPU. Use it to check your work on large POPs with *Thin Out Range* on, then turn *Active* off.',
  },
  environmentlightCOMP: {
    what: 'Light that arrives from all around the scene rather than from a position: objects are lit by which way their surfaces face, not where they are. Give it an image in *Environment Map* and PBR materials pick up believable reflections and soft fill.',
    tip: 'Pair it with one ordinary [[Light COMP]] as a key light: the environment light fills the shadows, the key light gives shape.',
  },
};
