import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ChildPicker } from '@/components/ChildPicker';
import { RecordsList } from '@/components/RecordsList';
import { colors, fonts, spacing } from '@/components/theme';
import { loadChildRecords } from '@/features/dashboards/loaders';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { formatPercent, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

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
              <Text style={styles.label}>Subjects</Text>
              {subjects.map((s) => (
                <View key={s.subject} style={styles.subject}>
                  <Text style={styles.subjectName}>{s.subject}</Text>
                  <Text style={styles.subjectValue}>
                    {formatPercent(s.average)} · {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                  </Text>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  subject: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, gap: spacing.md },
  subjectName: { flex: 1, fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  subjectValue: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading },
});
