import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, spacing } from './theme';

/** Small illustration of a paper with the code box in the upper-right corner. */
export function PaperGuide({ code = '55922' }: { code?: string }) {
  return (
    <View style={styles.paper} accessible accessibilityLabel={`Example paper with code ${code} in the upper-right box`}>
      <View style={styles.codeBox}>
        <Text style={styles.codeText}>{code}</Text>
      </View>
      <View style={styles.line} />
      <View style={[styles.line, { width: '70%' }]} />
      <View style={[styles.line, { width: '85%' }]} />
      <View style={[styles.line, { width: '55%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    width: 120,
    height: 150,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  codeBox: {
    alignSelf: 'flex-end',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: spacing.xs,
  },
  codeText: { fontSize: 12, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 1 },
  line: { height: 5, width: '100%', backgroundColor: colors.inputFill, borderRadius: 3 },
});
