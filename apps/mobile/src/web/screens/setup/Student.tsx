import { useEffect, useState } from 'react';

import { authErrorMessage, ensureMyStudentProfile, joinClass } from '@/features/auth/api';
import { useFinishSetup } from '@/features/auth/useFinishSetup';
import { classCodeSchema } from '@/features/classes/schema';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import { TextField } from '../../ui/TextField';
import '../auth/auth.css';

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
    const parsed = classCodeSchema.safeParse(classCode);
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
      <div className="code-card">
        <p className="code-label">Your parent link code</p>
        {linkCode ? (
          <p className="code-value" aria-label={`Link code ${linkCode.split('').join(' ')}`}>
            {linkCode}
          </p>
        ) : loadError ? (
          <>
            <p className="code-error">{loadError}</p>
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
          <Spinner />
        )}
        <p className="code-help">A parent or guardian enters this code to follow your progress.</p>
      </div>

      {joined ? <Notice tone="success" title={`You joined ${joined}`} /> : null}
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!joining && !finishing && classCode.trim()) void join();
        }}
      >
        <TextField
          label="Class code (optional)"
          icon="school-outline"
          placeholder="6-digit code from your teacher"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={9}
          enterKeyHint="go"
          value={classCode}
          onChangeText={(v) => {
            setClassCode(v);
            setClassError(undefined);
          }}
          error={classError}
          editable={!joining && !finishing}
        />
        <Button label="Join Class" type="submit" variant="secondary" icon="enter-outline" loading={joining} disabled={!classCode.trim() || finishing} />
      </form>

      <div className="auth-spacer" />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={() => void finish()} loading={finishing} disabled={!linkCode || joining} />
    </AuthScreen>
  );
}
