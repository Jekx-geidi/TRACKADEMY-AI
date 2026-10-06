import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { loadStudentOverview } from '@/features/dashboards/loaders';
import { formatPercent, isPending, summarizeBySubject } from '@/features/evidence/summary';
import { unreadNotificationCount } from '@/features/teacher/api';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { HeroCard } from '../../ui/Card';
import { EmptyCard, firstName, greeting, ListCard, LoadGate, PageHeader, RecordRow, StatRow, StatTile } from '../../ui/Dashboard';
import { Screen, SectionTitle } from '../../ui/Screen';
import { colors } from '../../ui/theme';

export default function StudentHome() {
  const navigate = useNavigate();
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
    <Screen tabs>
      <PageHeader eyebrow={`${greeting()}, ${firstName(name)}!`} title={name} subtitle={classLine || 'No class joined yet'} />
      <InboxLink />

      <HeroCard>
        <p style={styles.heroEyebrow}>Got a checked paper?</p>
        <h2 style={styles.heroTitle}>Upload your score</h2>
        <p style={styles.heroBody}>Take a photo, we find the 5-digit code, you confirm the score.</p>
        <Button label="Upload Score" icon="camera" variant="accent" onPress={() => navigate('/student/upload')} />
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
          <div style={styles.subjects}>
            {subjects.slice(0, 4).map((s) => (
              <div key={s.subject} style={styles.subject}>
                <p className="ellipsis" style={styles.subjectName}>
                  {s.subject}
                </p>
                <p style={styles.subjectAvg}>{formatPercent(s.average)}</p>
                <p style={styles.subjectMeta}>
                  {s.papers} {s.papers === 1 ? 'paper' : 'papers'}
                </p>
              </div>
            ))}
          </div>
        )}
      </LoadGate>
    </Screen>
  );
}

const styles = {
  heroEyebrow: { fontSize: 14, fontWeight: 600, color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontWeight: 800, color: colors.primaryText, marginTop: -8 },
  heroBody: { fontSize: 15, color: colors.heroMuted, lineHeight: '21px', marginTop: -8 },
  subjects: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  subject: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    background: colors.surface,
    borderRadius: 20,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  subjectName: { fontSize: 15, fontWeight: 700, color: colors.heading },
  subjectAvg: { fontSize: 26, fontWeight: 800, color: colors.heading },
  subjectMeta: { fontSize: 13, color: colors.textMuted },
} satisfies Record<string, CSSProperties>;

/** Opens the Student Inbox (PRD v0.3 §23); it isn't a tab, so Home links to it. */
function InboxLink() {
  const { data: unread } = useLoad(unreadNotificationCount);
  return (
    <Link className="inbox-link" to="/student/inbox">
      <Icon name="notifications-outline" size={20} />
      <span>Inbox</span>
      {unread ? <span className="inbox-count">{unread} new</span> : null}
    </Link>
  );
}
