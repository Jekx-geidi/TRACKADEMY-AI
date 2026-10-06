import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { authErrorMessage, createClass, joinClass } from '@/features/auth/api';
import { joinCodeSchema } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';

type Mode = 'create' | 'join';
const MODES = [
  { value: 'create', label: 'Create a class' },
  { value: 'join', label: 'Join a class' },
] as const;

export default function TeacherSetupScreen() {
  const [mode, setMode] = useState<Mode>('create');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; joinCode?: string } | null>(null);
  const { finish, finishing, finishError } = useFinishSetup();

  const submit = async () => {
    setError(undefined);
    let request: Promise<{ name: string; joinCode?: string }>;
    if (mode === 'create') {
      const name = value.trim();
      if (name.length < 2) {
        setError('Enter a class name.');
        return;
      }
      request = createClass(name).then((row) => ({ name: row.name, joinCode: row.join_code }));
    } else {
      const parsed = joinCodeSchema.safeParse(value);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message);
        return;
      }
      request = joinClass(parsed.data).then((row) => ({ name: row.name }));
    }
    setBusy(true);
    try {
      setDone(await request);
      setValue('');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen back title="Set up your class" subtitle="Create a class for your students, or join one a colleague already made.">
      {done ? (
        <View style={styles.doneCard}>
          <Text style={styles.doneLabel}>{done.joinCode ? 'Class created' : 'You joined'}</Text>
          <Text style={styles.doneName}>{done.name}</Text>
          {done.joinCode ? (
            <>
              <Text style={styles.code} selectable accessibilityLabel={`Class code ${done.joinCode.split('').join(' ')}`}>
                {done.joinCode}
              </Text>
              <Text style={styles.doneHelp}>Share this class code with your students.</Text>
            </>
          ) : null}
        </View>
      ) : (
        <>
          <Segmented
            options={MODES}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setValue('');
              setError(undefined);
            }}
          />
          {mode === 'create' ? (
            <TextField
              key="create"
              label="Class name"
              icon="school-outline"
              placeholder="e.g. Grade 5 – Sampaguita"
              autoCapitalize="words"
              maxLength={80}
              value={value}
              onChangeText={setValue}
              error={error}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          ) : (
            <TextField
              key="join"
              label="Class code"
              icon="key-outline"
              placeholder="6-character code"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              value={value}
              onChangeText={setValue}
              error={error}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={submit}
            />
          )}
          <Button
            label={mode === 'create' ? 'Create Class' : 'Join Class'}
            variant="secondary"
            icon={mode === 'create' ? 'add-circle-outline' : 'enter-outline'}
            onPress={submit}
            loading={busy}
            disabled={!value.trim() || finishing}
          />
        </>
      )}

      <View style={styles.spacer} />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={finish} loading={finishing} disabled={!done || busy} />
      {!done ? <Button label="Skip for now" variant="ghost" onPress={finish} disabled={busy || finishing} /> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  doneCard: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  doneLabel: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  doneName: { fontSize: 22, fontFamily: fonts.extrabold, color: colors.heading, textAlign: 'center' },
  code: { fontSize: 36, fontFamily: fonts.extrabold, color: colors.heading, letterSpacing: 6, marginTop: spacing.sm },
  doneHelp: { fontFamily: fonts.regular, fontSize: 14, color: colors.heading, opacity: 0.75, textAlign: 'center' },
  spacer: { flexGrow: 1 },
});
