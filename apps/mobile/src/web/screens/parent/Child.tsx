import type { CSSProperties } from 'react';

import { loadChildRecords } from '@/features/dashboards/loaders';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { formatPercent, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { ChildPicker } from '../../ui/ChildPicker';
import { RecordsList } from '../../ui/RecordsList';
import { colors } from '../../ui/theme';

export default function ParentChild() {
  const { child } = useSelectedChild();
  const childId = child?.id ?? null;
  const { data, error, loading, reload } = useLoad(async () => (childId ? loadChildRecords(childId) : []), childId);
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
