import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Screen';
import { colors, fonts, radius, shadow, spacing } from '@/components/theme';
import { authErrorMessage, setMyRole, signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Role } from '@/features/auth/schema';

const ROLE_CARDS: { role: Role; title: string; body: string; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { role: 'STUDENT', title: 'Student', body: 'Keep your schoolwork and scores in one place.', icon: 'book-outline' },
  { role: 'PARENT', title: 'Parent / Guardian', body: "Follow your child's progress and papers.", icon: 'people-outline' },
  { role: 'TEACHER', title: 'Teacher', body: 'Create assessments and manage your classes.', icon: 'easel-outline' },
];

const NEXT_STEP = { STUDENT: '/setup/student', PARENT: '/setup/parent', TEACHER: '/setup/teacher' } as const;

export default function RoleScreen() {
  const { profile, profileError, refreshProfile } = useAuth();
  const [picked, setPicked] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = picked ?? profile?.role ?? null;

  const next = async () => {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await setMyRole(selected);
      await refreshProfile();
      router.push(NEXT_STEP[selected]);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return (
      <AuthScreen logo>
        <View style={styles.center}>
          {profileError ? (
            <>
              <Notice tone="danger" title="Could not load your account">{authErrorMessage(new Error(profileError))}</Notice>
              <Button label="Try Again" onPress={() => void refreshProfile()} />
              <Button label="Sign Out" variant="ghost" onPress={() => void signOut()} />
            </>
          ) : (
            <ActivityIndicator color={colors.accent} size="large" />
          )}
        </View>
      </AuthScreen>
    );
  }

  const firstName = profile.fullName?.split(/\s+/)[0];

  return (
    <AuthScreen
      logo
      title={firstName ? `Hi, ${firstName}!` : 'Welcome!'}
      subtitle="Who are you using Trackademic as?"
    >
      {error ? <Notice tone="danger" title="Could not save your choice">{error}</Notice> : null}
      <View style={styles.cards} accessibilityRole="radiogroup">
        {ROLE_CARDS.map((card) => {
          const active = selected === card.role;
          return (
            <Pressable
              key={card.role}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, disabled: busy }}
              accessibilityLabel={card.title}
              disabled={busy}
              onPress={() => setPicked(card.role)}
              style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
            >
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <Ionicons name={card.icon} size={28} color={active ? colors.primaryText : colors.accent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={styles.cardBody}>{card.body}</Text>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={active ? colors.accent : colors.border}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.spacer} />
      <Button label="Continue" onPress={next} loading={busy} disabled={!selected} />
      <Button label="Sign Out" variant="ghost" onPress={() => void signOut()} disabled={busy} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: spacing.md },
  cards: { gap: spacing.sm + 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg - 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow,
  },
  cardActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.85 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.accent },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.heading },
  cardBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  spacer: { flexGrow: 1 },
});
