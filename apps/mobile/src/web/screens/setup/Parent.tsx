import { useState } from 'react';

import { authErrorMessage, createChildProfile, linkStudentByCode } from '@/features/auth/api';
import { joinCodeSchema } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Notice } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { TextField } from '../../ui/TextField';
import '../auth/auth.css';

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
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && !finishing && value.trim()) void submit();
        }}
      >
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
            enterKeyHint="go"
            value={value}
            onChangeText={setValue}
            error={error}
            hint="Your child finds this code during their own setup."
            editable={!busy && !finishing}
          />
        ) : (
          <TextField
            key="create"
            label="Child's name"
            icon="person-outline"
            placeholder="e.g. Maria Santos"
            autoCapitalize="words"
            maxLength={120}
            enterKeyHint="go"
            value={value}
            onChangeText={setValue}
            error={error}
            editable={!busy && !finishing}
          />
        )}
        <Button
          label={mode === 'link' ? 'Link Child' : 'Add Child'}
          type="submit"
          variant="secondary"
          icon={mode === 'link' ? 'link-outline' : 'person-add-outline'}
          loading={busy}
          disabled={!value.trim() || finishing}
        />
      </form>

      {children.length > 0 ? (
        <ul className="child-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {children.map((c) => (
            <li key={c.id} className="child-row">
              <Icon name="checkmark-circle" size={22} />
              <span>{c.name}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="auth-spacer" />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={() => void finish()} loading={finishing} disabled={children.length === 0 || busy} />
      {children.length === 0 ? <Button label="Skip for now" variant="ghost" onPress={() => void finish()} disabled={busy || finishing} /> : null}
    </AuthScreen>
  );
}
