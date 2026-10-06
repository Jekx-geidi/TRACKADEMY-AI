import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';

import { QUARTER_LABELS } from '@/features/assessments/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { isPending } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { HeroCard } from '../../ui/Card';
import { EmptyCard, firstName, greeting, ListCard, LoadGate, PageHeader, RecordRow, StatRow, StatTile } from '../../ui/Dashboard';
import { IconCircle } from '../../ui/IconTile';
import { Screen, SectionTitle } from '../../ui/Screen';
import { colors } from '../../ui/theme';

export default function TeacherHome() {
  const navigate = useNavigate();
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
    <Screen tabs>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(profile?.fullName)}!`}
        title="Teacher Dashboard"
        subtitle={classLine || 'No class yet'}
      />

      <HeroCard>
        <p style={styles.heroEyebrow}>New quiz or activity?</p>
        <h2 style={styles.heroTitle}>Create an assessment code</h2>
        <Button label="Create Assessment" icon="add-circle" variant="accent" onPress={() => navigate('/teacher/create')} />
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
            <div key={a.id} style={i > 0 ? { ...styles.row, ...styles.divider } : styles.row}>
              <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
              <div style={styles.rowText}>
                <p className="ellipsis" style={styles.rowTitle}>
                  {a.title}
                </p>
                <p className="ellipsis" style={styles.rowMeta}>
                  {a.subject} · {QUARTER_LABELS[a.quarter]}
                </p>
              </div>
              <span style={styles.codePill}>{a.code}</span>
            </div>
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

const styles = {
  heroEyebrow: { fontSize: 14, fontWeight: 600, color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontWeight: 800, color: colors.primaryText, marginTop: -8 },
  row: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 10 },
  divider: { borderTop: `1px solid ${colors.border}` },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: 700, color: colors.heading },
  rowMeta: { fontSize: 13, color: colors.textMuted },
  codePill: {
    flex: 'none',
    background: colors.accentSoft,
    borderRadius: 999,
    padding: '6px 12px',
    fontSize: 15,
    fontWeight: 800,
    color: colors.heading,
    letterSpacing: 1,
    fontVariantNumeric: 'tabular-nums',
  },
} satisfies Record<string, CSSProperties>;
