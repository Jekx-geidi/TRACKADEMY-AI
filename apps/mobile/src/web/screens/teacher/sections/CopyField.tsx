import { useEffect, useState } from 'react';

import { Icon } from '../../../ui/Icon';

/** A value (join code, invite link) with a Copy button that says "Copied" for a moment. */
export function CopyField({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false);
      setCopied(true);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="sx-copy">
      <div className="sx-copy-text">
        <span className="sx-copy-label">{label}</span>
        <span className={`sx-copy-value${big ? ' big' : ''}`}>{value}</span>
        {failed ? <span className="sx-copy-note">Could not copy. Select it and copy it by hand.</span> : null}
      </div>
      <button type="button" className={`sx-copy-btn${copied ? ' copied' : ''}`} onClick={copy} aria-label={`Copy ${label}`}>
        <Icon name={copied ? 'checkmark' : 'copy-outline'} size={18} />
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
