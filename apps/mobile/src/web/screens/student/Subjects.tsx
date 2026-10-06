import type { CSSProperties } from 'react';

import { loadStudentOverview } from '@/features/dashboards/loaders';
import { formatPercent, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { IconCircle } from '../../ui/IconTile';
import { Screen } from '../../ui/Screen';
import { colors } from '../../ui/theme';

export default function StudentSubjects() {
  const { data, error, loading, reload } = useLoad(loadStudentOverview);
  const subjects = summarizeBySubject(data?.records ?? []);

  return (
    <Screen tabs>
      <PageHeader title="Subjects" subtitle="Your average score per subject, from the papers you uploaded." />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {subjects.length === 0 ? (
          <EmptyCard icon="library-outline" title="No subjects yet" body="Subjects appear as you upload papers." />
        ) : (
          subjects.map((s) => (
            <Card key={s.subject} style={styles.row}>
              <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
              <div style={styles.text}>
                <h2 style={styles.name}>{s.subject}</h2>
                <p style={styles.meta}>
                  {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                </p>
                <div style={styles.track}>
                  <div style={{ ...styles.fill, width: `${Math.round((s.average ?? 0) * 100)}%` }} />
                </div>
              </div>
              <span style={styles.avg}>{formatPercent(s.average)}</span>
            </Card>
          ))
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = {
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  text: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 },
  name: { fontSize: 17, fontWeight: 800, color: colors.heading },
  meta: { fontSize: 13, color: colors.textMuted },
  track: { height: 8, borderRadius: 999, background: colors.inputFill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999, background: colors.accent },
  avg: { fontSize: 22, fontWeight: 800, color: colors.heading },
} satisfies Record<string, CSSProperties>;
