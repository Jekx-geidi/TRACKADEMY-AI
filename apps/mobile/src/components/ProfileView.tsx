import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ROLE_LABELS } from '@/features/auth/roles';
import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage, signOut } from '@/services/api/auth';

import { Button } from './Button';
import { Card } from './Card';
import { InstallAppCard } from './InstallAppCard';
import { TAB_BAR_SPACE } from './RoleTabBar';
import { Notice, Screen } from './Screen';
import { colors, fonts, spacing } from './theme';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Shared profile tab: who is signed in, role-specific details, and Sign Out. */
export function ProfileView({ children }: { children?: ReactNode }) {
  const { profile, session } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = profile?.fullName?.trim() || 'Trackademic user';

  const leave = async () => {
    setError(null);
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        {session?.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
        {profile?.role ? (
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.role]}</Text>
          </View>
        ) : null}
      </Card>
      {children}
      <InstallAppCard />
      {error ? (
        <Notice tone="danger" title="Could not sign out">
          {error}
        </Notice>
      ) : null}
      <Button label="Sign Out" icon="log-out-outline" variant="secondary" onPress={leave} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg, marginTop: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 26, fontFamily: fonts.extrabold, color: colors.primaryText },
  name: { fontSize: 22, fontFamily: fonts.extrabold, color: colors.heading, textAlign: 'center' },
  email: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  rolePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  roleText: { fontSize: 14, fontFamily: fonts.bold, color: colors.heading },
});
