import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { classCodeSchema } from '@/features/classes/schema';
import { loadStudentOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Dialog } from '../../ui/Dialog';
import { ProfileView } from '../../ui/ProfileView';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';

export default function StudentProfile() {
  const { data } = useLoad(loadStudentOverview);
  const classes = data?.classes.filter((c) => c.memberRole === 'STUDENT') ?? [];
  const linkCode = data?.student.linkCode;
  const [joining, setJoining] = useState(false);

  return (
    <ProfileView>
      {linkCode ? (
        <Card style={styles.center}>
          <p style={styles.label}>Parent link code</p>
          <p style={styles.code} aria-label={`Parent link code ${linkCode.split('').join(' ')}`}>
            {linkCode}
          </p>
          <p style={styles.help}>Give this code to a parent or guardian so they can follow your progress.</p>
        </Card>
      ) : null}
      <Card>
        <p style={styles.label}>Classes</p>
        <p style={styles.value}>{classes.length ? classes.map((c) => c.name).join('\n') : 'No class joined yet'}</p>
        <Button label="Join a Class" icon="enter-outline" variant="secondary" onPress={() => setJoining(true)} />
      </Card>
      {joining ? <JoinClassDialog onClose={() => setJoining(false)} /> : null}
    </ProfileView>
  );
}

/** Asks for a class code, then opens the join screen, which shows the class before joining. */
function JoinClassDialog({ onClose }: { onClose: () => void }) {
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
      <p className="dialog-text">Enter the code from your teacher. You will see the class before you join.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label="Class code"
          icon="school-outline"
          placeholder="6-digit code"
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

const styles = {
  center: { alignItems: 'center' },
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  code: { fontSize: 32, fontWeight: 800, letterSpacing: 6, color: colors.heading, userSelect: 'all' },
  help: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: '20px' },
  value: { fontSize: 17, fontWeight: 700, color: colors.heading, lineHeight: '24px', marginTop: 4, whiteSpace: 'pre-line' },
} satisfies Record<string, CSSProperties>;
