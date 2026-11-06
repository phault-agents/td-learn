import type { Family } from '../content/types';

export const FAMILY_COLOR: Record<Family, string> = {
  POP: '#f2924a',
  TOP: '#a184f0',
  CHOP: '#5cc98e',
  SOP: '#5b9cf5',
  DAT: '#e979b8',
  MAT: '#d9c35a',
  COMP: '#a3acbb',
};

export const FAMILY_NAME: Record<Family, string> = {
  POP: 'Point Operators — GPU geometry & point data',
  TOP: 'Texture Operators — images & GPU pixels',
  CHOP: 'Channel Operators — numbers over time, audio, devices',
  SOP: 'Surface Operators — legacy CPU geometry',
  DAT: 'Data Operators — text, tables, scripts',
  MAT: 'Materials — shading for rendered geometry',
  COMP: 'Components — containers, 3D objects, UI, windows',
};

export const FAMILY_ORDER: Family[] = ['POP', 'TOP', 'CHOP', 'DAT', 'COMP', 'MAT', 'SOP'];
