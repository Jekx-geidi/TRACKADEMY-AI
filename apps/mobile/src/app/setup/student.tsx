import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { authErrorMessage, ensureMyStudentProfile, joinClass } from '@/features/auth/api';
import { joinCodeSchema } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';

export default function StudentSetupScreen() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [classCode, setClassCode] = useState('');
  const [classError, setClassError] = useState<string | undefined>();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const { finish, finishing, finishError } = useFinishSetup();

  useEffect(() => {
    let active = true;
    ensureMyStudentProfile()
      .then((row) => active && setLinkCode(row.link_code))
      .catch((e: unknown) => active && setLoadError(authErrorMessage(e)));
    return () => {
      active = false;
    };
  }, [attempt]);

  const join = async () => {
    const parsed = joinCodeSchema.safeParse(classCode);
    if (!parsed.success) {
      setClassError(parsed.error.issues[0]?.message);
      return;
    }
    setClassError(undefined);
    setJoining(true);
    try {
      const row = await joinClass(parsed.data);
      setJoined(row.name);
      setClassCode('');
    } catch (e) {
      setClassError(authErrorMessage(e));
    } finally {
      setJoining(false);
    }
  };

  return (
    <AuthScreen back title="Set up your student account" subtitle="Share your code with a parent, and join your class if you have a code.">
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your parent link code</Text>
        {linkCode ? (
          <Text style={styles.code} selectable accessibilityLabel={`Link code ${linkCode.split('').join(' ')}`}>
            {linkCode}
          </Text>
        ) : loadError ? (
          <>
            <Text style={styles.codeError}>{loadError}</Text>
            <Button
              label="Try Again"
              variant="secondary"
              onPress={() => {
                setLoadError(null);
                setAttempt((a) => a + 1);
              }}
            />
          </>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
        <Text style={styles.codeHelp}>A parent or guardian enters this code to follow your progress.</Text>
      </View>

      {joined ? <Notice tone="success" title={`You joined ${joined}`} /> : null}
      <TextField
        label="Class code (optional)"
        icon="school-outline"
        placeholder="6-character code from your teacher"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        value={classCode}
        onChangeText={(v) => {
          setClassCode(v);
          setClassError(undefined);
        }}
        error={classError}
        editable={!joining && !finishing}
        returnKeyType="go"
        onSubmitEditing={join}
      />
      <Button label="Join Class" variant="secondary" icon="enter-outline" onPress={join} loading={joining} disabled={!classCode.trim() || finishing} />

      <View style={styles.spacer} />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={finish} loading={finishing} disabled={!linkCode || joining} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  codeCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  codeLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  code: { fontSize: 36, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 6 },
  codeError: { fontFamily: fonts.regular, fontSize: 15, color: colors.danger, textAlign: 'center' },
  codeHelp: { fontFamily: fonts.regular, fontSize: 14, color: colors.heading, opacity: 0.75, textAlign: 'center', lineHeight: 20 },
  spacer: { flexGrow: 1 },
});
