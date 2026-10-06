import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { EmptyCard, LoadGate, PageHeader } from '@/components/Dashboard';
import { IconCircle } from '@/components/IconTile';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen } from '@/components/Screen';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { loadStudentOverview } from '@/features/dashboards/loaders';
import { formatPercent, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

export default function StudentSubjects() {
  const { data, error, loading, reload } = useLoad(loadStudentOverview);
  const subjects = summarizeBySubject(data?.records ?? []);

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <PageHeader title="Subjects" subtitle="Your average score per subject, from the papers you uploaded." />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {subjects.length === 0 ? (
          <EmptyCard icon="library-outline" title="No subjects yet" body="Subjects appear as you upload papers." />
        ) : (
          subjects.map((s) => (
            <Card key={s.subject} style={styles.row}>
              <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
              <View style={styles.text}>
                <Text style={styles.name}>{s.subject}</Text>
                <Text style={styles.meta}>
                  {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round((s.average ?? 0) * 100)}%` }]} />
                </View>
              </View>
              <Text style={styles.avg}>{formatPercent(s.average)}</Text>
            </Card>
          ))
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontFamily: fonts.extrabold, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.inputFill, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  avg: { fontSize: 22, fontFamily: fonts.extrabold, color: colors.heading },
});
