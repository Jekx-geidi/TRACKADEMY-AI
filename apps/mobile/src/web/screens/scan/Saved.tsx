import { useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';
import { EVIDENCE_STATUS_LABELS } from '@/features/evidence/constants';
import { useScanSession } from '@/features/scanner/ScanSession';

import { AssessmentCard } from '../../ui/AssessmentCard';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { IconCircle } from '../../ui/IconTile';
import { Notice, Screen, TopBar } from '../../ui/Screen';
import { colors } from '../../ui/theme';
import './scan.css';

export default function SavedScreen() {
  const navigate = useNavigate();
  const { saved, selection, reset } = useScanSession();
  const { profile } = useAuth();

  function scanAnother() {
    reset();
    navigate('/scan', { replace: true });
  }

  function goHome() {
    reset();
    // Land on the dashboard tab, not the Upload / Scan tab the flow started from.
    navigate(homeFor(true, profile), { replace: true });
  }

  if (!saved || !selection) {
    return (
      <>
        <TopBar title="Saved" back={false} />
        <Screen>
          <Notice title="Nothing saved yet" />
          <Button label="Scan School Paper" icon="scan" onPress={scanAnother} />
        </Screen>
      </>
    );
  }

  return (
    <>
      <TopBar title="Saved" back={false} />
      <Screen>
        <Card className="scan-success">
          <IconCircle name="checkmark-circle" tint={colors.successSoft} color={colors.success} size={72} />
          <p className="scan-success-title">Paper saved</p>
          <span className="scan-status-pill">{EVIDENCE_STATUS_LABELS[saved.status]}</span>
          {saved.score !== null ? (
            <p className="scan-score">
              Score: {saved.score}/{selection.match.totalScore}
            </p>
          ) : null}
          <p className="scan-saved-meta">Saved {new Date(saved.uploadedAt).toLocaleString()}</p>
        </Card>
        <AssessmentCard assessment={selection.match} />
        <Button label="Scan Another Paper" icon="scan" onPress={scanAnother} />
        <Button label="Home" icon="home" variant="secondary" onPress={goHome} />
      </Screen>
    </>
  );
}
