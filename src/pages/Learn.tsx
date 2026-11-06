import { modules } from '../content';
import type { Level } from '../content/types';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { href } from '../lib/router';
import { progress, useProgress } from '../lib/progress';
import { totalMinutes } from '../lib/courseIndex';

export const LEVEL_LABEL: Record<Level, string> = {
  foundations: 'Foundations',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export function Learn() {
  const prog = useProgress();
  const total = modules.reduce((a, m) => a + m.lessons.length, 0);
  const done = modules.reduce((a, m) => a + m.lessons.filter((l) => prog.completed[l.slug]).length, 0);
  return (
    <div className="page learn">
      <header className="page-head">
        <h1>The Course</h1>
        <p className="section-lede">
          {total} lessons in {modules.length} modules · about {Math.round(totalMinutes() / 60)} hours of building. Work through in order, or jump to what you need — each lesson lists
          what it builds on.
        </p>
        <div className="learn-progress">
          <div className="learn-bar">
            <div style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span>
            {done}/{total} complete
          </span>
          {done > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (confirm('Reset all course progress stored in this browser?')) progress.reset();
              }}
            >
              <Icon name="reset" size={13} /> Reset
            </button>
          )}
        </div>
      </header>
      {modules.map((m) => (
        <section key={m.id} className={`learn-module level-${m.level}`}>
          <div className="learn-module-head">
            <span className="map-num">Module {m.number}</span>
            <span className={`levelpill level-${m.level}`}>{LEVEL_LABEL[m.level]}</span>
            <h2>{m.title}</h2>
            <p>{m.blurb}</p>
          </div>
          <ol className="learn-lessons">
            {m.lessons.map((l, i) => {
              const isDone = !!prog.completed[l.slug];
              return (
                <li key={l.slug}>
                  <a className={`lesson-row ${isDone ? 'is-done' : ''}`} href={href('lesson', l.slug)}>
                    <span className="lesson-row-num">{isDone ? <Icon name="check" size={16} /> : `${m.number}.${i + 1}`}</span>
                    <span className="lesson-row-text">
                      <b>{l.title}</b>
                      <Markdown md={l.subtitle} inline className="lesson-row-sub" />
                    </span>
                    <span className="lesson-row-meta">
                      <Icon name="clock" size={13} /> {l.minutes} min
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
