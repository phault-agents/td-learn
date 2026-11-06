import { allLessons, modules } from '../content';
import { HeroCanvas } from '../components/HeroCanvas';
import { Icon } from '../components/Icon';
import { href } from '../lib/router';
import { useProgress } from '../lib/progress';
import { totalMinutes } from '../lib/courseIndex';
import { LEVEL_LABEL } from './Learn';
import { NetworkView } from '../components/graph/NetworkView';
import firstLesson from '../content/lessons/m1-first-pop-network';

const demoBlock = firstLesson.blocks.find((b) => b.kind === 'graph');
const demoGraph = demoBlock && demoBlock.kind === 'graph' ? { ...demoBlock.graph, id: 'home-demo', caption: undefined, height: 460 } : null;

export function Home() {
  const prog = useProgress();
  const done = allLessons.filter((l) => prog.completed[l.lesson.slug]).length;
  const resume = allLessons.find((l) => l.lesson.slug === prog.lastLesson) ?? allLessons.find((l) => !prog.completed[l.lesson.slug]) ?? allLessons[0];
  const hours = Math.round(totalMinutes() / 60);
  return (
    <div className="home">
      <section className="hero">
        <HeroCanvas />
        <div className="hero-inner">
          <span className="hero-kicker">
            <span className="dot" /> Built for TouchDesigner 2025 and its new POP family
          </span>
          <h1>
            Learn TouchDesigner
            <br />
            <em>the point-first way.</em>
          </h1>
          <p className="hero-lede">
            A hands-on course for people who already know their way around the interface and want to build real things: generative art, particle systems, audio-reactive
            visuals and data visualizations — with POPs at the center.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href={href('lesson', resume.lesson.slug)}>
              {done ? 'Continue' : 'Start the course'} <Icon name="arrowRight" size={16} />
            </a>
            <a className="btn btn-lg" href={href('learn')}>
              See the curriculum
            </a>
          </div>
          <div className="hero-stats">
            <span>
              <b>{allLessons.length}</b> lessons
            </span>
            <span>
              <b>{modules.length}</b> modules
            </span>
            <span>
              <b>~{hours}h</b> of guided building
            </span>
            {done > 0 && (
              <span className="is-progress">
                <b>{done}</b> completed
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="home-how">
        <div className="how-card">
          <div className="how-num">1</div>
          <h3>Understand the idea</h3>
          <p>Each lesson starts with the concept — what the operators do and why the network is shaped the way it is.</p>
        </div>
        <div className="how-card">
          <div className="how-num">2</div>
          <h3>Follow the graph</h3>
          <p>Interactive network diagrams show every node, wire and reference. Step through the build and see exactly which parameters to change.</p>
        </div>
        <div className="how-card">
          <div className="how-num">3</div>
          <h3>Build it, then bend it</h3>
          <p>Recreate it in TouchDesigner, tick off nodes as you go, then push further with challenges and quizzes.</p>
        </div>
      </section>

      <section className="home-demo">
        <div className="demo-text">
          <h2>Every network, explorable</h2>
          <p className="section-lede">
            This is the real graph from lesson 1.1. Click nodes to see the exact parameters to set, double-click <code>geo1</code> to dive inside, or press{' '}
            <b>Build along</b> to rebuild it step by step.
          </p>
        </div>
        {demoGraph && <NetworkView graph={demoGraph} lessonTitle={firstLesson.title} />}
      </section>

      <section className="home-why">
        <div className="why-text">
          <h2>Why POPs?</h2>
          <p>
            POPs (Point Operators) are TouchDesigner's GPU-native geometry family. Points carry any attributes you like, every operation runs as a compute shader, and
            the math tools that used to require CHOP round-trips or GLSL live right in the network.
          </p>
          <p>
            This course teaches the modern workflow from day one: POPs for geometry and data, CHOPs for time and control, TOPs for images and post-processing, DATs for
            data and code, COMPs to hold it all together.
          </p>
          <a className="textlink" href={href('reference', 'pop-essentials')}>
            Read the POP essentials <Icon name="arrowRight" size={14} />
          </a>
        </div>
        <div className="why-grid">
          {[
            ['POP', 'Geometry, particles, point clouds, data points'],
            ['CHOP', 'Time, audio, control signals, devices'],
            ['TOP', 'Images, video, feedback, post FX'],
            ['DAT', 'Tables, JSON, text, Python'],
            ['COMP', 'Geometry, cameras, lights, windows, tools'],
            ['MAT', 'Shading the rendered result'],
          ].map(([f, d]) => (
            <div key={f} className={`why-fam fam-${f}`}>
              <b>{f}</b>
              <span>{d}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-map">
        <h2>The path</h2>
        <p className="section-lede">From your first POP network to a finished installation. Each module builds on the one before.</p>
        <div className="map-grid">
          {modules.map((m) => {
            const n = m.lessons.filter((l) => prog.completed[l.slug]).length;
            return (
              <a key={m.id} className={`map-card level-${m.level}`} href={href('lesson', m.lessons[0].slug)}>
                <div className="map-top">
                  <span className="map-num">Module {m.number}</span>
                  <span className={`levelpill level-${m.level}`}>{LEVEL_LABEL[m.level]}</span>
                </div>
                <h3>{m.title}</h3>
                <p>{m.blurb}</p>
                <ul>
                  {m.lessons.map((l) => (
                    <li key={l.slug} className={prog.completed[l.slug] ? 'is-done' : ''}>
                      <Icon name={prog.completed[l.slug] ? 'check' : 'right'} size={12} /> {l.title}
                    </li>
                  ))}
                </ul>
                <div className="map-progress">
                  <div style={{ width: `${(n / m.lessons.length) * 100}%` }} />
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="home-assume">
        <h2>Before you start</h2>
        <div className="assume-grid">
          <div>
            <h4>You should already…</h4>
            <ul>
              <li>Know the TouchDesigner interface: panes, the network editor, parameter dialogs, viewers.</li>
              <li>Be able to create operators, wire them, and set display/render flags.</li>
              <li>Recognize the operator families by color.</li>
            </ul>
          </div>
          <div>
            <h4>You'll need</h4>
            <ul>
              <li>TouchDesigner 2025.30000 or newer (POPs are part of the official build).</li>
              <li>A GPU that runs TouchDesigner comfortably — POPs are compute-shader based.</li>
              <li>The free Non-Commercial license is enough for every lesson (its 1280×1280 output cap is fine for learning).</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
