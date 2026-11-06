import type { Lesson, Module, OpBlurb } from './types';
import { modules } from './curriculum';
import { blurbs as core } from './blurbs/core';
import { blurbs as b1 } from './blurbs/m1';
import { blurbs as b2 } from './blurbs/m2';
import { blurbs as b3 } from './blurbs/m3';
import { blurbs as b4 } from './blurbs/m4';
import { blurbs as b5 } from './blurbs/m5';
import { blurbs as b6 } from './blurbs/m6';
import { blurbs as atlas } from './blurbs/atlas';

export { modules };

/** Blurb sources in priority order (first wins). */
export const blurbSources: [string, Record<string, OpBlurb>][] = [
  ['core', core],
  ['m1', b1],
  ['m2', b2],
  ['m3', b3],
  ['m4', b4],
  ['m5', b5],
  ['m6', b6],
  ['atlas', atlas],
];

export const blurbs: Record<string, OpBlurb> = {};
for (const [, src] of blurbSources) {
  for (const [k, v] of Object.entries(src)) if (!blurbs[k]) blurbs[k] = v;
}

export interface LessonRef {
  lesson: Lesson;
  module: Module;
  /** global index across the course */
  index: number;
  /** e.g. "2.3" */
  code: string;
}

export const allLessons: LessonRef[] = [];
modules.forEach((module) => {
  module.lessons.forEach((lesson, i) => {
    allLessons.push({ lesson, module, index: allLessons.length, code: `${module.number}.${i + 1}` });
  });
});

export function findLesson(slug: string): LessonRef | undefined {
  return allLessons.find((l) => l.lesson.slug === slug);
}
