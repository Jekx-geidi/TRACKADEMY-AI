import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProfileView } from '@/components/ProfileView';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

export default function TeacherProfile() {
  const { data } = useLoad(loadTeacherOverview);
  const classes = data?.classes.filter((c) => c.memberRole === 'TEACHER') ?? [];

  return (
    <ProfileView>
      <Card>
        <Text style={styles.label}>Classes</Text>
        {classes.length === 0 ? <Text style={styles.none}>No class yet.</Text> : null}
        {classes.map((c) => (
          <View key={c.id} style={styles.row}>
            <Text style={styles.name}>{c.name}</Text>
            <View style={styles.pill}>
              <Text style={styles.code} selectable accessibilityLabel={`Class code ${c.joinCode.split('').join(' ')}`}>
                {c.joinCode}
              </Text>
            </View>
          </View>
        ))}
        {classes.length > 0 ? <Text style={styles.help}>Students join your class with these codes.</Text> : null}
      </Card>
    </ProfileView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  none: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  name: { flex: 1, fontSize: 17, fontFamily: fonts.bold, color: colors.heading },
  pill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  code: { fontSize: 15, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 2 },
  help: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
