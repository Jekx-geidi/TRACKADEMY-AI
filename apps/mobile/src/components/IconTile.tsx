import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, shadow, spacing } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function IconCircle({ name, tint, color, size = 52 }: { name: IconName; tint: string; color: string; size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: tint }]}>
      <Ionicons name={name} size={size * 0.46} color={color} />
    </View>
  );
}

/** Square-ish action tile: tinted icon circle above a short label. */
export function IconTile({
  icon,
  tint,
  color,
  label,
  onPress,
}: {
  icon: IconName;
  tint: string;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <IconCircle name={icon} tint={tint} color={color} />
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  tile: {
    flex: 1,
    minHeight: 124,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  label: { fontSize: 14, fontFamily: fonts.semibold, color: colors.heading, textAlign: 'center' },
});
