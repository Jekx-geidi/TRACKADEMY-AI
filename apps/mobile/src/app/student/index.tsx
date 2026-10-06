import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HeroCard } from '@/components/Card';
import { EmptyCard, firstName, greeting, ListCard, LoadGate, PageHeader, RecordRow, StatRow, StatTile } from '@/components/Dashboard';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen, SectionTitle } from '@/components/Screen';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { loadStudentOverview } from '@/features/dashboards/loaders';
import { formatPercent, isPending, summarizeBySubject } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

export default function StudentHome() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useLoad(loadStudentOverview);
  const name = profile?.fullName?.trim() || data?.student.displayName || 'Student';
  const classLine = data?.classes
    .filter((c) => c.memberRole === 'STUDENT')
    .map((c) => c.name)
    .join(' · ');

  const records = data?.records ?? [];
  const scored = records.filter((r) => r.score !== null);
  const pending = records.filter(isPending);
  const subjects = summarizeBySubject(records);

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <PageHeader eyebrow={`${greeting()}, ${firstName(name)}!`} title={name} subtitle={classLine || 'No class joined yet'} />

      <HeroCard>
        <Text style={styles.heroEyebrow}>Got a checked paper?</Text>
        <Text style={styles.heroTitle}>Upload your score</Text>
        <Text style={styles.heroBody}>Take a photo, we find the 5-digit code, you confirm the score.</Text>
        <Button label="Upload Score" icon="camera" variant="accent" onPress={() => router.navigate('/student/upload')} />
      </HeroCard>

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        <StatRow>
          <StatTile icon="document-text" value={records.length} label="Papers saved" />
          <StatTile icon="time" value={pending.length} label="Waiting for teacher" tint={colors.warningSoft} />
          <StatTile icon="checkmark-done" value={records.length - pending.length} label="Checked" tint={colors.successSoft} />
        </StatRow>

        <SectionTitle>Recent scores</SectionTitle>
        <ListCard
          items={scored}
          limit={5}
          render={(r, i) => <RecordRow key={r.id} record={r} divider={i > 0} />}
          empty={{ icon: 'trophy-outline', title: 'No scores yet', body: 'Upload a checked paper to see your score here.' }}
        />

        <SectionTitle>Pending verification</SectionTitle>
        <ListCard
          items={pending}
          limit={5}
          render={(r, i) => <RecordRow key={r.id} record={r} divider={i > 0} />}
          empty={{
            icon: 'shield-checkmark-outline',
            title: 'Nothing waiting',
            body: 'Papers you upload wait here until your teacher checks them.',
          }}
        />

        <SectionTitle>Missing work</SectionTitle>
        <EmptyCard
          icon="alert-circle-outline"
          title="No missing work found"
          body="When your teacher posts assessments for your class, any you haven't uploaded will show here."
        />

        <SectionTitle>Subjects</SectionTitle>
        {subjects.length === 0 ? (
          <EmptyCard icon="library-outline" title="No subjects yet" body="Subjects appear as you upload papers." />
        ) : (
          <View style={styles.subjects}>
            {subjects.slice(0, 4).map((s) => (
              <View key={s.subject} style={styles.subject}>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {s.subject}
                </Text>
                <Text style={styles.subjectAvg}>{formatPercent(s.average)}</Text>
                <Text style={styles.subjectMeta}>
                  {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroEyebrow: { fontSize: 14, fontFamily: fonts.semibold, color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontFamily: fonts.extrabold, color: colors.primaryText, marginTop: -spacing.sm },
  heroBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.heroMuted, lineHeight: 21, marginTop: -spacing.sm },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  subject: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg - 4, padding: spacing.md, gap: 2 },
  subjectName: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading },
  subjectAvg: { fontSize: 26, fontFamily: fonts.extrabold, color: colors.heading },
  subjectMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
