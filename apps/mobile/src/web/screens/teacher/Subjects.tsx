import type { CSSProperties } from 'react';

import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { IconCircle } from '../../ui/IconTile';
import { Screen } from '../../ui/Screen';
import { colors } from '../../ui/theme';

export default function TeacherSubjects() {
  const { data, error, loading, reload } = useLoad(loadTeacherOverview);

  const subjects = new Map<string, { assessments: number; submissions: number }>();
  for (const a of data?.assessments ?? []) {
    const s = subjects.get(a.subject) ?? { assessments: 0, submissions: 0 };
    s.assessments++;
    subjects.set(a.subject, s);
  }
  for (const r of data?.submissions ?? []) {
    if (!r.assessment) continue;
    const s = subjects.get(r.assessment.subject) ?? { assessments: 0, submissions: 0 };
    s.submissions++;
    subjects.set(r.assessment.subject, s);
  }
  const rows = [...subjects.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Screen tabs>
      <PageHeader title="Subjects" subtitle="Your active assessments and submissions per subject." />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {rows.length === 0 ? (
          <EmptyCard icon="library-outline" title="No subjects yet" body="Subjects appear when you create assessments." />
        ) : (
          rows.map(([subject, s]) => (
            <Card key={subject} style={styles.row}>
              <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
              <div style={styles.text}>
                <h2 style={styles.name}>{subject}</h2>
                <p style={styles.meta}>
                  {s.assessments} active {s.assessments === 1 ? 'assessment' : 'assessments'} · {s.submissions}{' '}
                  {s.submissions === 1 ? 'submission' : 'submissions'}
                </p>
              </div>
            </Card>
          ))
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = {
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: { fontSize: 17, fontWeight: 800, color: colors.heading },
  meta: { fontSize: 14, color: colors.textMuted },
} satisfies Record<string, CSSProperties>;
