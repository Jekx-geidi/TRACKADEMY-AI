import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { loadChildRecords } from '@/features/dashboards/loaders';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { isPending, isWithinDays, needsAttention } from '@/features/evidence/summary';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { HeroCard } from '../../ui/Card';
import { ChildPicker } from '../../ui/ChildPicker';
import { EmptyCard, firstName, greeting, ListCard, LoadGate, PageHeader, RecordRow, StatRow, StatTile } from '../../ui/Dashboard';
import { Screen, SectionTitle } from '../../ui/Screen';
import { colors } from '../../ui/theme';

const NEW_DAYS = 7;

export default function ParentHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { child } = useSelectedChild();
  const childId = child?.id ?? null;
  const { data: records, error, loading, reload } = useLoad(async () => (childId ? loadChildRecords(childId) : []), childId);

  const list = records ?? [];
  const fresh = list.filter((r) => r.score !== null && isWithinDays(r, NEW_DAYS));
  const attention = list.filter(needsAttention);
  const pending = list.filter(isPending);

  return (
    <Screen tabs>
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(profile?.fullName)}!`}
        title={child ? `${firstName(child.displayName)}'s progress` : 'Your children'}
        avatar
      />
      <ChildPicker />

      {child ? (
        <>
          <HeroCard>
            <p style={styles.heroEyebrow}>{`Have ${firstName(child.displayName)}'s checked paper?`}</p>
            <h2 style={styles.heroTitle}>Scan it for them</h2>
            <Button label={`Scan for ${firstName(child.displayName)}`} icon="scan" variant="accent" onPress={() => navigate('/parent/scan')} />
          </HeroCard>

          <LoadGate loading={loading} error={error} hasData={records !== undefined} onRetry={reload}>
            <StatRow>
              <StatTile icon="sparkles" value={fresh.length} label={`New scores (${NEW_DAYS} days)`} />
              <StatTile icon="alert-circle" value={attention.length} label="Needs attention" tint={colors.warningSoft} />
              <StatTile icon="time" value={pending.length} label="Waiting for teacher" tint={colors.inputFill} />
            </StatRow>

            <SectionTitle>New scores</SectionTitle>
            <ListCard
              items={fresh}
              limit={5}
              render={(r, i) => <RecordRow key={r.id} record={r} divider={i > 0} />}
              empty={{ icon: 'sparkles-outline', title: 'No new scores this week' }}
            />

            <SectionTitle>Needs attention</SectionTitle>
            <ListCard
              items={attention}
              limit={5}
              render={(r, i) => <RecordRow key={r.id} record={r} divider={i > 0} />}
              empty={{
                icon: 'happy-outline',
                title: 'Nothing needs attention',
                body: 'Low scores and papers a teacher flags will show here.',
              }}
            />

            <SectionTitle>Missing evidence</SectionTitle>
            <EmptyCard
              icon="document-outline"
              title="No missing papers found"
              body="Assessments your child's teacher posts without a saved paper will show here."
            />

            <SectionTitle>Teacher reports & reminders</SectionTitle>
            <EmptyCard icon="mail-outline" title="No reports or reminders yet" body="Messages from teachers will appear in your Inbox." />

            <SectionTitle>Recent records</SectionTitle>
            <ListCard
              items={list}
              limit={5}
              render={(r, i) => <RecordRow key={r.id} record={r} divider={i > 0} />}
              empty={{
                icon: 'folder-open-outline',
                title: 'No records yet',
                body: `Papers saved by you or ${firstName(child.displayName)} will be listed here.`,
              }}
            />
          </LoadGate>
        </>
      ) : null}
    </Screen>
  );
}

const styles = {
  heroEyebrow: { fontSize: 14, fontWeight: 600, color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontWeight: 800, color: colors.primaryText, marginTop: -8 },
} satisfies Record<string, CSSProperties>;
