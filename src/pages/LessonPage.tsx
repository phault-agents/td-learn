import { useEffect } from 'react';
import { allLessons, findLesson, modules } from '../content';
import { BlockView } from '../components/Blocks';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { href } from '../lib/router';
import { progress, useProgress } from '../lib/progress';
import { lessonOps } from '../lib/courseIndex';
import { familyOf } from '../lib/opdb';
import { useOps } from '../lib/opsData';
import { LEVEL_LABEL } from './Learn';
import { NotFound } from './NotFound';

export function LessonPage({ slug, sub }: { slug: string; sub?: string }) {
  const ref = findLesson(slug);
  const prog = useProgress();
  const db = useOps();
  useEffect(() => {
    if (ref) progress.visit(slug);
  }, [slug, ref]);
  useEffect(() => {
    if (sub) {
      const el = document.getElementById(`graph-${sub}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } else window.scrollTo(0, 0);
  }, [slug, sub]);
  if (!ref) return <NotFound />;
  const { lesson, module, code, index } = ref;
  const prev = allLessons[index - 1];
  const next = allLessons[index + 1];
  const done = !!prog.completed[lesson.slug];
  const ops = lessonOps(lesson);
  const graphs = lesson.blocks.filter((b) => b.kind === 'graph').length;

  return (
    <div className="lesson-layout">
      <aside className="course-nav" aria-label="Course outline">
        {modules.map((m) => (
          <details key={m.id} open={m.id === module.id} className="cn-module">
            <summary>
              <span className="cn-num">{m.number}</span> {m.title}
            </summary>
            <ol>
              {m.lessons.map((l, i) => (
                <li key={l.slug}>
                  <a href={href('lesson', l.slug)} className={`${l.slug === lesson.slug ? 'is-current' : ''} ${prog.completed[l.slug] ? 'is-done' : ''}`}>
                    <span className="cn-code">{prog.completed[l.slug] ? <Icon name="check" size={12} /> : `${m.number}.${i + 1}`}</span>
                    {l.title}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </aside>

      <article className="lesson">
        <header className="lesson-hero">
          <div className="lesson-crumbs">
            <a href={href('learn')}>Course</a>
            <Icon name="right" size={12} />
            <span>
              Module {module.number} · {module.title}
            </span>
          </div>
          <div className="lesson-kicker">
            <span className="lesson-code">Lesson {code}</span>
            <span className={`levelpill level-${module.level}`}>{LEVEL_LABEL[module.level]}</span>
            <span className="lesson-meta">
              <Icon name="clock" size={13} /> {lesson.minutes} min
            </span>
            {graphs > 0 && (
              <span className="lesson-meta">
                <Icon name="layers" size={13} /> {graphs} network{graphs > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1>{lesson.title}</h1>
          <Markdown md={lesson.subtitle} className="lesson-subtitle" />
          <div className="lesson-intro-grid">
            <div className="objectives">
              <h2>You'll learn to</h2>
              <ul>
                {lesson.objectives.map((o, i) => (
                  <li key={i}>
                    <Icon name="check" size={14} />
                    <Markdown md={o} inline className="" />
                  </li>
                ))}
              </ul>
            </div>
            <div className="lesson-side">
              {lesson.requires?.length ? (
                <div className="lesson-requires">
                  <h3>Builds on</h3>
                  {lesson.requires.map((r) => {
                    const rl = findLesson(r);
                    return rl ? (
                      <a key={r} href={href('lesson', r)}>
                        {rl.code} {rl.lesson.title}
                      </a>
                    ) : null;
                  })}
                </div>
              ) : null}
              {ops.length > 0 && (
                <div className="lesson-ops">
                  <h3>Operators used</h3>
                  <div className="lesson-ops-list">
                    {ops
                      .sort((a, b) => familyOf(a).localeCompare(familyOf(b)) || a.localeCompare(b))
                      .map((t) => (
                        <a key={t} className={`opchip fam-${familyOf(t)}`} data-op={t} href={href('atlas', t)}>
                          <span className="opchip-dot" />
                          {db?.[t]?.label ?? t}
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="lesson-body">
          {lesson.blocks.map((b, i) => (
            <BlockView key={i} block={b} index={i} lessonSlug={lesson.slug} lessonTitle={lesson.title} />
          ))}
        </div>

        <footer className="lesson-foot">
          <button className={`complete-btn ${done ? 'is-done' : ''}`} onClick={() => progress.toggleComplete(lesson.slug)}>
            <span className="complete-check">
              <Icon name="check" size={16} />
            </span>
            {done ? 'Lesson complete' : 'Mark lesson complete'}
          </button>
          <nav className="lesson-pager">
            {prev ? (
              <a className="pager-card" href={href('lesson', prev.lesson.slug)}>
                <small>
                  <Icon name="left" size={12} /> Previous · {prev.code}
                </small>
                <b>{prev.lesson.title}</b>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a className="pager-card is-next" href={href('lesson', next.lesson.slug)} onClick={() => !done && progress.toggleComplete(lesson.slug, true)}>
                <small>
                  Next · {next.code} <Icon name="right" size={12} />
                </small>
                <b>{next.lesson.title}</b>
              </a>
            ) : (
              <a className="pager-card is-next" href={href('learn')}>
                <small>Finished!</small>
                <b>Back to the course map</b>
              </a>
            )}
          </nav>
        </footer>
      </article>
    </div>
  );
}
