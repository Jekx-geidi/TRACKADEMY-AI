import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, MIN_TOUCH, radius, spacing } from './theme';

/** White, keyboard-safe page used by onboarding, sign in, sign up and account setup. */
export function AuthScreen({
  children,
  back = false,
  title,
  subtitle,
  logo = false,
}: {
  children: ReactNode;
  back?: boolean;
  title?: string;
  subtitle?: string;
  logo?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            {back ? <BackButton /> : null}
            {logo ? (
              <Image source={require('../../assets/logo-full.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="Trackademic" />
            ) : null}
            {title ? (
              <View style={styles.titles}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={24} color={colors.heading} />
    </Pressable>
  );
}

export function OrDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.dividerText}>Or continue with</Text>
      <View style={styles.line} />
    </View>
  );
}

export function GoogleButton({ onPress, loading, disabled }: { onPress: () => void; loading: boolean; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.google, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.heading} />
      ) : (
        <>
          <Ionicons name="logo-google" size={20} color={colors.heading} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </>
      )}
    </Pressable>
  );
}

/** "Already have an account? Sign In" style footer. */
export function SwitchPrompt({ question, action, onPress }: { question: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchText}>{question} </Text>
      <Pressable accessibilityRole="link" hitSlop={10} onPress={onPress}>
        <Text style={styles.switchAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  inner: { flexGrow: 1, width: '100%', maxWidth: 440, alignSelf: 'center', gap: spacing.md },
  back: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  logo: { width: 200, height: 54, alignSelf: 'center', marginTop: spacing.sm },
  titles: { gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: 28, fontFamily: fonts.extrabold, color: colors.heading, textAlign: 'center' },
  subtitle: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted, lineHeight: 22, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginVertical: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  google: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleText: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  switchRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: spacing.sm },
  switchText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  switchAction: { fontSize: 15, fontFamily: fonts.bold, color: colors.accent },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceTint },
  dotActive: { width: 24, backgroundColor: colors.accent },
});
