import { useEffect, useState } from 'react';

const KEY = 'trackademic:data-saver';

/** Persists a low-bandwidth preference and removes nonessential motion. */
export function DataSaverToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) === 'true');
  useEffect(() => {
    document.documentElement.dataset.dataSaver = String(enabled);
    localStorage.setItem(KEY, String(enabled));
  }, [enabled]);
  return <label className="checkbox-row"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span><strong>Data Saver Mode</strong><br /><small>Reduces animation and avoids loading nonessential visuals.</small></span></label>;
}
