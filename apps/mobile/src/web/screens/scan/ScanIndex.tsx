import { useScanSession } from '@/features/scanner/ScanSession';
import { usePickPaper } from '@/features/scanner/usePickPaper';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { PaperGuide } from '../../ui/PaperGuide';
import { Notice, Screen, TopBar } from '../../ui/Screen';
import { WorkflowSteps } from '../../ui/WorkflowSteps';
import './scan.css';

export default function ScanScreen() {
  const { pick, error, busy } = usePickPaper();
  const { target } = useScanSession();

  return (
    <>
      <TopBar title="Scan School Paper" />
      <Screen>
        <Card>
          <WorkflowSteps current={0} />
        </Card>

        <Card className="scan-guide">
          <PaperGuide />
          <p className="scan-guide-title">Show the code clearly</p>
          <p className="scan-guide-text">
            Make sure the 5-digit code in the upper-right box can be seen. Lay the paper flat in good light.
          </p>
        </Card>

        {target ? <p className="scan-for">Saving for: {target.displayName}</p> : null}
        {error ? (
          <Notice tone="danger" title="Could not get the photo">
            {error}
          </Notice>
        ) : null}

        <div className="scan-actions">
          <Button label="Take Photo" icon="camera" onPress={() => pick('camera')} loading={busy} />
          <Button label="Upload Photo" icon="images" variant="secondary" onPress={() => pick('library')} disabled={busy} />
        </div>
      </Screen>
    </>
  );
}
