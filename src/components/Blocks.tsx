import { useState } from 'react';
import type { Block, CalloutTone, QuizQuestion } from '../content/types';
import { Markdown } from './Markdown';
import { NetworkView } from './graph/NetworkView';
import { highlight } from '../lib/markdown';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';
import { progress, useProgress } from '../lib/progress';

const TONE: Record<CalloutTone, { icon: string; title: string }> = {
  tip: { icon: 'bulb', title: 'Tip' },
  note: { icon: 'info', title: 'Note' },
  warning: { icon: 'warn', title: 'Watch out' },
  perf: { icon: 'bolt', title: 'Performance' },
  concept: { icon: 'layers', title: 'Concept' },
  art: { icon: 'brush', title: 'Make it yours' },
};

export function BlockView({ block, lessonSlug, lessonTitle, index }: { block: Block; lessonSlug: string; lessonTitle: string; index: number }) {
  switch (block.kind) {
    case 'md':
      return <Markdown md={block.md} className="prose block-prose" />;
    case 'graph':
      return (
        <section className="block-graph" id={`graph-${block.graph.id}`}>
          <NetworkView graph={block.graph} lessonTitle={lessonTitle} />
        </section>
      );
    case 'callout': {
      const t = TONE[block.tone];
      return (
        <aside className={`callout tone-${block.tone}`}>
          <div className="callout-icon">
            <Icon name={t.icon} size={18} />
          </div>
          <div>
            <div className="callout-title">{block.title ?? t.title}</div>
            <Markdown md={block.md} className="prose prose-sm" />
          </div>
        </aside>
      );
    }
    case 'code':
      return (
        <figure className="codeblock">
          <figcaption>
            <span className="codeblock-lang">{block.lang}</span>
            {block.title && <span className="codeblock-title">{block.title}</span>}
            <CopyButton text={block.code} small />
          </figcaption>
          <pre className="md-code">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: highlight(block.code, block.lang) }} />
          </pre>
        </figure>
      );
    case 'challenge':
      return <Challenge block={block} />;
    case 'quiz':
      return <Quiz questions={block.questions} keyBase={`${lessonSlug}:${index}`} />;
    case 'compare':
      return (
        <div className="compare">
          <div className="compare-col">
            <div className="compare-title">{block.left.title}</div>
            <Markdown md={block.left.md} className="prose prose-sm" />
          </div>
          <div className="compare-col">
            <div className="compare-title">{block.right.title}</div>
            <Markdown md={block.right.md} className="prose prose-sm" />
          </div>
        </div>
      );
  }
}

function Challenge({ block }: { block: Extract<Block, { kind: 'challenge' }> }) {
  const [hints, setHints] = useState(0);
  const [sol, setSol] = useState(false);
  return (
    <section className="challenge">
      <div className="challenge-head">
        <Icon name="target" size={18} />
        <span className="challenge-kicker">Challenge</span>
        <h3>{block.title}</h3>
      </div>
      <Markdown md={block.md} className="prose prose-sm" />
      {block.hints?.slice(0, hints).map((h, i) => (
        <div key={i} className="challenge-hint">
          <span>Hint {i + 1}</span>
          <Markdown md={h} className="prose prose-sm" />
        </div>
      ))}
      {sol && block.solution && (
        <div className="challenge-solution">
          <span>One solution</span>
          <Markdown md={block.solution} className="prose prose-sm" />
        </div>
      )}
      <div className="challenge-actions">
        {block.hints && hints < block.hints.length && (
          <button className="btn btn-ghost" onClick={() => setHints(hints + 1)}>
            <Icon name="bulb" size={14} /> {hints ? 'Another hint' : 'Show a hint'}
          </button>
        )}
        {block.solution && (
          <button className="btn btn-ghost" onClick={() => setSol(!sol)}>
            {sol ? 'Hide solution' : 'Reveal a solution'}
          </button>
        )}
      </div>
    </section>
  );
}

function Quiz({ questions, keyBase }: { questions: QuizQuestion[]; keyBase: string }) {
  const prog = useProgress();
  const answered = questions.filter((_, i) => prog.quiz[`${keyBase}:${i}`] !== undefined);
  const correct = questions.filter((q, i) => prog.quiz[`${keyBase}:${i}`] === q.answer).length;
  return (
    <section className="quiz">
      <div className="quiz-head">
        <Icon name="flag" size={18} />
        <h3>Check your understanding</h3>
        {answered.length === questions.length && (
          <span className={`quiz-score ${correct === questions.length ? 'is-perfect' : ''}`}>
            {correct}/{questions.length}
          </span>
        )}
      </div>
      <ol className="quiz-list">
        {questions.map((q, i) => {
          const key = `${keyBase}:${i}`;
          const chosen = prog.quiz[key];
          const done = chosen !== undefined;
          return (
            <li key={i} className="quiz-q">
              <Markdown md={q.q} className="prose prose-sm quiz-question" />
              <div className="quiz-options">
                {q.options.map((o, j) => {
                  const state = !done ? '' : j === q.answer ? 'is-right' : j === chosen ? 'is-wrong' : 'is-dim';
                  return (
                    <button key={j} className={`quiz-opt ${state}`} disabled={done} onClick={() => progress.answer(key, j)}>
                      <span className="quiz-letter">{String.fromCharCode(65 + j)}</span>
                      <Markdown md={o} inline className="" />
                    </button>
                  );
                })}
              </div>
              {done && (
                <div className={`quiz-explain ${chosen === q.answer ? 'is-right' : 'is-wrong'}`}>
                  <b>{chosen === q.answer ? 'Correct.' : 'Not quite.'}</b> <Markdown md={q.explain} inline className="" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {answered.length > 0 && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => progress.clearAnswers(questions.map((_, i) => `${keyBase}:${i}`))}
        >
          <Icon name="reset" size={13} /> Reset quiz
        </button>
      )}
    </section>
  );
}
