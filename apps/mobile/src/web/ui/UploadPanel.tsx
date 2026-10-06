import type { ReactNode } from 'react';

import { useScanSession, type ScanTarget } from '@/features/scanner/ScanSession';
import { usePickPaper } from '@/features/scanner/usePickPaper';

import { Button } from './Button';
import { Card } from './Card';
import { PaperGuide } from './PaperGuide';
import { Notice } from './Screen';
import { WorkflowSteps } from './WorkflowSteps';

/**
 * Start of the upload flow: photo → detect code → match → confirm score → save.
 * `target` is who the paper belongs to; nothing can be picked until it is known.
 */
export function UploadPanel({ target, header }: { target: ScanTarget | null; header?: ReactNode }) {
  const { setTarget } = useScanSession();
  const { pick, error, busy } = usePickPaper();

  const start = (source: 'camera' | 'library') => {
    if (!target) return;
    setTarget(target);
    void pick(source);
  };

  return (
    <>
      {header}
      <Card>
        <WorkflowSteps current={0} />
      </Card>
      <Card style={{ alignItems: 'center', gap: 16, paddingTop: 24, paddingBottom: 24, textAlign: 'center' }}>
        <PaperGuide />
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--heading)' }}>Show the code clearly</p>
        <p className="muted" style={{ fontSize: 15, lineHeight: '21px' }}>
          Make sure the 5-digit code in the upper-right box and the score can be seen. Lay the paper flat in good light.
        </p>
      </Card>
      {target ? <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--heading)', textAlign: 'center' }}>Saving for: {target.displayName}</p> : null}
      {error ? (
        <Notice tone="danger" title="Could not get the photo">
          {error}
        </Notice>
      ) : null}
      <div className="stack">
        <Button label="Take Photo" icon="camera" onPress={() => start('camera')} loading={busy} disabled={!target} />
        <Button label="Upload Photo" icon="images" variant="secondary" onPress={() => start('library')} disabled={busy || !target} />
      </div>
      <p className="muted center-text" style={{ fontSize: 14, lineHeight: '20px' }}>
        If the code can’t be read from the photo, you can type it in on the next screen.
      </p>
    </>
  );
}
