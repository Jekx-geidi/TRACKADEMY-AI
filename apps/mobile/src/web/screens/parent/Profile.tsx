import { useState, type CSSProperties, type FormEvent } from 'react';

import { joinCodeSchema } from '@/features/auth/schema';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { authErrorMessage } from '@/services/api/auth';
import { createChildProfile, linkStudentByCode } from '@/services/api/guardians';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { ProfileView } from '../../ui/ProfileView';
import { Segmented } from '../../ui/Segmented';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';

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
        <p style={styles.label}>Children</p>
        {children && children.length > 0 ? (
          children.map((c) => (
            <div key={c.id} style={styles.child}>
              <Icon name="person-circle" size={28} color={colors.accent} />
              <span style={styles.childName}>{c.displayName}</span>
            </div>
          ))
        ) : (
          <p style={styles.none}>No child linked yet.</p>
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

  // A <form> so Enter in the field submits, like the button (which stays disabled while empty).
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !value.trim()) return;
    void submit();
  };

  return (
    <Card>
      <form style={styles.form} onSubmit={onSubmit} noValidate>
        <h2 style={styles.formTitle}>Link another child</h2>
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
            autoCorrect="off"
            spellCheck={false}
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
        {done ? (
          <p style={styles.done} role="status">
            {done} is linked to your account.
          </p>
        ) : null}
        <Button
          type="submit"
          label={mode === 'link' ? 'Link Child' : 'Add Child'}
          variant="secondary"
          icon={mode === 'link' ? 'link-outline' : 'person-add-outline'}
          loading={busy}
          disabled={!value.trim()}
        />
      </form>
    </Card>
  );
}

const styles = {
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  child: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4, paddingBottom: 4 },
  childName: { fontSize: 17, fontWeight: 700, color: colors.heading },
  none: { fontSize: 15, color: colors.textMuted },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formTitle: { fontSize: 18, fontWeight: 800, color: colors.heading },
  done: { fontSize: 15, fontWeight: 700, color: colors.success },
} satisfies Record<string, CSSProperties>;
