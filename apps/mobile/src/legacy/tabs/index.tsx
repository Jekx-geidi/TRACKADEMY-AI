import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { BOTTOM_BAR_SPACE } from '@/components/BottomBar';
import { Button } from '@/components/Button';
import { Card, HeroCard } from '@/components/Card';
import { IconTile } from '@/components/IconTile';
import { PaperGuide } from '@/components/PaperGuide';
import { Notice, Screen, SectionTitle } from '@/components/Screen';
import { colors, radius, spacing } from '@/components/theme';
import { WorkflowSteps } from '@/components/WorkflowSteps';
import { authErrorMessage, signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePickPaper } from '@/features/scanner/usePickPaper';
import { envError } from '@/lib/env';

function greeting(hour: number): string {
  if (hour < 12) return 'Good Morning!';
  if (hour < 18) return 'Good Afternoon!';
  return 'Good Evening!';
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function HomeScreen() {
  const { pick, error, busy } = usePickPaper();
  const { profile } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const now = new Date();
  const name = profile?.fullName?.trim() || 'Trackademic user';

  const leave = async () => {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      setSignOutError(authErrorMessage(e));
      setSigningOut(false);
    }
  };

  return (
    <Screen topInset bottomSpace={BOTTOM_BAR_SPACE}>
      <View style={styles.header}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} accessibilityLabel="Trackademic logo" />
        <View style={styles.headerText}>
          <Text style={styles.date}>{now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <Text style={styles.hello}>{greeting(now.getHours())}</Text>
        </View>
        <View style={styles.avatar} accessibilityLabel={`Signed in as ${name}`}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityState={{ disabled: signingOut }}
          disabled={signingOut}
          hitSlop={6}
          onPress={leave}
          style={({ pressed }) => [styles.signOut, (pressed || signingOut) && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.heading} />
        </Pressable>
      </View>

      {signOutError ? <Notice tone="danger" title="Could not sign out">{signOutError}</Notice> : null}

      {envError ? <Notice tone="danger" title="Setup needed">{envError}</Notice> : null}

      <HeroCard>
        <Text style={styles.heroEyebrow}>Trackademic</Text>
        <Text style={styles.heroTitle}>Where does this paper belong?</Text>
        <Text style={styles.heroBody}>Take a photo of a checked paper. We read the 5-digit code and find the right assessment.</Text>
        <WorkflowSteps onDark />
        <Button label="Scan School Paper" icon="scan" variant="accent" onPress={() => router.push('/scan')} />
      </HeroCard>

      {error ? <Notice tone="danger" title="Could not get the photo">{error}</Notice> : null}

      <View style={styles.tiles}>
        <IconTile icon="camera" tint={colors.accentSoft} color={colors.accent} label="Take Photo" onPress={() => !busy && pick('camera')} />
        <IconTile icon="images" tint={colors.successSoft} color={colors.success} label="Upload Photo" onPress={() => !busy && pick('library')} />
        <IconTile icon="add-circle" tint={colors.warningSoft} color={colors.warning} label="New Assessment" onPress={() => router.navigate('/teacher')} />
      </View>

      <SectionTitle>Before you scan</SectionTitle>
      <Card style={styles.guideCard}>
        <PaperGuide />
        <View style={styles.guideText}>
          <Text style={styles.guideTitle}>Code in the upper-right box</Text>
          <Text style={styles.guideBody}>Write the 5-digit code clearly. Lay the paper flat in good light.</Text>
        </View>
      </Card>

      <Text style={styles.footnote}>
        Prototype build. Saved papers are marked “waiting for teacher check” and are never shown as teacher-verified.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingTop: spacing.sm },
  // The mark is transparent, so it sits straight on the page background.
  logo: { width: 48, height: 48 },
  headerText: { flex: 1 },
  date: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  hello: { fontSize: 24, fontWeight: '800', color: colors.heading },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.accentText },
  signOut: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  heroEyebrow: { fontSize: 14, fontWeight: '600', color: colors.heroMuted },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.primaryText, marginTop: -spacing.sm },
  heroBody: { fontSize: 15, color: colors.heroMuted, lineHeight: 21, marginTop: -spacing.xs },
  tiles: { flexDirection: 'row', gap: spacing.sm + 4 },
  guideCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  guideText: { flex: 1, gap: spacing.xs },
  guideTitle: { fontSize: 16, fontWeight: '700', color: colors.heading },
  guideBody: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  footnote: { fontSize: 13, color: colors.textMuted, lineHeight: 19, textAlign: 'center' },
});
