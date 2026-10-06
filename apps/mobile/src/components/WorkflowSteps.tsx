import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from './theme';

const STEPS = ['Scan Paper', 'Detect Code', 'Match Assessment', 'Confirm Score'] as const;

/**
 * The core workflow, with the current step highlighted. `current` is 0-based; -1 shows none.
 * `onDark` renders for use inside a HeroCard.
 */
export function WorkflowSteps({ current = -1, onDark = false }: { current?: number; onDark?: boolean }) {
  return (
    <View style={styles.row} accessibilityLabel={current >= 0 ? `Step ${current + 1} of ${STEPS.length}` : 'How it works'}>
      {STEPS.map((step, i) => {
        const done = current >= 0 && i < current;
        const active = i === current;
        return (
          <View key={step} style={styles.step}>
            <View style={[styles.dot, onDark && styles.dotOnDark, done && styles.dotDone, active && styles.dotActive]}>
              <Text style={[styles.dotText, onDark && styles.dotTextOnDark, done && styles.dotTextDone, active && styles.dotTextActive]}>
                {done ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.label, onDark && styles.labelOnDark, active && !onDark && styles.labelActive]} numberOfLines={2}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs + 2 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOnDark: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotText: { fontSize: 13, fontFamily: fonts.bold, color: colors.textMuted },
  dotTextOnDark: { color: colors.heroMuted },
  dotTextDone: { color: colors.primaryText },
  dotTextActive: { color: colors.accentText },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  labelOnDark: { color: colors.heroMuted },
  labelActive: { color: colors.heading, fontFamily: fonts.bold },
});
