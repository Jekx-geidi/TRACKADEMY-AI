import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProfileView } from '@/components/ProfileView';
import { Segmented } from '@/components/Segmented';
import { TextField } from '@/components/TextField';
import { colors, fonts, spacing } from '@/components/theme';
import { joinCodeSchema } from '@/features/auth/schema';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { authErrorMessage } from '@/services/api/auth';
import { createChildProfile, linkStudentByCode } from '@/services/api/guardians';

type Mode = 'link' | 'create';
const MODES = [
  { value: 'link', label: 'Link with code' },
  { value: 'create', label: 'Add a child' },
] as const;

export default function ParentProfile() {
  const { children, reload } = useSelectedChild();

  return (
    <ProfileView>
      <Card>
        <Text style={styles.label}>Children</Text>
        {children && children.length > 0 ? (
          children.map((c) => (
            <View key={c.id} style={styles.child}>
              <Ionicons name="person-circle" size={28} color={colors.accent} />
              <Text style={styles.childName}>{c.displayName}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.none}>No child linked yet.</Text>
        )}
      </Card>
      <LinkChildCard onLinked={reload} />
    </ProfileView>
  );
}

function LinkChildCard({ onLinked }: { onLinked: () => void }) {
  const [mode, setMode] = useState<Mode>('link');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(undefined);
    setDone(null);
    let request: Promise<{ display_name: string }>;
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
      setDone(row.display_name);
      setValue('');
      onLinked();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.form}>
      <Text style={styles.formTitle}>Link another child</Text>
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
          editable={!busy}
        />
      ) : (
        <TextField
          key="create"
          label="Child's name"
          icon="person-outline"
          placeholder="e.g. Maria Santos"
          autoCapitalize="words"
          maxLength={100}
          value={value}
          onChangeText={setValue}
          error={error}
          editable={!busy}
        />
      )}
      {done ? <Text style={styles.done}>{done} is linked to your account.</Text> : null}
      <Button
        label={mode === 'link' ? 'Link Child' : 'Add Child'}
        variant="secondary"
        icon={mode === 'link' ? 'link-outline' : 'person-add-outline'}
        onPress={submit}
        loading={busy}
        disabled={!value.trim()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted },
  child: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  childName: { fontSize: 17, fontFamily: fonts.bold, color: colors.heading },
  none: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted },
  form: { gap: spacing.md },
  formTitle: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.heading },
  done: { fontSize: 15, fontFamily: fonts.bold, color: colors.success },
});
