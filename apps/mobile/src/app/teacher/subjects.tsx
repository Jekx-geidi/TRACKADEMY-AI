import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyCard, LoadGate, PageHeader } from '@/components/Dashboard';
import { IconCircle } from '@/components/IconTile';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/components/theme';
import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

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
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <PageHeader title="Subjects" subtitle="Your active assessments and submissions per subject." />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {rows.length === 0 ? (
          <EmptyCard icon="library-outline" title="No subjects yet" body="Subjects appear when you create assessments." />
        ) : (
          rows.map(([subject, s]) => (
            <Card key={subject} style={styles.row}>
              <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
              <View style={styles.text}>
                <Text style={styles.name}>{subject}</Text>
                <Text style={styles.meta}>
                  {s.assessments} active {s.assessments === 1 ? 'assessment' : 'assessments'} · {s.submissions}{' '}
                  {s.submissions === 1 ? 'submission' : 'submissions'}
                </Text>
              </View>
            </Card>
          ))
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontFamily: fonts.extrabold, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
