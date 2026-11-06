import { useState } from 'react';
import { Icon } from './Icon';

export function CopyButton({ text, label = 'Copy', small }: { text: string; label?: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  };
  return (
    <button className={small ? 'copybtn copybtn-sm' : 'btn'} onClick={copy} title={label} aria-label={label}>
      <Icon name={done ? 'check' : 'copy'} size={small ? 12 : 14} />
      {!small && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
}
