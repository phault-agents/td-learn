import { useEffect, useMemo } from 'react';
import type { Graph } from '../../content/types';
import type { OpDB } from '../../lib/opdb';
import { buildScript } from '../../lib/pyexport';
import { highlight } from '../../lib/markdown';
import { CopyButton } from '../CopyButton';
import { Icon } from '../Icon';

export function ScriptModal({ graph, db, lessonTitle, onClose }: { graph: Graph; db: OpDB; lessonTitle: string; onClose: () => void }) {
  const code = useMemo(() => buildScript(graph, db, lessonTitle), [graph, db, lessonTitle]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const download = () => {
    const blob = new Blob([code], { type: 'text/x-python' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `build_${graph.id.replace(/[^a-z0-9_-]/gi, '_')}.py`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Build script" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h3>Build script <span className="beta">beta</span></h3>
            <p>
              Recreates <b>{graph.title}</b> inside TouchDesigner. Paste into a Text DAT and choose <i>Run Script</i>. Parameter names come from the
              official docs; anything that can't be applied is printed to the Textport so you can set it by hand.
            </p>
          </div>
          <button className="nv-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        <pre className="md-code modal-code">
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlight(code, 'python') }} />
        </pre>
        <footer className="modal-foot">
          <CopyButton text={code} label="Copy script" />
          <button className="btn" onClick={download}>
            <Icon name="download" size={14} /> Download .py
          </button>
        </footer>
      </div>
    </div>
  );
}
