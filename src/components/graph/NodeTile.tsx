import { memo } from 'react';
import { NODE_H, NODE_W, type Placed } from '../../lib/layout';
import { familyOf, fallbackLabel } from '../../lib/opdb';
import { FAMILY_COLOR } from '../../lib/families';
import { Thumb, TH, TW } from './thumbnails';

const HEADER = 18;

interface Props {
  p: Placed;
  selected: boolean;
  fresh: boolean;
  focus: boolean;
  built: boolean;
  label?: string;
  onClick: () => void;
  onEnter: () => void;
}

function inY(i: number, count: number) {
  return HEADER + (TH * (i + 1)) / (count + 1);
}

export const NodeTile = memo(function NodeTile({ p, selected, fresh, focus, built, label, onClick, onEnter }: Props) {
  const { node } = p;
  const fam = familyOf(node.type);
  const color = FAMILY_COLOR[fam];
  const typeLabel = (label ?? fallbackLabel(node.type)).toUpperCase();
  const ins = node.inputs || [];
  const hasKids = !!node.children?.length;
  const clipId = `clip-${node.id}`;
  const showOut = fam !== 'COMP' && fam !== 'MAT';
  const cls = ['nt', `fam-${fam}`, selected && 'is-selected', fresh && 'is-new', focus && 'is-focus', node.flags?.bypass && 'is-bypass', built && 'is-built']
    .filter(Boolean)
    .join(' ');
  return (
    <g
      className={cls}
      transform={`translate(${p.x} ${p.y})`}
      onClick={onClick}
      onDoubleClick={onEnter}
      role="button"
      tabIndex={-1}
      aria-label={`${node.id} (${label ?? node.type})`}
      style={{ ['--fam' as string]: color }}
    >
      {(selected || fresh || focus) && <rect className="nt-halo" x={-7} y={-7} width={NODE_W + 14} height={NODE_H + 14} rx={13} />}
      <rect className="nt-body" width={NODE_W} height={NODE_H} rx={8} />
      <clipPath id={clipId}>
        <rect x={1.5} y={HEADER} width={NODE_W - 3} height={TH} />
      </clipPath>
      <path className="nt-head" d={`M8 0 H${NODE_W - 8} Q${NODE_W} 0 ${NODE_W} 8 V${HEADER} H0 V8 Q0 0 8 0 Z`} />
      <text className="nt-type" x={8} y={12.5}>
        {typeLabel.length > 22 ? typeLabel.slice(0, 21) + '…' : typeLabel}
      </text>
      <g clipPath={`url(#${clipId})`}>
        <rect className="nt-viewer" x={0} y={HEADER} width={NODE_W} height={TH} />
        <g transform={`translate(0 ${HEADER})`} className="nt-art">
          <Thumb type={node.type} id={node.id} color={color} override={node.thumb} />
        </g>
      </g>
      <line className="nt-sep" x1={0} y1={HEADER + TH} x2={NODE_W} y2={HEADER + TH} />
      <text className="nt-name" x={9} y={HEADER + TH + 16}>
        {node.id.length > 17 ? node.id.slice(0, 16) + '…' : node.id}
      </text>
      {/* flags */}
      <g transform={`translate(${NODE_W - 10} ${HEADER + TH + 12})`}>
        {node.flags?.render && <circle className="nt-flag nt-flag-render" cx={0} cy={0} r={4} />}
        {node.flags?.display && <circle className="nt-flag nt-flag-display" cx={node.flags?.render ? -11 : 0} cy={0} r={4} />}
      </g>
      {/* connectors */}
      {ins.map((src, i) => (
        <rect key={i} className={`nt-conn ${src ? '' : 'is-empty'}`} x={-5} y={inY(i, ins.length) - 5} width={8} height={10} rx={2} />
      ))}
      {showOut && <rect className="nt-conn nt-conn-out" x={NODE_W - 3} y={inY(0, 1) - 5} width={8} height={10} rx={2} />}
      {hasKids && (
        <g className="nt-enter" transform={`translate(${NODE_W - 26} ${HEADER + 4})`} onClick={(e) => { e.stopPropagation(); onEnter(); }}>
          <rect width={22} height={18} rx={5} />
          <path d="M7 5 L11 9 L15 5 M11 9 V3 M6 13 H16" />
          <title>Dive into this component</title>
        </g>
      )}
      {fresh && (
        <g className="nt-badge-new" transform={`translate(${NODE_W - 30} -9)`}>
          <rect width={34} height={16} rx={8} />
          <text x={17} y={11.5} textAnchor="middle">NEW</text>
        </g>
      )}
      {built && (
        <g className="nt-badge-built" transform={`translate(-8 -8)`}>
          <circle cx={8} cy={8} r={8} />
          <path d="M4.5 8.2 L7 10.6 L11.6 5.6" />
        </g>
      )}
      {node.flags?.bypass && (
        <text className="nt-bypass" x={NODE_W / 2} y={HEADER + TH / 2 + 4} textAnchor="middle">BYPASS</text>
      )}
    </g>
  );
});

export function GhostTile({ p }: { p: Placed }) {
  return <rect className="nt-ghost" x={p.x} y={p.y} width={NODE_W} height={NODE_H} rx={8} />;
}

export { TW };
