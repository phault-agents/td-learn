import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m6. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  // ---- CHOPs ----
  performCHOP: {
    what: 'Reports the health of the whole TouchDesigner process as channels: frames per second, milliseconds per frame, dropped frames, GPU and CPU memory, Perform Mode state and more. Turn on only the channels you need.',
    tip: 'Follow it with a [[Trail CHOP]] on the frame time to see spikes that an fps number hides.',
  },
  mergeCHOP: {
    what: 'Combines the channels of several CHOPs into one, with options for aligning different lengths and for what to do when two channels share a name.',
    tip: 'With *Duplicate Names* set to *Make Unique*, clashing channels get renumbered — read them by index, or rename them afterwards.',
  },
  trailCHOP: {
    what: 'Records a rolling history of its input over a time window, turning a single changing value into a graph you can read at a glance.',
    tip: 'Perfect for monitoring: frame time, sensor values, audio levels — anything where the recent past tells you more than the current value.',
  },
  triggerCHOP: {
    what: 'Turns a rising edge in its input — a button press, a beat, a threshold crossing — into an attack/decay/sustain/release envelope over time.',
    tip: 'Set *Sustain Level* to 0 when holding the button should not hold the effect: every press then becomes a clean one-shot.',
  },
  keyboardinCHOP: {
    what: 'Outputs one channel per listed key (numbers and letters), 1 while the key is held and 0 otherwise.',
    tip: 'For a handful of preset keys it is ideal; for full keyboard input use a Keyboard In DAT or a Panel Execute DAT, which catch every keystroke.',
  },
  midiinCHOP: {
    what: 'Receives MIDI from a controller, instrument or file: notes, velocities, control-change knobs and faders, pitch bend and clock. Channel names and value ranges are set on its Note and Control pages.',
    tip: 'Normalize controllers to 0–1 and add a short Lag CHOP — 7-bit knobs only have 128 steps.',
  },
  oscinCHOP: {
    what: 'Listens on a network port for Open Sound Control messages and turns each incoming address into a channel — the usual way to receive control from phones, tablets and other software.',
    tip: 'If nothing arrives, check the port number, that both devices are on the same network, and the computer\'s firewall.',
  },
  audiofilterCHOP: {
    what: 'Filters an audio signal with a low-pass, high-pass, band-pass or band-reject filter, with cutoff given in Hz or on a logarithmic scale.',
    tip: 'Three of them in parallel — low, band and high — make a simple crossover for driving visuals from bass, mids and highs separately.',
  },

  // ---- DATs ----
  executeDAT: {
    what: 'Runs Python callbacks on project-wide events: start-up, exit, the start or end of every frame, play-state changes and device changes.',
    tip: 'Anything in *onFrameStart* or *onFrameEnd* runs every frame — keep it tiny, and never download POP data there without `delayed=True`.',
  },
  chopexecuteDAT: {
    what: 'Runs Python callbacks when channels of a CHOP change: when they cross from off to on, from on to off, while on or off, or on any value change.',
    tip: '`onOffToOn` is the natural home for "this key/button was pressed" actions; `channel.index` and `channel.name` tell you which one.',
  },
  parameterexecuteDAT: {
    what: 'Runs Python callbacks when parameters of the operators you point it at change value, are pulsed, or change expression, export, mode or enable state.',
    tip: 'Inside a custom component, point *OPs* at `parent()` and list your custom parameters — it is how menus and pulse buttons turn into behaviour.',
  },
};
