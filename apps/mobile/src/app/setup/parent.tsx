import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Screen';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { authErrorMessage, createChildProfile, linkStudentByCode } from '@/features/auth/api';
import { joinCodeSchema } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';

type Mode = 'link' | 'create';
const MODES = [
  { value: 'link', label: 'Link with code' },
  { value: 'create', label: 'Add a child' },
] as const;

export default function ParentSetupScreen() {
  const [mode, setMode] = useState<Mode>('link');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const { finish, finishing, finishError } = useFinishSetup();

  const submit = async () => {
    setError(undefined);
    let request: Promise<{ id: string; display_name: string }>;
    if (mode === 'link') {
      const parsed = joinCodeSchema.safeParse(value);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message);
        return;
      }
      request = linkStudentByCode(parsed.data);
    } else {
      const name = value.trim();
      if (name.length < 2) {
        setError("Enter your child's name.");
        return;
      }
      request = createChildProfile(name);
    }
    setBusy(true);
    try {
      const row = await request;
      setChildren((list) => (list.some((c) => c.id === row.id) ? list : [...list, { id: row.id, name: row.display_name }]));
      setValue('');
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen back title="Link your child" subtitle="Use the code from your child's Trackademic account, or add your child yourself.">
      <Segmented
        options={MODES}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setValue('');
          setError(undefined);
        }}
      />
      {mode === 'link' ? (
        <TextField
          key="link"
          label="Student link code"
          icon="key-outline"
          placeholder="6-character code"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          value={value}
          onChangeText={setValue}
          error={error}
          hint="Your child finds this code during their own setup."
          editable={!busy && !finishing}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      ) : (
        <TextField
          key="create"
          label="Child's name"
          icon="person-outline"
          placeholder="e.g. Maria Santos"
          autoCapitalize="words"
          maxLength={120}
          value={value}
          onChangeText={setValue}
          error={error}
          editable={!busy && !finishing}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      )}
      <Button
        label={mode === 'link' ? 'Link Child' : 'Add Child'}
        variant="secondary"
        icon={mode === 'link' ? 'link-outline' : 'person-add-outline'}
        onPress={submit}
        loading={busy}
        disabled={!value.trim() || finishing}
      />

      {children.length > 0 ? (
        <View style={styles.list}>
          {children.map((c) => (
            <View key={c.id} style={styles.child}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.childName}>{c.name}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.spacer} />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={finish} loading={finishing} disabled={children.length === 0 || busy} />
      {children.length === 0 ? <Button label="Skip for now" variant="ghost" onPress={finish} disabled={busy || finishing} /> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  child: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  childName: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  spacer: { flexGrow: 1 },
});
