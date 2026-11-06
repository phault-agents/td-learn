import type { Module } from './types';
import firstPopNetwork from './lessons/m1-first-pop-network';
import attributes from './lessons/m1-attributes';
import chopsDrivePops from './lessons/m1-chops-drive-pops';
import renderStack from './lessons/m1-render-stack';
import fieldsAndWeights from './lessons/m2-fields-and-weights';
import instancing from './lessons/m2-instancing';
import mathPatterns from './lessons/m2-math-patterns';
import linesAndCurves from './lessons/m2-lines-and-curves';
import audioReactive from './lessons/m3-audio-reactive';
import particles from './lessons/m3-particles';
import feedbackAndTrails from './lessons/m3-feedback-and-trails';
import imagesToPoints from './lessons/m3-images-to-points';
import datavizTables from './lessons/m4-dataviz-tables';
import datavizTimeseries from './lessons/m4-dataviz-timeseries';
import datavizGlobe from './lessons/m4-dataviz-globe';
import datavizNetworks from './lessons/m4-dataviz-networks';
import glslPop from './lessons/m5-glsl-pop';
import strangeAttractors from './lessons/m5-strange-attractors';
import flocking from './lessons/m5-flocking';
import surfaceSimulations from './lessons/m5-surface-simulations';
import performance from './lessons/m6-performance';
import reusableComponents from './lessons/m6-reusable-components';
import interaction from './lessons/m6-interaction';
import capstone from './lessons/m6-capstone';

export const modules: Module[] = [
  {
    id: 'm1',
    number: 1,
    title: 'Thinking in Points',
    level: 'foundations',
    blurb: 'Get fluent with the POP mindset: points, attributes, and how POPs, CHOPs, TOPs and COMPs cooperate to put pixels on screen.',
    lessons: [firstPopNetwork, attributes, chopsDrivePops, renderStack],
  },
  {
    id: 'm2',
    number: 2,
    title: 'Shape, Repeat, Pattern',
    level: 'intermediate',
    blurb: 'The core toolkit for generative form: fields and weights, instancing, math-driven patterns, and expressive lines.',
    lessons: [fieldsAndWeights, instancing, mathPatterns, linesAndCurves],
  },
  {
    id: 'm3',
    number: 3,
    title: 'Motion & Simulation',
    level: 'intermediate',
    blurb: 'Make things move on their own: audio reactivity, particle systems, feedback loops and image-driven point clouds.',
    lessons: [audioReactive, particles, feedbackAndTrails, imagesToPoints],
  },
  {
    id: 'm4',
    number: 4,
    title: 'Data Visualization',
    level: 'intermediate',
    blurb: 'Turn tables, streams and feeds into legible, beautiful 3D graphics.',
    lessons: [datavizTables, datavizTimeseries, datavizGlobe, datavizNetworks],
  },
  {
    id: 'm5',
    number: 5,
    title: 'Advanced Techniques',
    level: 'advanced',
    blurb: 'Write your own GPU code and build simulations: GLSL POPs, attractors, flocking and texture-driven surfaces.',
    lessons: [glslPop, strangeAttractors, flocking, surfaceSimulations],
  },
  {
    id: 'm6',
    number: 6,
    title: 'Production',
    level: 'advanced',
    blurb: 'Ship it: profile and optimize, package reusable tools, wire up live control, and build a complete installation.',
    lessons: [performance, reusableComponents, interaction, capstone],
  },
];
