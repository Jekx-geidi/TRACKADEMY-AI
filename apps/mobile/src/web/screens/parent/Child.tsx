import type { CSSProperties } from 'react';

import { loadChildRecords } from '@/features/dashboards/loaders';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { listWork } from '@/features/student/api';
import { formatPercent, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { ChildPicker } from '../../ui/ChildPicker';
import { RecordsList } from '../../ui/RecordsList';
import { EmptyCard, LoadGate } from '../../ui/Dashboard';
import { SectionTitle } from '../../ui/Screen';
import { WorkRow } from '../../ui/WorkRow';
import { colors } from '../../ui/theme';

export default function ParentChild() {
  const { child } = useSelectedChild();
  const childId = child?.id ?? null;
  const { data, error, loading, reload } = useLoad(async () => (childId ? loadChildRecords(childId) : []), childId);
  const lacking = useLoad(() => childId ? listWork({ studentProfileId: childId, status: 'LACKING', limit: 10 }) : Promise.resolve({ rows: [], total: 0 }), childId);
  const subjects = summarizeBySubject(data ?? []);

  return (
    <RecordsList
      title={child?.displayName ?? 'Child'}
      subtitle="Subjects and every saved paper."
      records={child ? data : []}
      error={error}
      loading={loading}
      reload={reload}
      emptyBody="Papers saved for this child will be listed here."
      header={
        <>
          <ChildPicker />
          {subjects.length > 0 ? (
            <Card>
              <p style={styles.label}>Subjects</p>
              {subjects.map((s) => (
                <div key={s.subject} style={styles.subject}>
                  <span style={styles.subjectName}>{s.subject}</span>
                  <span style={styles.subjectValue}>
                    {formatPercent(s.average)} · {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}
          {child ? (
            <>
              <SectionTitle>Needs attention</SectionTitle>
              <LoadGate loading={lacking.loading} error={lacking.error} hasData={lacking.data !== undefined} onRetry={lacking.reload}>
                {lacking.data?.rows.length === 0 ? <EmptyCard icon="happy-outline" title="Nothing needs attention" body="Missing, overdue, or resubmission work appears here." /> : null}
                {lacking.data?.rows.length ? <Card className="list-card">{lacking.data.rows.map((item) => <WorkRow key={item.assessment_id} item={item} />)}</Card> : null}
              </LoadGate>
            </>
          ) : null}
        </>
      }
    />
  );
}

const styles = {
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  subject: { display: 'flex', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 4, gap: 16 },
  subjectName: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: 700, color: colors.heading },
  subjectValue: { fontSize: 15, fontWeight: 700, color: colors.heading },
} satisfies Record<string, CSSProperties>;
