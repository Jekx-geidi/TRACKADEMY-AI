import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { ProfileView } from '@/components/ProfileView';
import { colors, fonts, spacing } from '@/components/theme';
import { loadStudentOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

export default function StudentProfile() {
  const { data } = useLoad(loadStudentOverview);
  const classes = data?.classes.filter((c) => c.memberRole === 'STUDENT') ?? [];
  const linkCode = data?.student.linkCode;

  return (
    <ProfileView>
      {linkCode ? (
        <Card style={styles.center}>
          <Text style={styles.label}>Parent link code</Text>
          <Text style={styles.code} selectable accessibilityLabel={`Parent link code ${linkCode.split('').join(' ')}`}>
            {linkCode}
          </Text>
          <Text style={styles.help}>Give this code to a parent or guardian so they can follow your progress.</Text>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.label}>Classes</Text>
        <Text style={styles.value}>{classes.length ? classes.map((c) => c.name).join('\n') : 'No class joined yet'}</Text>
      </Card>
    </ProfileView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  label: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  code: { fontSize: 32, fontFamily: fonts.extrabold, letterSpacing: 6, color: colors.heading },
  help: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  value: { fontSize: 17, fontFamily: fonts.bold, color: colors.heading, lineHeight: 24, marginTop: spacing.xs },
});
