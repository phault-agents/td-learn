import { useEffect, useState } from 'react';
import { href, type Route } from '../lib/router';
import { Icon } from './Icon';

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect x="1" y="1" width="30" height="30" rx="8" className="logo-bg" />
      <path d="M8 21 C 12 21, 12 11, 16 11 S 20 21, 24 21" fill="none" stroke="#f2924a" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <circle cx="8" cy="21" r="2.6" fill="#a184f0" />
      <circle cx="16" cy="11" r="2.6" fill="#f2924a" />
      <circle cx="24" cy="21" r="2.6" fill="#5cc98e" />
    </svg>
  );
}

function getTheme(): 'dark' | 'light' {
  try {
    const t = localStorage.getItem('tdl.theme');
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return 'dark';
}

export function Header({ route, onSearch }: { route: Route; onSearch: () => void }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('tdl.theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const is = (...names: Route['name'][]) => (names.includes(route.name) ? 'is-active' : '');
  return (
    <header className="site-header">
      <a className="brand" href={href()}>
        <Logo />
        <span className="brand-text">
          TD Learning <small>POP-first TouchDesigner</small>
        </span>
      </a>
      <nav className="site-nav" aria-label="Main">
        <a className={is('learn', 'lesson')} href={href('learn')}>
          <Icon name="book" size={15} /> <span>Course</span>
        </a>
        <a className={is('atlas', 'op')} href={href('atlas')}>
          <Icon name="grid" size={15} /> <span>Operators</span>
        </a>
        <a className={is('reference')} href={href('reference')}>
          <Icon name="list" size={15} /> <span>Reference</span>
        </a>
      </nav>
      <div className="site-tools">
        <button className="search-btn" onClick={onSearch} aria-label="Search (Ctrl+K)">
          <Icon name="search" size={15} />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle light/dark theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
      </div>
    </header>
  );
}
