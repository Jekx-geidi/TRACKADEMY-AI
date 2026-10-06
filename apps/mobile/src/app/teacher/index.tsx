import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HeroCard } from '@/components/Card';
import { EmptyCard, firstName, greeting, ListCard, LoadGate, PageHeader, RecordRow, StatRow, StatTile } from '@/components/Dashboard';
import { IconCircle } from '@/components/IconTile';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen, SectionTitle } from '@/components/Screen';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { QUARTER_LABELS } from '@/features/assessments/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { isPending } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

export default function TeacherHome() {
  const { profile } = useAuth();
  const { data, error, loading, reload } = useLoad(loadTeacherOverview);
  const assessments = data?.assessments ?? [];
  const submissions = data?.submissions ?? [];
  const queue = submissions.filter(isPending);
  const classLine = data?.classes
    .filter((c) => c.memberRole === 'TEACHER')
    .map((c) => c.name)
    .join(' · ');

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(profile?.fullName)}!`}
        title="Teacher Dashboard"
        subtitle={classLine || 'No class yet'}
      />

      <HeroCard>
        <Text style={styles.heroEyebrow}>New quiz or activity?</Text>
        <Text style={styles.heroTitle}>Create an assessment code</Text>
        <Button label="Create Assessment" icon="add-circle" variant="accent" onPress={() => router.navigate('/teacher/create')} />
      </HeroCard>

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        <StatRow>
          <StatTile icon="key" value={assessments.length} label="Active assessments" />
          <StatTile icon="cloud-upload" value={submissions.length} label="Submissions" tint={colors.successSoft} />
          <StatTile icon="shield-checkmark" value={queue.length} label="To verify" tint={colors.warningSoft} />
        </StatRow>

        <SectionTitle>Active codes</SectionTitle>
        <ListCard
          items={assessments}
          limit={6}
          render={(a, i) => (
            <View key={a.id} style={[styles.row, i > 0 && styles.divider]}>
              <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {a.subject} · {QUARTER_LABELS[a.quarter]}
                </Text>
              </View>
              <View style={styles.codePill}>
                <Text style={styles.codeText}>{a.code}</Text>
              </View>
            </View>
          )}
          empty={{ icon: 'key-outline', title: 'No active codes', body: 'Create an assessment to get a 5-digit code.' }}
        />

        <SectionTitle>Verification queue</SectionTitle>
        <ListCard
          items={queue}
          limit={5}
          render={(r, i) => <RecordRow key={r.id} record={r} showStudent divider={i > 0} />}
          empty={{
            icon: 'checkmark-done-outline',
            title: 'Nothing to verify',
            body: 'Papers students upload for your codes will wait here.',
          }}
        />

        <SectionTitle>Missing students</SectionTitle>
        <EmptyCard
          icon="people-outline"
          title="No missing students found"
          body="Students in your class who haven't submitted an active assessment will show here."
        />
      </LoadGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroEyebrow: { fontSize: 14, fontFamily: fonts.semibold, color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontFamily: fonts.extrabold, color: colors.primaryText, marginTop: -spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm + 2 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  codePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  codeText: { fontSize: 15, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 1, fontVariant: ['tabular-nums'] },
});
