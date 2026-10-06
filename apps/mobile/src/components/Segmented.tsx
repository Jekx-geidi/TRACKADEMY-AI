import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius, shadow, spacing } from './theme';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.option, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', backgroundColor: colors.inputFill, borderRadius: radius.md, padding: 4, gap: 4 },
  option: {
    flex: 1,
    minHeight: MIN_TOUCH - 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  active: { backgroundColor: colors.surface, ...shadow },
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.textMuted },
  labelActive: { color: colors.heading },
});
