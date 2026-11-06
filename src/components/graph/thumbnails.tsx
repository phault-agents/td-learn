import type { ReactElement } from 'react';
import { familyOf } from '../../lib/opdb';

/**
 * Procedural "viewer" art for node tiles. Purely illustrative: each operator gets a small
 * drawing that hints at what its viewer would show in TouchDesigner.
 */
export const TW = 148;
export const TH = 62;

type Art = (rnd: () => number, color: string, uid: string) => ReactElement;

function rng(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cx = TW / 2;
const cy = TH / 2;

function dots(pts: [number, number, number?][], color: string, base = 1.3) {
  return (
    <g fill={color}>
      {pts.map(([x, y, z = 1], i) => (
        <circle key={i} cx={x} cy={y} r={base * (0.55 + 0.6 * z)} opacity={0.35 + 0.65 * z} />
      ))}
    </g>
  );
}

const sphere: Art = (_r, c) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const lat = -Math.PI / 2 + ((i + 0.5) / 9) * Math.PI;
    const ring = Math.max(4, Math.round(16 * Math.cos(lat)));
    for (let j = 0; j < ring; j++) {
      const lon = (j / ring) * Math.PI * 2 + i * 0.3;
      const x = Math.cos(lat) * Math.cos(lon);
      const z = Math.cos(lat) * Math.sin(lon);
      const y = Math.sin(lat);
      pts.push([cx + x * 25, cy - y * 25, (z + 1) / 2]);
    }
  }
  return dots(pts, c, 1.2);
};

const grid: Art = (_r, c) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 13; j++) {
      const z = i / 8;
      const persp = 0.55 + 0.45 * z;
      pts.push([cx + (j - 6) * 9 * persp, 12 + z * 40, z]);
    }
  return dots(pts, c, 1.1);
};

const noiseSurface: Art = (r, c) => {
  const pts: [number, number, number][] = [];
  const ph = r() * 6;
  for (let i = 0; i < 9; i++)
    for (let j = 0; j < 15; j++) {
      const z = i / 8;
      const persp = 0.55 + 0.45 * z;
      const h = Math.sin(j * 0.6 + ph) * Math.cos(i * 0.7 + ph * 0.5) * 7 + Math.sin(j * 1.7 + i) * 2;
      pts.push([cx + (j - 7) * 8.5 * persp, 14 + z * 38 - h * persp, z]);
    }
  return dots(pts, c, 1.05);
};

const box: Art = (_r, c) => {
  const s = 18;
  const iso = (x: number, y: number, z: number): [number, number] => [cx + (x - z) * s * 0.9, cy + (x + z) * s * 0.45 - y * s];
  const corners = [
    [-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1],
    [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1],
  ].map(([x, y, z]) => iso(x * 0.75, y * 0.75, z * 0.75));
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  return (
    <g>
      <g stroke={c} strokeWidth={1} opacity={0.6}>
        {e.map(([a, b], i) => (
          <line key={i} x1={corners[a][0]} y1={corners[a][1]} x2={corners[b][0]} y2={corners[b][1]} />
        ))}
      </g>
      {dots(corners.map(([x, y]) => [x, y, 1] as [number, number, number]), c, 1.6)}
    </g>
  );
};

const torus: Art = (_r, c) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 28; i++)
    for (let j = 0; j < 7; j++) {
      const u = (i / 28) * Math.PI * 2;
      const v = (j / 7) * Math.PI * 2;
      const R = 1, rr = 0.38;
      const x = (R + rr * Math.cos(v)) * Math.cos(u);
      const z = (R + rr * Math.cos(v)) * Math.sin(u);
      const y = rr * Math.sin(v);
      pts.push([cx + x * 30, cy + z * 13 - y * 16, (z + 1.4) / 2.8]);
    }
  return dots(pts, c, 1);
};

const circle: Art = (_r, c) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, 1]);
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={24} fill="none" stroke={c} strokeOpacity={0.35} />
      {dots(pts, c, 1.2)}
    </g>
  );
};

const curve: Art = (r, c) => {
  const pts: [number, number, number][] = [];
  const a = 2 + Math.floor(r() * 3), b = 3 + Math.floor(r() * 2), ph = r() * 3;
  let d = '';
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const x = cx + Math.sin(a * t + ph) * 50;
    const y = cy + Math.sin(b * t) * 22;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    if (i % 6 === 0) pts.push([x, y, 1]);
  }
  return (
    <g>
      <path d={d} fill="none" stroke={c} strokeWidth={1.4} strokeOpacity={0.85} />
      {dots(pts, c, 1)}
    </g>
  );
};

const cloud: Art = (r, c) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, rad = Math.sqrt(r()) * 26;
    const z = r();
    pts.push([cx + Math.cos(a) * rad * 1.6, cy + Math.sin(a) * rad * 0.9, z]);
  }
  return dots(pts, c, 0.9);
};

const particles: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 18 + r() * 112, y = 8 + r() * 46;
    const dx = 6 + r() * 10, dy = -3 + r() * 6;
    els.push(<line key={'l' + i} x1={x - dx} y1={y - dy} x2={x} y2={y} stroke={c} strokeOpacity={0.35} strokeWidth={1} />);
    els.push(<circle key={'c' + i} cx={x} cy={y} r={1.4} fill={c} />);
  }
  return <g strokeLinecap="round">{els}</g>;
};

const trail: Art = (r, c) => {
  const paths: ReactElement[] = [];
  for (let k = 0; k < 7; k++) {
    let d = '';
    const ph = r() * 6, amp = 6 + r() * 10, y0 = 10 + k * 7;
    for (let i = 0; i <= 40; i++) {
      const x = 10 + i * 3.2;
      const y = y0 + Math.sin(i * 0.22 + ph) * amp * (i / 40);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    paths.push(<path key={k} d={d} fill="none" stroke={c} strokeWidth={1.2} strokeOpacity={0.3 + k * 0.09} />);
  }
  return <g>{paths}</g>;
};

const copies: Art = (_r, c) => {
  const els: ReactElement[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 8; j++) {
      const s = 4 + ((i + j) % 3);
      els.push(<rect key={`${i}-${j}`} x={20 + j * 14 - s / 2} y={12 + i * 12 - s / 2} width={s} height={s} rx={1} fill={c} opacity={0.4 + ((i * 8 + j) % 5) * 0.12} />);
    }
  return <g>{els}</g>;
};

const field: Art = (_r, c, uid) => {
  const pts: [number, number, number][] = [];
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 14; j++) {
      const x = 14 + j * 9.3, y = 7 + i * 8;
      const d = Math.hypot(x - cx, (y - cy) * 1.6);
      pts.push([x, y, Math.max(0.08, 1 - d / 34)]);
    }
  return (
    <g>
      <defs>
        <radialGradient id={`fg${uid}`}>
          <stop offset="0" stopColor={c} stopOpacity={0.45} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={40} ry={26} fill={`url(#fg${uid})`} />
      {dots(pts, c, 1.15)}
    </g>
  );
};

const bars: Art = (r, c) => {
  const els: ReactElement[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const h = 6 + Math.abs(Math.sin(i * 0.7 + r() * 0.5)) * 36 * (1 - i / (n * 1.6));
    els.push(<rect key={i} x={14 + i * 8.6} y={54 - h} width={5.6} height={h} rx={1} fill={c} opacity={0.45 + 0.5 * (h / 42)} />);
  }
  return <g>{els}</g>;
};

const valueBars: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let i = 0; i < 18; i++) {
    const v = r();
    els.push(<line key={i} x1={14 + i * 6.8} y1={52} x2={14 + i * 6.8} y2={52 - v * 38} stroke={c} strokeWidth={2.4} strokeOpacity={0.4 + v * 0.6} strokeLinecap="round" />);
  }
  return (
    <g>
      <line x1={10} y1={52} x2={138} y2={52} stroke={c} strokeOpacity={0.3} />
      {els}
    </g>
  );
};

const attrStrips: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let row = 0; row < 4; row++)
    for (let i = 0; i < 12; i++) {
      els.push(<rect key={`${row}-${i}`} x={12 + i * 10.5} y={9 + row * 11.5} width={9} height={9} rx={1.5} fill={c} opacity={0.15 + r() * 0.8} />);
    }
  return <g>{els}</g>;
};

const codeGlyph: Art = (r, c) => {
  const els: ReactElement[] = [];
  const widths = [60, 84, 40, 96, 70, 52];
  widths.forEach((w, i) => {
    const indent = i === 0 || i === 5 ? 0 : 10;
    els.push(<rect key={i} x={22 + indent} y={8 + i * 8} width={w * (0.7 + r() * 0.3)} height={3.2} rx={1.6} fill={c} opacity={0.35 + (i % 3) * 0.2} />);
  });
  return (
    <g>
      <text x={8} y={36} fill={c} fontSize={18} fontFamily="JetBrains Mono, monospace" opacity={0.9}>{'{'}</text>
      <text x={130} y={36} fill={c} fontSize={18} fontFamily="JetBrains Mono, monospace" opacity={0.9}>{'}'}</text>
      {els}
    </g>
  );
};

const plexus: Art = (r, c) => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 22; i++) pts.push([12 + r() * 124, 6 + r() * 50]);
  const lines: ReactElement[] = [];
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
      if (d < 30) lines.push(<line key={`${i}-${j}`} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]} stroke={c} strokeOpacity={1 - d / 30} strokeWidth={0.8} />);
    }
  return (
    <g>
      {lines}
      {dots(pts.map(([x, y]) => [x, y, 1] as [number, number, number]), c, 1.1)}
    </g>
  );
};

const feedbackLoop: Art = (r, c) => (
  <g fill="none" stroke={c} strokeWidth={1.6}>
    <path d={`M ${cx + 22} ${cy} A 22 18 0 1 1 ${cx + 15} ${cy - 13}`} strokeOpacity={0.9} />
    <path d={`M ${cx + 15} ${cy - 13} l 1 -7 m -1 7 l 7 -1`} strokeOpacity={0.9} />
    {cloud(r, c, '')}
  </g>
);

const textGlyph: Art = (_r, c) => (
  <text x={cx} y={cy + 10} textAnchor="middle" fill={c} fontSize={28} fontWeight={700} fontFamily="Inter, system-ui, sans-serif" opacity={0.9}>
    Aa
  </text>
);

// ---- TOP art -----------------------------------------------------------------------------

const noiseTex: Art = (r, c, uid) => (
  <g>
    <defs>
      <filter id={`nt${uid}`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.035 + r() * 0.03} numOctaves={3} seed={Math.floor(r() * 100)} />
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 -0.35" />
      </filter>
    </defs>
    <rect width={TW} height={TH} fill="#000" />
    <rect width={TW} height={TH} fill="#fff" filter={`url(#nt${uid})`} />
    <rect width={TW} height={TH} fill={c} opacity={0.12} />
  </g>
);

const ramp: Art = (_r, _c, uid) => (
  <g>
    <defs>
      <linearGradient id={`rg${uid}`}>
        <stop offset="0" stopColor="#13072e" />
        <stop offset="0.3" stopColor="#6b2fa0" />
        <stop offset="0.6" stopColor="#e8546a" />
        <stop offset="0.85" stopColor="#f7b24a" />
        <stop offset="1" stopColor="#fff3c4" />
      </linearGradient>
    </defs>
    <rect width={TW} height={TH} fill={`url(#rg${uid})`} />
  </g>
);

const renderArt: Art = (r, c, uid) => (
  <g>
    <defs>
      <radialGradient id={`rs${uid}`} cx="0.38" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" stopOpacity={0.95} />
        <stop offset="0.35" stopColor={c} stopOpacity={0.9} />
        <stop offset="1" stopColor="#000" stopOpacity={0.9} />
      </radialGradient>
    </defs>
    <rect width={TW} height={TH} fill="#06070a" />
    <g opacity={0.4}>{cloud(r, c, '')}</g>
    <circle cx={cx} cy={cy} r={20} fill={`url(#rs${uid})`} />
  </g>
);

const glow: Art = (r, c, uid) => (
  <g>
    <defs>
      <filter id={`gl${uid}`}>
        <feGaussianBlur stdDeviation={5} />
      </filter>
    </defs>
    <rect width={TW} height={TH} fill="#050508" />
    <g filter={`url(#gl${uid})`}>
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={30 + r() * 90} cy={12 + r() * 38} r={6 + r() * 9} fill={i % 2 ? c : '#ffd6a0'} opacity={0.85} />
      ))}
    </g>
    {[0, 1, 2].map((i) => (
      <circle key={i} cx={30 + r() * 90} cy={12 + r() * 38} r={2.2} fill="#fff" />
    ))}
  </g>
);

const swirl: Art = (_r, c) => {
  const paths: ReactElement[] = [];
  for (let k = 0; k < 6; k++) {
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const a = t * Math.PI * 3 + k;
      const rad = 4 + t * 26;
      d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rad * 1.5).toFixed(1)},${(cy + Math.sin(a) * rad * 0.8).toFixed(1)}`;
    }
    paths.push(<path key={k} d={d} fill="none" stroke={c} strokeOpacity={0.15 + k * 0.13} strokeWidth={1.2} />);
  }
  return (
    <g>
      <rect width={TW} height={TH} fill="#07060c" />
      {paths}
    </g>
  );
};

const imageArt: Art = (_r, c, uid) => (
  <g>
    <defs>
      <linearGradient id={`sky${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1b2440" />
        <stop offset="1" stopColor="#d27a5c" />
      </linearGradient>
    </defs>
    <rect width={TW} height={TH} fill={`url(#sky${uid})`} />
    <circle cx={104} cy={22} r={8} fill="#ffe1a8" />
    <path d={`M0 ${TH} L0 44 L28 30 L52 42 L80 24 L112 44 L148 34 L148 ${TH} Z`} fill="#0d1020" />
    <rect width={TW} height={TH} fill={c} opacity={0.08} />
  </g>
);

const composite: Art = (_r, c) => (
  <g style={{ mixBlendMode: 'screen' }}>
    <rect width={TW} height={TH} fill="#08080c" />
    <circle cx={cx - 14} cy={cy} r={20} fill={c} opacity={0.75} />
    <circle cx={cx + 14} cy={cy} r={20} fill="#46c7ff" opacity={0.6} />
  </g>
);

const levels: Art = (_r, c, uid) => (
  <g>
    <defs>
      <linearGradient id={`lv${uid}`}>
        <stop offset="0" stopColor="#000" />
        <stop offset="1" stopColor="#fff" />
      </linearGradient>
    </defs>
    <rect width={TW} height={TH} fill={`url(#lv${uid})`} opacity={0.75} />
    <path d={`M8 54 C 50 54, 70 10, 140 8`} fill="none" stroke={c} strokeWidth={2} />
  </g>
);

const blurArt: Art = (r, c, uid) => (
  <g>
    <defs>
      <filter id={`bl${uid}`}>
        <feGaussianBlur stdDeviation={6} />
      </filter>
    </defs>
    <rect width={TW} height={TH} fill="#08080c" />
    <g filter={`url(#bl${uid})`}>
      <rect x={20 + r() * 20} y={14} width={40} height={30} fill={c} />
      <circle cx={100} cy={30} r={16} fill="#eee" opacity={0.8} />
    </g>
  </g>
);

const gradientImg: Art = (_r, c, uid) => (
  <g>
    <defs>
      <linearGradient id={`gi${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#0a0a12" />
        <stop offset="1" stopColor={c} />
      </linearGradient>
    </defs>
    <rect width={TW} height={TH} fill={`url(#gi${uid})`} />
  </g>
);

// ---- CHOP art ----------------------------------------------------------------------------

function wave(fn: (t: number) => number, c: string, extra?: ReactElement) {
  let d = '';
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    d += `${i ? 'L' : 'M'}${(8 + t * 132).toFixed(1)},${(cy - fn(t) * 22).toFixed(1)}`;
  }
  return (
    <g>
      <line x1={8} y1={cy} x2={140} y2={cy} stroke={c} strokeOpacity={0.18} />
      {extra}
      <path d={d} fill="none" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

const sine: Art = (_r, c) => wave((t) => Math.sin(t * Math.PI * 4), c);
const noisyWave: Art = (r, c) => {
  const a = r() * 10;
  return wave((t) => 0.6 * Math.sin(t * 9 + a) * Math.cos(t * 3.3 + a) + 0.35 * Math.sin(t * 23 + a * 2), c);
};
const audioWave: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let i = 0; i < 66; i++) {
    const env = Math.sin((i / 66) * Math.PI) * (0.4 + 0.6 * r());
    els.push(<line key={i} x1={8 + i * 2} y1={cy - env * 24} x2={8 + i * 2} y2={cy + env * 24} stroke={c} strokeWidth={1.1} />);
  }
  return <g>{els}</g>;
};
const smoothStep: Art = (_r, c) =>
  wave((t) => (t < 0.3 ? -0.7 : t < 0.65 ? 0.8 - 1.5 * Math.exp(-(t - 0.3) * 18) : -0.7 + 1.5 * Math.exp(-(t - 0.65) * 18)), c,
    <path d={`M8 ${cy + 15} H 47 V ${cy - 18} H 94 V ${cy + 15} H 140`} fill="none" stroke={c} strokeOpacity={0.3} strokeDasharray="2 3" />);
const rampWave: Art = (_r, c) => wave((t) => ((t * 2) % 1) * 1.6 - 0.8, c);
const flat: Art = (_r, c) => (
  <g stroke={c} strokeWidth={1.6}>
    <line x1={8} y1={20} x2={140} y2={20} />
    <line x1={8} y1={38} x2={140} y2={38} strokeOpacity={0.6} />
  </g>
);
const pulses: Art = (_r, c) => {
  let d = `M8 ${cy + 16}`;
  for (let i = 0; i < 6; i++) {
    const x = 16 + i * 22;
    d += ` H ${x} V ${cy - 18} L ${x + 8} ${cy + 16}`;
  }
  d += ' H 140';
  return <path d={d} fill="none" stroke={c} strokeWidth={1.5} />;
};
const multiWave: Art = (r, c) => {
  const a = r() * 5;
  return (
    <g>
      {wave((t) => 0.5 * Math.sin(t * 7 + a), c)}
      <g opacity={0.55}>{wave((t) => 0.7 * Math.cos(t * 4 + a), c)}</g>
    </g>
  );
};
const deviceArt: Art = (r, c) => (
  <g>
    <g opacity={0.5}>{noisyWave(r, c, '')}</g>
    <rect x={56} y={14} width={36} height={34} rx={7} fill="#0b0c10" stroke={c} strokeWidth={1.4} />
    <circle cx={74} cy={31} r={7} fill="none" stroke={c} strokeWidth={1.4} />
  </g>
);

// ---- DAT art -----------------------------------------------------------------------------

const tableArt: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 4; col++) {
      els.push(<rect key={`${row}-${col}`} x={10 + col * 32} y={5 + row * 10.5} width={30} height={9} fill={row === 0 ? c : '#ffffff'} opacity={row === 0 ? 0.55 : 0.06 + r() * 0.06} />);
      if (row > 0) els.push(<rect key={`t${row}-${col}`} x={13 + col * 32} y={8.5 + row * 10.5} width={8 + r() * 16} height={2} rx={1} fill="#fff" opacity={0.5} />);
    }
  return <g>{els}</g>;
};
const textLines: Art = (r, c) => {
  const els: ReactElement[] = [];
  for (let i = 0; i < 6; i++) els.push(<rect key={i} x={12} y={8 + i * 8} width={50 + r() * 70} height={3} rx={1.5} fill={c} opacity={0.5} />);
  return <g>{els}</g>;
};
const jsonArt: Art = (_r, c) => (
  <g fontFamily="JetBrains Mono, monospace" fontSize={9} fill={c}>
    <text x={12} y={14}>{'{ "data": ['}</text>
    <text x={22} y={26} opacity={0.75}>{'{"lat": 35.6,'}</text>
    <text x={22} y={38} opacity={0.6}>{' "mag": 4.2},'}</text>
    <text x={12} y={52}>{']}'}</text>
  </g>
);
const webArt: Art = (_r, c) => (
  <g fill="none" stroke={c} strokeWidth={1.3}>
    <circle cx={cx} cy={cy} r={22} />
    <ellipse cx={cx} cy={cy} rx={9} ry={22} />
    <line x1={cx - 22} y1={cy} x2={cx + 22} y2={cy} />
    <path d={`M${cx - 19} ${cy - 11} H ${cx + 19} M${cx - 19} ${cy + 11} H ${cx + 19}`} strokeOpacity={0.6} />
  </g>
);

// ---- COMP art ----------------------------------------------------------------------------

const geoArt: Art = (r, c) => (
  <g>
    {box(r, c, '')}
    <g strokeWidth={1.4}>
      <line x1={22} y1={50} x2={40} y2={50} stroke="#e5534b" />
      <line x1={22} y1={50} x2={22} y2={32} stroke="#57ab5a" />
      <line x1={22} y1={50} x2={12} y2={56} stroke="#539bf5" />
    </g>
  </g>
);
const cameraArt: Art = (_r, c) => (
  <g fill="none" stroke={c} strokeWidth={1.5}>
    <rect x={46} y={20} width={38} height={24} rx={4} />
    <path d="M84 27 L102 18 V46 L84 37" />
    <circle cx={58} cy={14} r={6} />
    <circle cx={74} cy={14} r={6} />
  </g>
);
const lightArt: Art = (_r, c) => (
  <g stroke={c} strokeWidth={1.5} fill="none">
    <circle cx={cx} cy={cy - 4} r={10} fill={c} fillOpacity={0.25} />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const a = (i / 8) * Math.PI * 2;
      return <line key={i} x1={cx + Math.cos(a) * 15} y1={cy - 4 + Math.sin(a) * 15} x2={cx + Math.cos(a) * 21} y2={cy - 4 + Math.sin(a) * 21} />;
    })}
  </g>
);
const windowArt: Art = (_r, c) => (
  <g fill="none" stroke={c} strokeWidth={1.4}>
    <rect x={34} y={10} width={80} height={44} rx={3} />
    <line x1={34} y1={18} x2={114} y2={18} />
    <circle cx={40} cy={14} r={1.5} fill={c} />
    <circle cx={45} cy={14} r={1.5} fill={c} />
  </g>
);
const containerArt: Art = (_r, c) => (
  <g fill="none" stroke={c} strokeWidth={1.3}>
    <rect x={36} y={10} width={76} height={44} rx={5} strokeOpacity={0.7} />
    <rect x={46} y={22} width={18} height={14} rx={2} fill={c} fillOpacity={0.3} />
    <rect x={84} y={22} width={18} height={14} rx={2} fill={c} fillOpacity={0.3} />
    <line x1={64} y1={29} x2={84} y2={29} />
  </g>
);

// ---- MAT art -----------------------------------------------------------------------------

function ball(c: string, uid: string, kind: 'pbr' | 'phong' | 'flat') {
  return (
    <g>
      <defs>
        <radialGradient id={`mb${uid}`} cx={kind === 'pbr' ? '0.35' : '0.4'} cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity={kind === 'flat' ? 0 : 0.95} />
          <stop offset={kind === 'pbr' ? '0.15' : '0.3'} stopColor={c} />
          <stop offset="1" stopColor="#111" />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={22} fill={kind === 'flat' ? c : `url(#mb${uid})`} />
    </g>
  );
}
const pbrBall: Art = (_r, c, uid) => ball(c, uid, 'pbr');
const phongBall: Art = (_r, c, uid) => ball(c, uid, 'phong');
const flatBall: Art = (_r, c, uid) => ball(c, uid, 'flat');
const strokes: Art = (r, c) => (
  <g fill="none" stroke={c} strokeLinecap="round">
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M 16 ${18 + i * 14} C 50 ${4 + i * 14 + r() * 10}, 90 ${30 + i * 10}, 132 ${14 + i * 14}`} strokeWidth={1 + i * 1.6} strokeOpacity={0.5 + i * 0.2} />
    ))}
  </g>
);

const ARTS: Record<string, Art> = {
  sphere, grid, noiseSurface, box, torus, circle, curve, cloud, particles, trail, copies, field, bars, valueBars,
  attrStrips, codeGlyph, plexus, feedbackLoop, textGlyph, noiseTex, ramp, renderArt, glow, swirl, imageArt,
  composite, levels, blurArt, gradientImg, sine, noisyWave, audioWave, smoothStep, rampWave, flat, pulses,
  multiWave, deviceArt, tableArt, textLines, jsonArt, webArt, geoArt, cameraArt, lightArt, windowArt,
  containerArt, pbrBall, phongBall, flatBall, strokes,
};

const RULES: [RegExp, string][] = [
  // POPs
  [/^sphere|geo(desic)?POP/, 'sphere'],
  [/^(grid|plane|rectangle)POP/, 'grid'],
  [/^(noise|twist|phaser)POP/, 'noiseSurface'],
  [/^(box)POP/, 'box'],
  [/^(torus|tube|revolve)POP/, 'torus'],
  [/^circlePOP/, 'circle'],
  [/^(line|curve|linedivide|lineresample|linesmooth|linebreak|linemetrics|trace|skin)POP/, 'curve'],
  [/^(pointgenerator|random|sprinkle|pointfilein|filein|point)POP/, 'cloud'],
  [/^(particle|forceradial)POP/, 'particles'],
  [/^(trail|timefilter|cache|cacheblend|cacheselect)POP/, 'trail'],
  [/^(copy|glslcopy)POP/, 'copies'],
  [/^(field|proximity)POP/, 'field'],
  [/^(neighbor)POP/, 'plexus'],
  [/^(histogram|analyze|sort)POP/, 'bars'],
  [/^(math|mathmix|mathcombine|rerange|normalize|limit|quantize|trig)POP/, 'valueBars'],
  [/^(attribute|attributecombine|attributeconvert|lookup.*|texturemap|projection|group|dimension|topology)POP/, 'attrStrips'],
  [/^glsl.*POP|scriptPOP|cplusplusPOP/, 'codeGlyph'],
  [/^feedbackPOP/, 'feedbackLoop'],
  [/^textPOP/, 'textGlyph'],
  [/^(choptoPOP)/, 'valueBars'],
  [/^(dattoPOP)/, 'attrStrips'],
  [/^(toptoPOP)/, 'cloud'],
  [/POP$/, 'sphere'],
  // TOPs
  [/^noiseTOP/, 'noiseTex'],
  [/^(ramp|constant)TOP/, 'ramp'],
  [/^(render|renderpass|depth)TOP/, 'renderArt'],
  [/^(bloom|glow|lumablur)TOP/, 'glow'],
  [/^(feedback|cache|displace)TOP/, 'swirl'],
  [/^(moviefilein|videodevicein|ndiin|screengrab)TOP/, 'imageArt'],
  [/^(composite|over|add|multiply|switch|cross)TOP/, 'composite'],
  [/^(level|hsvadjust|math|threshold|lookup)TOP/, 'levels'],
  [/^(blur|edge|transform)TOP/, 'blurArt'],
  [/^textTOP/, 'textGlyph'],
  [/^(glsl|glslmulti)TOP/, 'codeGlyph'],
  [/^choptoTOP/, 'bars'],
  [/TOP$/, 'gradientImg'],
  // CHOPs
  [/^lfoCHOP/, 'sine'],
  [/^(noise|random)CHOP/, 'noisyWave'],
  [/^(audiofilein|audiodevicein|audiodeviceout|audiofilter|audiooscillator)CHOP/, 'audioWave'],
  [/^(audiospectrum|analyze|toptoCHOP)CHOP/, 'bars'],
  [/^(lag|filter|spring|slope)CHOP/, 'smoothStep'],
  [/^(speed|timer|count|pattern)CHOP/, 'rampWave'],
  [/^(constant)CHOP/, 'flat'],
  [/^(trigger|beat|logic|envelope)CHOP/, 'pulses'],
  [/^(mousein|keyboardin|midiin|oscin|joystick|leapmotion|renderpick)CHOP/, 'deviceArt'],
  [/CHOP$/, 'multiWave'],
  // DATs
  [/^(table|select|sort|convert|evaluate|merge|null|info|poptoDAT|choptoDAT)DAT/, 'tableArt'],
  [/^(json)DAT/, 'jsonArt'],
  [/^(webclient|webserver|websocket)DAT/, 'webArt'],
  [/^(text|script|execute|chopexecute|parameterexecute|datexecute|opexecute|panelexecute)DAT/, 'codeGlyph'],
  [/DAT$/, 'textLines'],
  // COMPs
  [/^geometryCOMP/, 'geoArt'],
  [/^cameraCOMP/, 'cameraArt'],
  [/^(light|ambientlight|environmentlight)COMP/, 'lightArt'],
  [/^windowCOMP/, 'windowArt'],
  [/COMP$/, 'containerArt'],
  // MATs
  [/^pbrMAT/, 'pbrBall'],
  [/^(phong|glsl)MAT/, 'phongBall'],
  [/^(constant|wireframe)MAT/, 'flatBall'],
  [/^lineMAT/, 'strokes'],
  [/^pointspriteMAT/, 'cloud'],
  [/MAT$/, 'phongBall'],
];

export function thumbKind(type: string, override?: string): string {
  if (override && ARTS[override]) return override;
  for (const [re, kind] of RULES) if (re.test(type)) return kind;
  return familyOf(type) === 'POP' ? 'sphere' : 'gradientImg';
}

export function Thumb({ type, id, color, override }: { type: string; id: string; color: string; override?: string }) {
  const kind = thumbKind(type, override);
  const art = ARTS[kind];
  const uid = id.replace(/[^A-Za-z0-9]/g, '') + kind;
  return art(rng(id + type), color, uid);
}
