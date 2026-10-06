import { Ionicons } from '@expo/vector-icons';
import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from './theme';

/** `topInset` is for screens without a navigation header; `bottomSpace` leaves room for the tab bar. */
export function Screen({
  children,
  topInset = false,
  bottomSpace = 0,
  scrollRef,
}: {
  children: ReactNode;
  topInset?: boolean;
  bottomSpace?: number;
  scrollRef?: Ref<ScrollView>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={topInset ? ['top', 'left', 'right'] : ['bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.lg + bottomSpace }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const NOTICE_STYLE = {
  info: { bg: colors.accentSoft, fg: colors.heading, icon: 'information-circle' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-circle' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle' },
} as const;

export function Notice({ tone = 'info', title, children }: { tone?: NoticeTone; title: string; children?: ReactNode }) {
  const style = NOTICE_STYLE[tone];
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: style.bg }]}>
      <Ionicons name={style.icon} size={22} color={style.fg} />
      <View style={styles.noticeText}>
        <Text style={[styles.noticeTitle, { color: style.fg }]}>{title}</Text>
        {children ? <Text style={styles.noticeBody}>{children}</Text> : null}
      </View>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.md + 4 },
  inner: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.md },
  notice: { borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm + 4 },
  noticeText: { flex: 1, gap: 2 },
  noticeTitle: { fontSize: 16, fontFamily: fonts.bold },
  noticeBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.heading, opacity: 0.8, lineHeight: 21 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  sectionTitle: { fontSize: 20, fontFamily: fonts.extrabold, color: colors.heading },
});
