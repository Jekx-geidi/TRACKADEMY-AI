import type { CSSProperties } from 'react';

import { loadStudentOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { ProfileView } from '../../ui/ProfileView';
import { colors } from '../../ui/theme';

export default function StudentProfile() {
  const { data } = useLoad(loadStudentOverview);
  const classes = data?.classes.filter((c) => c.memberRole === 'STUDENT') ?? [];
  const linkCode = data?.student.linkCode;

  return (
    <ProfileView>
      {linkCode ? (
        <Card style={styles.center}>
          <p style={styles.label}>Parent link code</p>
          <p style={styles.code} aria-label={`Parent link code ${linkCode.split('').join(' ')}`}>
            {linkCode}
          </p>
          <p style={styles.help}>Give this code to a parent or guardian so they can follow your progress.</p>
        </Card>
      ) : null}
      <Card>
        <p style={styles.label}>Classes</p>
        <p style={styles.value}>{classes.length ? classes.map((c) => c.name).join('\n') : 'No class joined yet'}</p>
      </Card>
    </ProfileView>
  );
}

const styles = {
  center: { alignItems: 'center' },
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  code: { fontSize: 32, fontWeight: 800, letterSpacing: 6, color: colors.heading, userSelect: 'all' },
  help: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: '20px' },
  value: { fontSize: 17, fontWeight: 700, color: colors.heading, lineHeight: '24px', marginTop: 4, whiteSpace: 'pre-line' },
} satisfies Record<string, CSSProperties>;
