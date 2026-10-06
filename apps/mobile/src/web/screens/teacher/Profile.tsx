import type { CSSProperties } from 'react';

import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { ProfileView } from '../../ui/ProfileView';
import { colors } from '../../ui/theme';

export default function TeacherProfile() {
  const { data } = useLoad(loadTeacherOverview);
  const classes = data?.classes.filter((c) => c.memberRole === 'TEACHER') ?? [];

  return (
    <ProfileView>
      <Card>
        <p style={styles.label}>Classes</p>
        {classes.length === 0 ? <p style={styles.none}>No class yet.</p> : null}
        {classes.map((c) => (
          <div key={c.id} style={styles.row}>
            <span style={styles.name}>{c.name}</span>
            <span style={styles.pill}>
              <span style={styles.code} aria-label={`Class code ${c.joinCode.split('').join(' ')}`}>
                {c.joinCode}
              </span>
            </span>
          </div>
        ))}
        {classes.length > 0 ? <p style={styles.help}>Students join your class with these codes.</p> : null}
      </Card>
    </ProfileView>
  );
}

const styles = {
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  none: { fontSize: 15, color: colors.textMuted },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingTop: 4, paddingBottom: 4 },
  name: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: colors.heading },
  pill: { flex: 'none', background: colors.accentSoft, borderRadius: 999, padding: '6px 12px' },
  code: { fontSize: 15, fontWeight: 800, color: colors.heading, letterSpacing: 2, userSelect: 'all' },
  help: { fontSize: 14, color: colors.textMuted },
} satisfies Record<string, CSSProperties>;
