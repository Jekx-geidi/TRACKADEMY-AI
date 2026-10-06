import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { classCodeSchema } from '@/features/classes/schema';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { TextField } from './TextField';

/** Asks for a class code, then opens the join screen, which shows the class before joining (PRD v0.7 §12). */
export function JoinClassDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = classCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    navigate(`/join/${parsed.data}`);
  };

  return (
    <Dialog title="Join a class" onClose={onClose}>
      <p className="dialog-text">Enter the 6-digit code from your teacher. You will see the class before you join.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label="Class code"
          icon="school-outline"
          placeholder="6-digit code"
          inputMode="numeric"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={9}
          enterKeyHint="go"
          value={code}
          onChangeText={(v) => {
            setCode(v);
            setError(undefined);
          }}
          error={error}
        />
        <Button type="submit" label="Continue" icon="arrow-forward" disabled={!code.trim()} />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </form>
    </Dialog>
  );
}
