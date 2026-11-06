import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m2. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  mouseinCHOP: {
    what: 'Reports the mouse pointer\'s X/Y position and the state of its buttons (and wheel) as channels, so the pointer can steer anything a CHOP can reach.',
    tip: 'Check the value range in its viewer for your chosen *Output Coordinates* mode, then remap it with a [[Math CHOP]] (*Range* page) onto the space you need.',
  },
};
