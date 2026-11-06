import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m4. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  switchDAT: {
    what: 'Passes through one of its input DATs, chosen by *Index*. Use it to flip between datasets, or between a live feed and an offline fallback table.',
    tip: 'Inputs that share the same columns and row order let everything downstream transition smoothly when you switch.',
  },
  mergeDAT: {
    what: 'Combines several DATs into one: stack tables (*Append Rows*), put them side by side (*Append Columns*), or merge cells, optionally matching by column or row names.',
  },
  insertDAT: {
    what: 'Adds a row or a column to a table — at the start, the end or a given index — filled with the space-separated values you type in *Contents*.',
    tip: 'Handy for giving a headerless table the header row that the DAT to POP needs.',
  },
  nullDAT: {
    what: 'A pass-through for text and tables. End DAT chains with one so other operators can point at a stable name while you rework what feeds it.',
  },
  jsonDAT: {
    what: 'Parses JSON text from its input and filters it with a JSONPath expression (`$.features[*].properties.mag`), outputting the result as text or, with *Output Format* Table, as rows and columns.',
    tip: 'Build the path step by step with *Output Format* Indented, and only switch to Table once the filter returns what you expect.',
  },
  webclientDAT: {
    what: 'Sends HTTP requests (GET, POST and friends, with optional authentication) and outputs the server\'s response — the starting point for pulling web APIs and data feeds into TouchDesigner.',
    tip: 'It only requests when *Request* is pulsed; drive that pulse from a Timer CHOP callback to poll a feed on a schedule.',
  },
  timerCHOP: {
    what: 'A timing engine: runs for a set length (or forever), can cycle and restart, outputs fractions, counts and state channels, and calls Python callbacks at moments like start, cycle and done.',
    tip: 'For "do something every N seconds", set *Length* to N, *On Done* to Re-Start, and put the action in the callbacks DAT\'s `onDone`.',
  },
  shuffleCHOP: {
    what: 'Reorganises samples and channels: swap channels with samples, chain all channels end to end into one long channel, or split long channels into pieces.',
    tip: '*Sequence All Channels* turns many series into one list — ideal before a CHOP to POP when each series should become its own line strip.',
  },
};
