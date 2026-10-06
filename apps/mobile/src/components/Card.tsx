import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from './theme';

/** White rounded card with a soft shadow. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Dark gradient card used for the one most important thing on a screen. */
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={[colors.heroStart, colors.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
    gap: spacing.sm,
    ...shadow,
  },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
});
