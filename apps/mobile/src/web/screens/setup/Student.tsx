import { useEffect, useState } from 'react';

import { authErrorMessage, ensureMyStudentProfile, joinClass } from '@/features/auth/api';
import { useFinishSetup } from '@/features/auth/useFinishSetup';
import { classCodeSchema } from '@/features/classes/schema';
import { previewSection, type SectionPreview } from '@/features/teacher/api';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import { TextField } from '../../ui/TextField';
import { ClassPreview } from '../join/Join';
import '../auth/auth.css';
import '../join/join.css';

export default function StudentSetupScreen() {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [classCode, setClassCode] = useState('');
  const [classError, setClassError] = useState<string | undefined>();
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  // The class found for the typed code, waiting for the student to confirm (PRD v0.3 §9.3).
  const [preview, setPreview] = useState<{ code: string; section: SectionPreview } | null>(null);
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

  // Step 1: look the code up and show the class.
  const findClass = async () => {
    const parsed = classCodeSchema.safeParse(classCode);
    if (!parsed.success) {
      setClassError(parsed.error.issues[0]?.message);
      return;
    }
    setClassError(undefined);
    setJoined(null);
    setJoining(true);
    try {
      setPreview({ code: parsed.data, section: await previewSection(parsed.data) });
    } catch (e) {
      setClassError(authErrorMessage(e));
    } finally {
      setJoining(false);
    }
  };

  // Step 2: the student confirmed.
  const join = async () => {
    if (!preview) return;
    setClassError(undefined);
    setJoining(true);
    try {
      const row = await joinClass(preview.code);
      setJoined(row.name);
      setPreview(null);
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
      {preview ? (
        <div className="auth-form">
          <ClassPreview preview={preview.section} />
          <p className="join-question">Join this class?</p>
          {classError ? (
            <Notice tone="danger" title="Could not join">
              {classError}
            </Notice>
          ) : null}
          <Button label="Join Class" icon="enter-outline" loading={joining} disabled={finishing} onPress={() => void join()} />
          <Button label="Cancel" variant="ghost" disabled={joining} onPress={() => {
              setPreview(null);
              setClassError(undefined);
            }}
          />
        </div>
      ) : (
        <form
          className="auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!joining && !finishing && classCode.trim()) void findClass();
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
      )}

      <div className="auth-spacer" />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={() => void finish()} loading={finishing} disabled={!linkCode || joining || preview !== null} />
    </AuthScreen>
  );
}
