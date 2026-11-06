import { useSyncExternalStore } from 'react';

/** Learner progress, persisted per-browser in localStorage (all access wrapped in try/catch). */
export interface Progress {
  completed: Record<string, number>;
  /** graphId → node ids the learner ticked as built */
  built: Record<string, string[]>;
  /** `${slug}:${quizIndex}:${q}` → chosen option */
  quiz: Record<string, number>;
  lastLesson?: string;
}

const KEY = 'tdl.progress.v1';
const empty: Progress = { completed: {}, built: {}, quiz: {} };
let state: Progress = load();
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { ...empty };
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
function set(next: Progress) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export const progress = {
  get: () => state,
  toggleComplete(slug: string, value?: boolean) {
    const completed = { ...state.completed };
    const on = value ?? !completed[slug];
    if (on) completed[slug] = Date.now();
    else delete completed[slug];
    set({ ...state, completed });
  },
  toggleBuilt(graphId: string, nodeId: string) {
    const cur = new Set(state.built[graphId] || []);
    if (cur.has(nodeId)) cur.delete(nodeId);
    else cur.add(nodeId);
    set({ ...state, built: { ...state.built, [graphId]: [...cur] } });
  },
  setBuilt(graphId: string, nodeIds: string[]) {
    set({ ...state, built: { ...state.built, [graphId]: nodeIds } });
  },
  answer(key: string, option: number) {
    set({ ...state, quiz: { ...state.quiz, [key]: option } });
  },
  clearAnswers(keys: string[]) {
    const quiz = { ...state.quiz };
    keys.forEach((k) => delete quiz[k]);
    set({ ...state, quiz });
  },
  visit(slug: string) {
    if (state.lastLesson !== slug) set({ ...state, lastLesson: slug });
  },
  reset() {
    set({ ...empty });
  },
};
