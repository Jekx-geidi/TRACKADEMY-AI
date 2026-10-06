import { useState } from 'react';

import { authErrorMessage, createClass, joinClass } from '@/features/auth/api';
import { joinCodeSchema } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { TextField } from '../../ui/TextField';
import '../auth/auth.css';

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
        <div className="code-card tight">
          <p className="code-label">{done.joinCode ? 'Class created' : 'You joined'}</p>
          <p className="code-name">{done.name}</p>
          {done.joinCode ? (
            <>
              <p className="code-value" aria-label={`Class code ${done.joinCode.split('').join(' ')}`}>
                {done.joinCode}
              </p>
              <p className="code-help">Share this class code with your students.</p>
            </>
          ) : null}
        </div>
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
          <form
            className="auth-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && !finishing && value.trim()) void submit();
            }}
          >
            {mode === 'create' ? (
              <TextField
                key="create"
                label="Class name"
                icon="school-outline"
                placeholder="e.g. Grade 5 – Sampaguita"
                autoCapitalize="words"
                maxLength={80}
                enterKeyHint="go"
                value={value}
                onChangeText={setValue}
                error={error}
                editable={!busy}
              />
            ) : (
              <TextField
                key="join"
                label="Class code"
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
                editable={!busy}
              />
            )}
            <Button
              label={mode === 'create' ? 'Create Class' : 'Join Class'}
              type="submit"
              variant="secondary"
              icon={mode === 'create' ? 'add-circle-outline' : 'enter-outline'}
              loading={busy}
              disabled={!value.trim() || finishing}
            />
          </form>
        </>
      )}

      <div className="auth-spacer" />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={() => void finish()} loading={finishing} disabled={!done || busy} />
      {!done ? <Button label="Skip for now" variant="ghost" onPress={() => void finish()} disabled={busy || finishing} /> : null}
    </AuthScreen>
  );
}
