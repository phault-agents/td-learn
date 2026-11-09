import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Graph, GraphNode } from '../../content/types';
import { COL, NODE_H, NODE_W, ROW, placeNodes, type Placed } from '../../lib/layout';
import { familyOf, isExpr, isRef, opsInExpr } from '../../lib/opdb';
import { lastSeg } from '../../lib/paths';
import { FAMILY_COLOR } from '../../lib/families';
import { useOps } from '../../lib/opsData';
import { progress, useProgress } from '../../lib/progress';
import { renderMarkdown } from '../../lib/markdown';
import { NodeTile, GhostTile } from './NodeTile';
import { Inspector } from './Inspector';
import { ScriptModal } from './ScriptModal';
import { Icon } from '../Icon';

interface Props {
  graph: Graph;
  lessonTitle: string;
}

interface IndexEntry {
  node: GraphNode;
  parent: string | null;
}

interface View {
  x: number;
  y: number;
  k: number;
}

const HEADER = 18;
const THUMB = 62;
/** inspector drawer width, and the canvas width from which it overlays (below it stacks) */
const DRAWER_W = 350;
const DRAWER_MIN_CANVAS = 860;

function buildIndex(nodes: GraphNode[], parent: string | null, out: Map<string, IndexEntry>) {
  for (const n of nodes) {
    out.set(n.id, { node: n, parent });
    if (n.children) buildIndex(n.children, n.id, out);
  }
  return out;
}

export function inputY(i: number, count: number) {
  return HEADER + (THUMB * (i + 1)) / (count + 1);
}

function wirePath(x1: number, y1: number, x2: number, y2: number) {
  if (x2 < x1 + 20) {
    const dx = 110;
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  }
  const dx = Math.max(36, (x2 - x1) * 0.5);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export function NetworkView({ graph, lessonTitle }: Props) {
  const db = useOps();
  const prog = useProgress();
  const index = useMemo(() => buildIndex(graph.nodes, null, new Map()), [graph]);
  const steps = graph.steps || [];
  const stepOf = useMemo(() => {
    const m = new Map<string, number>();
    steps.forEach((s, i) => (s.nodes || []).forEach((id) => m.set(id, i)));
    return m;
  }, [steps]);

  const [path, setPath] = useState<string[]>([]);
  const [step, setStep] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [flow, setFlow] = useState(true);
  const [full, setFull] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [legend, setLegend] = useState(false);
  const [hint, setHint] = useState(false);

  const current = path.length ? path[path.length - 1] : null;
  const currentEntry = current ? index.get(current) : undefined;
  const nodes = currentEntry?.node.children ?? graph.nodes;
  const comments = current ? currentEntry?.node.childComments : graph.comments;
  const placed = useMemo(() => placeNodes(nodes), [nodes]);
  const pos = useMemo(() => new Map(placed.map((p) => [p.node.id, p])), [placed]);

  const visible = useCallback(
    (id: string) => step === null || !stepOf.has(id) || stepOf.get(id)! <= step,
    [step, stepOf],
  );
  const isNew = (id: string) => step !== null && stepOf.get(id) === step;
  const isFocus = (id: string) => step !== null && (steps[step]?.focus || []).includes(id);

  const builtSet = useMemo(() => new Set(prog.built[graph.id] || []), [prog.built, graph.id]);
  const total = index.size;
  const builtCount = [...index.keys()].filter((id) => builtSet.has(id)).length;

  // ---- canvas sizing & view -----------------------------------------------------------------
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [view, setView] = useState<View>({ x: 40, y: 40, k: 0.9 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const anim = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const bounds = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of placed) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y - 8);
      maxX = Math.max(maxX, p.x + NODE_W);
      maxY = Math.max(maxY, p.y + NODE_H + 8);
    }
    for (const c of comments || []) {
      minX = Math.min(minX, c.x * COL);
      minY = Math.min(minY, c.y * ROW);
      maxX = Math.max(maxX, c.x * COL + (c.w ?? 2) * COL - 20);
      maxY = Math.max(maxY, c.y * ROW + 70);
    }
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    return { minX, minY, maxX, maxY };
  }, [placed, comments]);

  const targetRef = useRef<View>(view);
  const animateTo = useCallback((target: View, ms = 380) => {
    targetRef.current = target;
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = { ...viewRef.current };
    const t0 = performance.now();
    const tick = (t: number) => {
      const u = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - u, 3);
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, k: from.k + (target.k - from.k) * e });
      if (u < 1) anim.current = requestAnimationFrame(tick);
    };
    anim.current = requestAnimationFrame(tick);
  }, []);

  const fit = useCallback(
    (animated = true) => {
      const b = bounds();
      const pad = 36;
      const bw = b.maxX - b.minX, bh = b.maxY - b.minY;
      const narrow = size.w < 600;
      const k = Math.max(narrow ? 0.42 : 0.28, Math.min(1.05, (size.w - pad * 2) / bw, (size.h - pad * 2) / bh));
      // when the graph is wider than the view at minimum zoom, start at its left edge (data flows left → right)
      const x = bw * k > size.w - pad * 2 ? pad - b.minX * k : (size.w - bw * k) / 2 - b.minX * k;
      const target = { k, x, y: (size.h - bh * k) / 2 - b.minY * k };
      if (animated) animateTo(target);
      else {
        targetRef.current = target;
        setView(target);
      }
    },
    [bounds, size.w, size.h, animateTo],
  );

  const firstFit = useRef(true);
  useEffect(() => {
    fit(!firstFit.current);
    firstFit.current = false;
  }, [current, size.w, size.h, full]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the selected node on screen (e.g. when a build step introduces it outside the view)
  useEffect(() => {
    if (!selected) return;
    const p = pos.get(selected);
    if (!p) return;
    const id = window.setTimeout(() => {
      const v = targetRef.current;
      const pad = 24;
      // on wide layouts the inspector drawer covers the right edge of the canvas
      const visW = size.w >= DRAWER_MIN_CANVAS ? size.w - DRAWER_W : size.w;
      const sx = p.x * v.k + v.x, sy = p.y * v.k + v.y;
      const ex = sx + NODE_W * v.k, ey = sy + NODE_H * v.k;
      if (sx >= pad && sy >= pad && ex <= visW - pad && ey <= size.h - pad) return;
      const cx = visW / 2 - (p.x + NODE_W / 2) * v.k;
      const cy = size.h / 2 - (p.y + NODE_H / 2) * v.k;
      animateTo({ k: v.k, x: cx, y: cy });
    }, 420);
    return () => window.clearTimeout(id);
  }, [selected, pos, size.w, size.h, animateTo]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    const v = viewRef.current;
    const k = Math.max(0.2, Math.min(2.4, v.k * factor));
    const f = k / v.k;
    const next = { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    targetRef.current = next;
    setView(next);
  }, []);

  // wheel: zoom with ctrl/cmd (or always when fullscreen); otherwise let the page scroll.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    let timer: number | undefined;
    const onWheel = (e: WheelEvent) => {
      if (full || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        zoomAt(Math.exp(-e.deltaY * (e.ctrlKey && !full ? 0.01 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
      } else {
        setHint(true);
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setHint(false), 1300);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(timer);
    };
  }, [full, zoomAt]);

  // pointer pan + pinch
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef({ moved: false, sx: 0, sy: 0, vx: 0, vy: 0, dist: 0, k: 1, cx: 0, cy: 0 });
  // Capture the pointer only once a press becomes a drag or pinch. Capturing on pointerdown
  // would retarget the click/dblclick to the canvas, so nodes never received them.
  const capture = (pointerId: number) => {
    try {
      canvasRef.current?.setPointerCapture(pointerId);
    } catch {
      /* pointer already released */
    }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.nv-noplan')) return;
    if (e.pointerType === 'mouse') pointers.current.clear(); // a mouse is only ever one pointer
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewRef.current;
    if (anim.current) cancelAnimationFrame(anim.current);
    if (pointers.current.size === 1) {
      drag.current = { ...drag.current, moved: false, sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const r = canvasRef.current!.getBoundingClientRect();
      drag.current = { ...drag.current, moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y), k: v.k, vx: v.x, vy: v.y, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top };
      pointers.current.forEach((_, id) => capture(id));
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (pointers.current.size === 1) {
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
        d.moved = true;
        capture(e.pointerId);
      }
      if (d.moved) {
        const next = { ...viewRef.current, x: d.vx + dx, y: d.vy + dy };
        targetRef.current = next;
        setView(next);
      }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const k = Math.max(0.2, Math.min(2.4, (d.k * dist) / (d.dist || 1)));
      const f = k / d.k;
      const next = { k, x: d.cx - (d.cx - d.vx) * f, y: d.cy - (d.cy - d.vy) * f };
      targetRef.current = next;
      setView(next);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      const v = viewRef.current;
      drag.current = { ...drag.current, sx: p.x, sy: p.y, vx: v.x, vy: v.y };
    }
  };

  // ---- navigation helpers ----------------------------------------------------------------
  const ancestors = useCallback(
    (id: string) => {
      const chain: string[] = [];
      let p = index.get(id)?.parent ?? null;
      while (p) {
        chain.unshift(p);
        p = index.get(p)?.parent ?? null;
      }
      return chain;
    },
    [index],
  );

  const reveal = useCallback(
    (id: string) => {
      if (!index.has(id)) return;
      const chain = ancestors(id);
      setPath((cur) => (cur.join('/') === chain.join('/') ? cur : chain));
      setSelected(id);
    },
    [ancestors, index],
  );

  const goStep = useCallback(
    (s: number | null) => {
      setStep(s);
      if (s === null) return;
      const st = steps[s];
      const first = st?.nodes?.[0] ?? st?.focus?.[0];
      if (first) reveal(first);
    },
    [steps, reveal],
  );

  const enter = (id: string) => {
    const n = index.get(id)?.node;
    if (n?.children?.length) {
      setPath([...ancestors(id), id]);
      setSelected(null);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, .nv-inspector')) return;
    if (e.key === 'ArrowRight' && steps.length) {
      e.preventDefault();
      goStep(step === null ? 0 : Math.min(steps.length - 1, step + 1));
    } else if (e.key === 'ArrowLeft' && steps.length) {
      e.preventDefault();
      goStep(step === null || step === 0 ? null : step - 1);
    } else if (e.key === 'f') fit();
    else if (e.key === 'u' && path.length) setPath(path.slice(0, -1));
    else if (e.key === 'Enter' && selected) enter(selected);
    else if (e.key === 'Escape') {
      if (full) setFull(false);
      else setSelected(null);
    }
  };

  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [full]);

  // ---- derived drawing data ----------------------------------------------------------------
  const wires = useMemo(() => {
    const out: { key: string; d: string; color: string; from: string; to: string }[] = [];
    for (const p of placed) {
      const ins = p.node.inputs || [];
      ins.forEach((src, i) => {
        if (!src) return;
        const s = pos.get(src);
        if (!s) return;
        const x1 = s.x + NODE_W, y1 = s.y + inputY(0, 1);
        const x2 = p.x, y2 = p.y + inputY(i, ins.length);
        out.push({ key: `${src}>${p.node.id}:${i}`, d: wirePath(x1, y1, x2, y2), color: FAMILY_COLOR[familyOf(s.node.type)], from: src, to: p.node.id });
      });
    }
    return out;
  }, [placed, pos]);

  const refLinks = useMemo(() => {
    const out: { key: string; d: string; color: string; from: string; to: string; label: string; mx: number; my: number }[] = [];
    const add = (path: string, dst: Placed, label: string) => {
      const src = lastSeg(path);
      const s = pos.get(src);
      if (!s || src === dst.node.id) return;
      const c1x = s.x + NODE_W / 2, c1y = s.y + NODE_H / 2;
      const c2x = dst.x + NODE_W / 2, c2y = dst.y + NODE_H / 2;
      const dx = c2x - c1x, dy = c2y - c1y;
      const len = Math.hypot(dx, dy) || 1;
      const hw = NODE_W / 2 + 6, hh = NODE_H / 2 + 6;
      const tEdge = Math.min(hw / (Math.abs(dx) || 1e-6), hh / (Math.abs(dy) || 1e-6));
      const x1 = c1x + dx * tEdge, y1 = c1y + dy * tEdge;
      const x2 = c2x - dx * tEdge, y2 = c2y - dy * tEdge;
      // bend sideways a little so references never sit on top of wires
      const bend = Math.min(60, len * 0.12);
      const cx = (x1 + x2) / 2 + (-dy / len) * bend, cy = (y1 + y2) / 2 + (dx / len) * bend;
      const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
      const key = `${src}~${dst.node.id}~${label}`;
      if (out.some((o) => o.key === key)) return;
      out.push({ key, d, color: FAMILY_COLOR[familyOf(s.node.type)], from: src, to: dst.node.id, label, mx: 0.25 * x1 + 0.5 * cx + 0.25 * x2, my: 0.25 * y1 + 0.5 * cy + 0.25 * y2 });
    };
    for (const p of placed) {
      for (const [k, v] of Object.entries(p.node.params || {})) {
        const label = k.includes(':') ? k.split(':').pop()! : k;
        if (isRef(v)) v.ref.split(/\s+/).forEach((t) => add(t, p, label));
        else if (isExpr(v)) opsInExpr(v.expr).forEach((t) => add(t, p, label));
        else if (Array.isArray(v)) v.forEach((c) => typeof c === 'object' && opsInExpr(c.expr).forEach((t) => add(t, p, label)));
      }
    }
    for (const l of graph.links || []) {
      const dst = pos.get(l.to);
      if (dst) add(l.from, dst, l.label || '');
    }
    return out;
  }, [placed, pos, graph.links]);

  const boxes = useMemo(() => {
    return (graph.boxes || [])
      .map((b) => {
        const ps = b.nodes.map((id) => pos.get(id)).filter(Boolean) as Placed[];
        if (!ps.length) return null;
        const vis = ps.some((p) => visible(p.node.id));
        const minX = Math.min(...ps.map((p) => p.x)) - 22;
        const minY = Math.min(...ps.map((p) => p.y)) - 40;
        const maxX = Math.max(...ps.map((p) => p.x + NODE_W)) + 22;
        const maxY = Math.max(...ps.map((p) => p.y + NODE_H)) + 22;
        return { ...b, minX, minY, w: maxX - minX, h: maxY - minY, vis };
      })
      .filter(Boolean) as (NonNullable<Graph['boxes']>[number] & { minX: number; minY: number; w: number; h: number; vis: boolean })[];
  }, [graph.boxes, pos, visible]);

  const selectedEntry = selected ? index.get(selected) : undefined;
  const rootLabel = graph.root || '/project1';
  const crumbs = [rootLabel, ...path];
  const stepData = step !== null ? steps[step] : null;

  const nodeClick = (id: string) => {
    if (drag.current.moved) return;
    setSelected((s) => (s === id ? s : id));
  };

  return (
    <div
      ref={wrapRef}
      className={`nv ${full ? 'nv-full' : ''} ${flow ? 'nv-flow' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`Network graph: ${graph.title}`}
    >
      <div className="nv-toolbar">
        <div className="nv-title">
          <span className="nv-title-text">{graph.title}</span>
          <nav className="nv-crumbs" aria-label="Network path">
            {crumbs.map((c, i) => (
              <button
                key={i}
                className={`nv-crumb ${i === crumbs.length - 1 ? 'is-current' : ''}`}
                onClick={() => setPath(path.slice(0, i))}
                disabled={i === crumbs.length - 1}
              >
                {i === 0 ? c : c}
              </button>
            ))}
          </nav>
        </div>
        <div className="nv-tools">
          <button
            className={`nv-built ${builtCount === total ? 'is-done' : ''}`}
            title="Nodes you've marked as built in your own TouchDesigner project"
            onClick={() => {
              if (builtCount === total) progress.setBuilt(graph.id, []);
            }}
          >
            <Icon name="check" size={14} /> {builtCount}/{total} built
          </button>
          <button className="nv-btn" onClick={() => fit()} title="Fit to view (F)">
            <Icon name="fit" />
          </button>
          <button className="nv-btn nv-zoom" onClick={() => zoomAt(1 / 1.2, size.w / 2, size.h / 2)} title="Zoom out">
            <Icon name="minus" />
          </button>
          <button className="nv-btn nv-zoom" onClick={() => zoomAt(1.2, size.w / 2, size.h / 2)} title="Zoom in">
            <Icon name="plus" />
          </button>
          <button className={`nv-btn ${flow ? 'is-on' : ''}`} onClick={() => setFlow(!flow)} title="Animate data flow along wires">
            <Icon name="flow" />
          </button>
          <button className={`nv-btn ${legend ? 'is-on' : ''}`} onClick={() => setLegend(!legend)} title="How to read this graph">
            <Icon name="help" />
          </button>
          <button className="nv-btn" onClick={() => setShowScript(true)} title="TouchDesigner Python build script (beta)" disabled={!db}>
            <Icon name="code" />
          </button>
          <button className="nv-btn" onClick={() => setFull(!full)} title={full ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
            <Icon name={full ? 'shrink' : 'expand'} />
          </button>
        </div>
      </div>

      <div className="nv-body">
        <div
          ref={canvasRef}
          className="nv-canvas"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onMouseDown={(e) => {
            // double-clicking a node to dive in shouldn't select text elsewhere on the page
            if (e.detail > 1) e.preventDefault();
          }}
          onClick={(e) => {
            if (!drag.current.moved && (e.target as Element).classList.contains('nv-bg')) setSelected(null);
          }}
          style={{ ['--h' as string]: `${graph.height ?? 520}px` }}
        >
          <svg className="nv-svg" width="100%" height="100%">
            <defs>
              <pattern id={`grid-${graph.id}`} width={COL / 4} height={COL / 4} patternUnits="userSpaceOnUse" patternTransform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                <circle cx={1} cy={1} r={1} className="nv-griddot" />
              </pattern>
              <marker id={`arrow-${graph.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            <rect className="nv-bg" width="100%" height="100%" fill={`url(#grid-${graph.id})`} />
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {boxes.map((b, i) => (
                <g key={i} className={`nv-box tone-${b.tone || 'gray'} ${b.vis ? '' : 'is-ghost'}`}>
                  <rect x={b.minX} y={b.minY} width={b.w} height={b.h} rx={12} />
                  <text x={b.minX + 14} y={b.minY + 22}>{b.title}</text>
                </g>
              ))}
              {(comments || []).map((c, i) => (
                <foreignObject key={i} x={c.x * COL} y={c.y * ROW} width={(c.w ?? 2) * COL - 20} height={110} className="nv-comment-fo">
                  <div className="nv-comment" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.text, true) }} />
                </foreignObject>
              ))}
              {refLinks.map((l) => {
                const on = visible(l.from) && visible(l.to);
                if (!on) return null;
                const hot = selected === l.from || selected === l.to;
                return (
                  <g key={l.key} className={`nv-ref ${hot ? 'is-hot' : ''}`}>
                    <path d={l.d} stroke={l.color} markerEnd={`url(#arrow-${graph.id})`} />
                    {l.label && (
                      <g transform={`translate(${l.mx} ${l.my})`}>
                        <rect x={-l.label.length * 3.4 - 8} y={-10} width={l.label.length * 6.8 + 16} height={20} rx={10} />
                        <text textAnchor="middle" y={4}>
                          {l.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {wires.map((w) => {
                const on = visible(w.from) && visible(w.to);
                if (!on) return null;
                const hot = selected === w.from || selected === w.to || isNew(w.to);
                return (
                  <g key={w.key} className={`nv-wire ${hot ? 'is-hot' : ''}`}>
                    <path className="nv-wire-under" d={w.d} />
                    <path className="nv-wire-line" d={w.d} stroke={w.color} />
                    <path className="nv-wire-flow" d={w.d} />
                  </g>
                );
              })}
              {placed.map((p) =>
                visible(p.node.id) ? (
                  <NodeTile
                    key={p.node.id}
                    p={p}
                    selected={selected === p.node.id}
                    fresh={isNew(p.node.id)}
                    focus={isFocus(p.node.id)}
                    built={builtSet.has(p.node.id)}
                    label={db?.[p.node.type]?.label}
                    onClick={() => nodeClick(p.node.id)}
                    onEnter={() => enter(p.node.id)}
                  />
                ) : (
                  <GhostTile key={p.node.id} p={p} />
                ),
              )}
            </g>
          </svg>
          {hint && <div className="nv-hint">Hold Ctrl (⌘ on Mac) and scroll to zoom · drag to pan</div>}
          {!selected && !hint && (
            <div className="nv-tip">
              <Icon name="pointer" size={13} /> Click a node for its parameters{index.size > [...index.values()].filter((e) => !e.parent).length ? ' · double-click a COMP to dive in' : ''}
            </div>
          )}
          {legend && <Legend onClose={() => setLegend(false)} />}
          {path.length > 0 && (
            <button className="nv-up nv-noplan" onClick={() => setPath(path.slice(0, -1))}>
              <Icon name="up" size={14} /> Up to {crumbs[crumbs.length - 2]}
            </button>
          )}
        </div>
        <Inspector
          entry={selectedEntry}
          graph={graph}
          db={db}
          built={selected ? builtSet.has(selected) : false}
          onToggleBuilt={() => selected && progress.toggleBuilt(graph.id, selected)}
          onSelect={reveal}
          onEnter={enter}
          onClose={() => setSelected(null)}
          fresh={selected ? isNew(selected) : false}
        />
      </div>

      {steps.length > 0 && (
        <div className="nv-steps">
          <div className="nv-steps-head">
            <button className={`nv-step-pill ${step === null ? 'is-on' : ''}`} onClick={() => goStep(null)}>
              Overview
            </button>
            <div className="nv-step-dots" role="tablist" aria-label="Build steps">
              {steps.map((s, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={step === i}
                  className={`nv-step-dot ${step === i ? 'is-on' : ''} ${step !== null && i < step ? 'is-past' : ''}`}
                  onClick={() => goStep(i)}
                  title={`Step ${i + 1}: ${s.title}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="nv-step-nav">
              <button className="nv-btn" disabled={step === null} onClick={() => goStep(step === null || step === 0 ? null : step - 1)} aria-label="Previous step">
                <Icon name="left" />
              </button>
              <button className="nv-btn nv-btn-primary" disabled={step === steps.length - 1} onClick={() => goStep(step === null ? 0 : step + 1)}>
                {step === null ? 'Build along' : 'Next'} <Icon name="right" size={14} />
              </button>
            </div>
          </div>
          <div className="nv-step-body">
            {stepData ? (
              <>
                <h4>
                  <span className="nv-step-num">Step {step! + 1}/{steps.length}</span> {stepData.title}
                </h4>
                <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(stepData.body) }} />
                {(stepData.nodes?.length || 0) > 0 && (
                  <div className="nv-step-nodes">
                    <span>New in this step:</span>
                    {stepData.nodes!.map((id) => {
                      const n = index.get(id)?.node;
                      if (!n) return null;
                      return (
                        <button key={id} className={`nodechip fam-${familyOf(n.type)} ${builtSet.has(id) ? 'is-built' : ''}`} onClick={() => reveal(id)}>
                          <span className="opchip-dot" />
                          {id}
                          <small>{db?.[n.type]?.label ?? n.type}</small>
                          {builtSet.has(id) && <Icon name="check" size={12} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <p className="nv-step-intro">
                This is the finished network. Press <b>Build along</b> (or use ← →) to rebuild it node by node in TouchDesigner. Click any node to see exactly which parameters to set.
              </p>
            )}
          </div>
        </div>
      )}

      {graph.caption && <div className="nv-caption prose prose-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(graph.caption) }} />}

      {showScript && db && <ScriptModal graph={graph} db={db} lessonTitle={lessonTitle} onClose={() => setShowScript(false)} />}
    </div>
  );
}

function Legend({ onClose }: { onClose: () => void }) {
  return (
    <div className="nv-legend nv-noplan" role="dialog" aria-label="Graph legend">
      <button className="nv-legend-close" onClick={onClose} aria-label="Close legend">
        <Icon name="close" size={14} />
      </button>
      <h5>Reading the graph</h5>
      <ul>
        {(['POP', 'TOP', 'CHOP', 'DAT', 'COMP', 'MAT'] as const).map((f) => (
          <li key={f}>
            <span className="lg-swatch" style={{ background: FAMILY_COLOR[f] }} /> {f}
          </li>
        ))}
      </ul>
      <dl>
        <dt>
          <svg width="40" height="10">
            <path d="M2 5 H38" stroke="#bbb" strokeWidth="2.5" />
          </svg>
        </dt>
        <dd>Wire — connect output → input</dd>
        <dt>
          <svg width="40" height="10">
            <path d="M2 5 H38" stroke="#bbb" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </dt>
        <dd>Reference — a parameter points at that node (OP field or expression)</dd>
        <dt>
          <span className="lg-flag lg-display" /> <span className="lg-flag lg-render" />
        </dt>
        <dd>Display / Render flag on</dd>
        <dt>
          <span className="lg-new">NEW</span>
        </dt>
        <dd>Added in the current build step</dd>
        <dt>
          <span className="lg-ghost" />
        </dt>
        <dd>Slot for a node from a later step</dd>
      </dl>
      <p>Drag to pan · Ctrl/⌘ + scroll to zoom · double-click a COMP to dive in · ← → step</p>
    </div>
  );
}
