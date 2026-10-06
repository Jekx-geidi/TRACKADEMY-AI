import { useState } from 'react';

import { authErrorMessage, joinClass } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { fieldErrors } from '@/features/auth/schema';
import { useFinishSetup } from '@/features/auth/useFinishSetup';
import { createClassWorkspace } from '@/features/classes/api';
import { classCodeSchema, classWorkspaceSchema, currentSchoolYear, GRADE_LEVELS, workspaceName } from '@/features/classes/schema';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import '../auth/auth.css';

type Mode = 'create' | 'join';
const MODES = [
  { value: 'create', label: 'Create a class' },
  { value: 'join', label: 'Join a class' },
] as const;

const GRADE_OPTIONS = GRADE_LEVELS.map((g) => ({ value: g, label: `Grade ${g}` }));

type WorkspaceField = 'gradeLevel' | 'section' | 'schoolYear' | 'schoolName' | 'adviserName';

export default function TeacherSetupScreen() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>('create');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ name: string; joinCode?: string } | null>(null);
  const { finish, finishing, finishError } = useFinishSetup();

  // Create: the Class Workspace details (PRD §7).
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [section, setSection] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);
  const [schoolName, setSchoolName] = useState('');
  const [adviserName, setAdviserName] = useState(profile?.fullName ?? '');
  const [fieldError, setFieldError] = useState<Partial<Record<WorkspaceField, string>>>({});
  // Editing a field clears its error, so the hint (e.g. the class name preview) can show again.
  const edit =
    <T,>(field: WorkspaceField, set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setFieldError((errors) => ({ ...errors, [field]: undefined }));
    };

  // Join: a colleague's class code.
  const [code, setCode] = useState('');

  const run = async (request: () => Promise<{ name: string; joinCode?: string }>) => {
    setBusy(true);
    try {
      setDone(await request());
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    setError(undefined);
    const parsed = classWorkspaceSchema.safeParse({ gradeLevel: gradeLevel ?? 0, section, schoolYear, schoolName, adviserName });
    if (!parsed.success) {
      setFieldError(fieldErrors<WorkspaceField>(parsed.error));
      return;
    }
    setFieldError({});
    void run(() => createClassWorkspace(parsed.data));
  };

  const join = () => {
    setError(undefined);
    const parsed = classCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    void run(() => joinClass(parsed.data).then((row) => ({ name: row.name })));
  };

  const locked = busy || finishing;

  return (
    <AuthScreen back title="Set up your class" subtitle="Create a Class Workspace for your students, or join one a colleague already made.">
      {done ? (
        <div className="code-card tight">
          <p className="code-label">{done.joinCode ? 'Class created' : 'You joined'}</p>
          <p className="code-name">{done.name}</p>
          {done.joinCode ? (
            <>
              <p className="code-value" aria-label={`Class join code ${done.joinCode.split('').join(' ')}`}>
                {done.joinCode}
              </p>
              <p className="code-help">Share this class join code with your students so they can join.</p>
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
              setError(undefined);
            }}
          />
          {mode === 'create' ? (
            <form
              className="auth-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!locked) create();
              }}
            >
              <SelectField
                label="Grade level"
                icon="school-outline"
                placeholder="Choose a grade"
                options={GRADE_OPTIONS}
                value={gradeLevel}
                onChange={edit('gradeLevel', setGradeLevel)}
                error={fieldError.gradeLevel}
                disabled={locked}
              />
              <TextField
                label="Section"
                icon="people-outline"
                placeholder="e.g. St. Mark"
                autoCapitalize="words"
                maxLength={60}
                value={section}
                onChangeText={edit('section', setSection)}
                error={fieldError.section}
                hint={gradeLevel && section.trim() ? `Class name: ${workspaceName(gradeLevel, section)}` : undefined}
                editable={!locked}
              />
              <TextField
                label="School year"
                icon="book-outline"
                placeholder="2026-2027"
                inputMode="numeric"
                maxLength={9}
                value={schoolYear}
                onChangeText={edit('schoolYear', setSchoolYear)}
                error={fieldError.schoolYear}
                editable={!locked}
              />
              <TextField
                label="School name (optional)"
                icon="library-outline"
                autoCapitalize="words"
                maxLength={120}
                value={schoolName}
                onChangeText={edit('schoolName', setSchoolName)}
                error={fieldError.schoolName}
                editable={!locked}
              />
              <TextField
                label="Adviser / teacher name (optional)"
                icon="person-outline"
                autoCapitalize="words"
                autoComplete="name"
                maxLength={120}
                value={adviserName}
                onChangeText={edit('adviserName', setAdviserName)}
                error={fieldError.adviserName}
                editable={!locked}
              />
              {error ? (
                <Notice tone="danger" title="Could not create the class">
                  {error}
                </Notice>
              ) : null}
              <Button label="Create Class Workspace" type="submit" variant="secondary" icon="add-circle-outline" loading={busy} disabled={finishing} />
            </form>
          ) : (
            <form
              className="auth-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (!locked && code.trim()) join();
              }}
            >
              <TextField
                label="Class join code"
                icon="key-outline"
                placeholder="6-digit code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={9}
                enterKeyHint="go"
                value={code}
                onChangeText={setCode}
                error={error}
                editable={!busy}
              />
              <Button label="Join Class" type="submit" variant="secondary" icon="enter-outline" loading={busy} disabled={!code.trim() || finishing} />
            </form>
          )}
        </>
      )}

      <div className="auth-spacer" />
      {finishError ? <Notice tone="danger" title="Could not finish setup">{finishError}</Notice> : null}
      <Button label="Continue" onPress={() => void finish()} loading={finishing} disabled={!done || busy} />
      {!done ? <Button label="Skip for now" variant="ghost" onPress={() => void finish()} disabled={busy || finishing} /> : null}
    </AuthScreen>
  );
}
