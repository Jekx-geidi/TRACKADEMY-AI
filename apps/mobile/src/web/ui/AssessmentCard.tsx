import { ASSESSMENT_TYPE_LABELS, QUARTER_LABELS } from '@/features/assessments/constants';
import type { AssessmentMatch } from '@/features/assessments/schema';

import { Card } from './Card';
import { IconCircle } from './IconTile';
import { colors } from './theme';

export function AssessmentCard({ assessment, showCode = true }: { assessment: AssessmentMatch; showCode?: boolean }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: colors.textMuted }}>{assessment.subject}</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: colors.heading }}>{assessment.title}</p>
        </div>
        {showCode ? <span className="pill code">{assessment.code}</span> : null}
      </div>
      <div className="pills">
        <span className="pill">{QUARTER_LABELS[assessment.quarter]}</span>
        <span className="pill">{ASSESSMENT_TYPE_LABELS[assessment.assessmentType]}</span>
        <span className="pill">Total Score: {assessment.totalScore}</span>
      </div>
    </Card>
  );
}
