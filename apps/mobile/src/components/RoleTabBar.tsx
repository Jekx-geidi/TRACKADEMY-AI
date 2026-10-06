import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow, spacing } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface TabSpec {
  label: string;
  icon: IconName;
  iconOutline: IconName;
  /** The raised, emphasised centre action (Upload / Scan / Create). */
  center?: boolean;
}

/** Height to reserve at the bottom of tab screens so content isn't hidden behind the bar. */
export const TAB_BAR_SPACE = 96;

/** Floating bottom bar for one role. Tabs appear in the order of the layout's screens. */
export function RoleTabBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: Record<string, TabSpec> }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const spec = tabs[route.name];
          if (!spec) return null;
          const active = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          if (spec.center) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={spec.label}
                onPress={onPress}
                style={styles.centerSlot}
              >
                {({ pressed }) => (
                  <>
                    <View style={[styles.center, active && styles.centerActive, pressed && styles.pressed]}>
                      <Ionicons name={spec.icon} size={28} color={active ? colors.accentText : colors.primaryText} />
                    </View>
                    <Text style={[styles.label, styles.centerLabel, active && styles.labelActive]}>{spec.label}</Text>
                  </>
                )}
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={spec.label}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <Ionicons name={active ? spec.icon : spec.iconOutline} size={24} color={active ? colors.accent : colors.textMuted} />
              <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
                {spec.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md, pointerEvents: 'box-none' },
  bar: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    height: 70,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    ...shadow,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 },
  pressed: { opacity: 0.85 },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textMuted },
  labelActive: { color: colors.heading, fontFamily: fonts.extrabold },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 56, paddingBottom: 6 },
  center: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -34,
    marginBottom: 2,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerActive: { backgroundColor: colors.accent },
  centerLabel: { color: colors.heading },
});
