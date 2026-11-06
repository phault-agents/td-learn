import { useEffect, useState } from 'react';
import { useRoute } from './lib/router';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { OpTooltip } from './components/OpTooltip';
import { Home } from './pages/Home';
import { Learn } from './pages/Learn';
import { LessonPage } from './pages/LessonPage';
import { Atlas } from './pages/Atlas';
import { OpPage } from './pages/OpPage';
import { Reference } from './pages/Reference';
import { NotFound } from './pages/NotFound';
import { findLesson } from './content';

export function App() {
  const route = useRoute();
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const base = 'TD Learning';
    let t = base;
    if (route.name === 'lesson' && route.param) {
      const l = findLesson(route.param);
      if (l) t = `${l.code} ${l.lesson.title} · ${base}`;
    } else if (route.name === 'learn') t = `Course · ${base}`;
    else if (route.name === 'atlas') t = `Operators · ${base}`;
    else if (route.name === 'op') t = `${route.param} · ${base}`;
    else if (route.name === 'reference') t = `Reference · ${base}`;
    document.title = t;
    if (route.name !== 'lesson') window.scrollTo(0, 0);
  }, [route.name, route.param]);

  let page;
  switch (route.name) {
    case 'home':
      page = <Home />;
      break;
    case 'learn':
      page = <Learn />;
      break;
    case 'lesson':
      page = <LessonPage key={route.param} slug={route.param!} sub={route.sub} />;
      break;
    case 'atlas':
      page = <Atlas />;
      break;
    case 'op':
      page = <OpPage type={route.param!} />;
      break;
    case 'reference':
      page = <Reference id={route.param} />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Header route={route} onSearch={() => setSearch(true)} />
      <main id="main" className={`main route-${route.name}`}>
        {page}
      </main>
      <footer className="site-footer">
        <p>
          An independent learning resource for <a href="https://derivative.ca" target="_blank" rel="noopener noreferrer">TouchDesigner</a>. Not affiliated with or endorsed by
          Derivative. TouchDesigner is a trademark of Derivative Inc. Parameter names are taken from the official documentation at{' '}
          <a href="https://docs.derivative.ca" target="_blank" rel="noopener noreferrer">docs.derivative.ca</a>.
        </p>
        <p className="dim">Progress is saved in this browser only.</p>
      </footer>
      {search && <CommandPalette onClose={() => setSearch(false)} />}
      <OpTooltip />
    </>
  );
}
