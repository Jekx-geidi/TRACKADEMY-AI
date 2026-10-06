import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, shadow, spacing } from './theme';

/** Height to reserve at the bottom of tab screens so content isn't hidden behind the bar. */
export const BOTTOM_BAR_SPACE = 96;

const TABS = [
  { href: '/', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { href: '/teacher', label: 'Teacher', icon: 'school', iconOutline: 'school-outline' },
] as const;

/** Floating tab bar: Home · Scan (raised centre action) · Teacher. */
export function BottomBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [home, teacher] = TABS;

  const tab = (t: (typeof TABS)[number]) => {
    const active = pathname === t.href;
    return (
      <Pressable
        key={t.href}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={t.label}
        onPress={() => router.navigate(t.href)}
        style={styles.tab}
      >
        <Ionicons name={active ? t.icon : t.iconOutline} size={24} color={active ? colors.accent : colors.textMuted} />
        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.bar} accessibilityRole="tablist">
        {tab(home)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan School Paper"
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [styles.scan, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="scan" size={28} color={colors.primaryText} />
        </Pressable>
        {tab(teacher)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.md + 4, pointerEvents: 'box-none' },
  bar: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    height: 68,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    ...shadow,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 56 },
  tabLabel: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textMuted },
  tabLabelActive: { color: colors.heading },
  scan: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -28,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
