import { StyleSheet, Text, View } from 'react-native';

import { ASSESSMENT_TYPE_LABELS, QUARTER_LABELS } from '@/features/assessments/constants';
import type { AssessmentMatch } from '@/features/assessments/schema';

import { Card } from './Card';
import { IconCircle } from './IconTile';
import { colors, fonts, radius, spacing } from './theme';

export function AssessmentCard({ assessment, showCode = true }: { assessment: AssessmentMatch; showCode?: boolean }) {
  return (
    <Card>
      <View style={styles.top}>
        <IconCircle name="book" tint={colors.accentSoft} color={colors.accent} size={48} />
        <View style={styles.topText}>
          <Text style={styles.subject}>{assessment.subject}</Text>
          <Text style={styles.title}>{assessment.title}</Text>
        </View>
        {showCode ? (
          <View style={styles.codePill}>
            <Text style={styles.codeText}>{assessment.code}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.pills}>
        <Pill text={QUARTER_LABELS[assessment.quarter]} />
        <Pill text={ASSESSMENT_TYPE_LABELS[assessment.assessmentType]} />
        <Pill text={`Total Score: ${assessment.totalScore}`} />
      </View>
    </Card>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  topText: { flex: 1 },
  subject: { fontSize: 14, fontFamily: fonts.semibold, color: colors.textMuted },
  title: { fontSize: 20, fontFamily: fonts.extrabold, color: colors.heading },
  codePill: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2 },
  codeText: { fontSize: 14, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  pill: { backgroundColor: colors.inputFill, borderRadius: radius.pill, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.xs + 2 },
  pillText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.heading },
});
