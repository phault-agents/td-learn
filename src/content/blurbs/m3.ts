import type { OpBlurb } from '../types';

/** Operator blurbs contributed by m3. Keys are TD op types (e.g. 'noisePOP'). Write original text. */
export const blurbs: Record<string, OpBlurb> = {
  // ---- Audio CHOPs ----
  audiofileinCHOP: {
    what: 'Streams audio from a file on disk (or a web address) as time-sliced channels: each frame it outputs only the samples that arrived since the last one. Play it locked to the timeline, sequentially, or at an index you drive.',
    tip: 'Turn on *Mono* when you only want to analyze the music — one channel is simpler to look up and cheaper to process.',
  },
  audiodeviceinCHOP: {
    what: 'Live audio from a microphone, line input or audio interface, delivered as time-sliced channels at the device\'s sample rate.',
    tip: 'Keep your analysis chain reading a Null downstream, and you can swap between this and a file player without touching anything else.',
  },
  audiodeviceoutCHOP: {
    what: 'Plays the audio channels wired into it through your speakers or audio interface. In analysis patches it\'s there so you can hear what you\'re looking at.',
    tip: 'Turn it off when a microphone is in the room, or you\'ll build an acoustic feedback loop.',
  },
  audiospectrumCHOP: {
    what: 'Converts the most recent window of audio into a frequency spectrum: one multi-sample channel per input channel, where each sample is the level of a band, lowest frequencies first. Its default *Visualization* mode reshapes the result to read more like hearing.',
    tip: 'Set *Output Length* to *Set Length Manually* to get exactly the number of bands you need; a smaller *FFT Size* is cheaper and reacts faster.',
  },
  analyzeCHOP: {
    what: 'Collapses each channel to a single value — average, minimum, maximum, sum, RMS power, or the value/index of peaks. Fed with a frame\'s slice of audio, *RMS Power* gives a usable loudness.',
  },
  resampleCHOP: {
    what: 'Changes how many samples a channel has, or its sample rate, by stretching, compressing or re-timing it with a choice of interpolation.',
    tip: 'With *Linear* interpolation, shrinking a channel averages neighbouring samples — a simple way to pool many spectrum bins into a few bands.',
  },

  // ---- TOPs ----
  resolutionTOP: {
    what: 'Rescales an image to a new resolution (its *Common* page sets the size), optionally with a high-quality filter. Downscaling first is the cheap way to give a coarse grid of points a clean, averaged picture to sample.',
  },
  switchTOP: {
    what: 'Outputs one of its inputs, picked by *Index* (and can blend between neighbours). Handy for flipping a patch between a movie file and a live camera.',
  },
};
