import { useState } from 'react';
import { useNavigate } from 'react-router';

import { authErrorMessage, setMyRole, signOut } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Role } from '@/features/auth/schema';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Icon, type IconName } from '../../ui/Icon';
import { Notice } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import '../auth/auth.css';

const ROLE_CARDS: { role: Role; title: string; body: string; icon: IconName }[] = [
  { role: 'STUDENT', title: 'Student', body: 'Join your class and upload your own schoolwork and scores.', icon: 'book-outline' },
  { role: 'PARENT', title: 'Parent / Guardian', body: "Monitor your child's academic records, missing work, and teacher updates.", icon: 'people-outline' },
  { role: 'TEACHER', title: 'Teacher', body: 'Create classes, organize subjects, and review student evidence.', icon: 'easel-outline' },
];

const NEXT_STEP = { STUDENT: '/setup/student', PARENT: '/setup/parent', TEACHER: '/setup/teacher' } as const;

export default function RoleScreen() {
  const { profile, profileError, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = picked ?? profile?.role ?? null;

  const next = async () => {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await setMyRole(selected);
      await refreshProfile();
      navigate(NEXT_STEP[selected]);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return (
      <AuthScreen logo>
        <div className="setup-center">
          {profileError ? (
            <>
              <Notice tone="danger" title="Could not load your account">{authErrorMessage(new Error(profileError))}</Notice>
              <Button label="Try Again" onPress={() => void refreshProfile()} />
              <Button label="Sign Out" variant="ghost" onPress={() => void signOut()} />
            </>
          ) : (
            <Spinner size="large" />
          )}
        </div>
      </AuthScreen>
    );
  }

  const firstName = profile.fullName?.split(/\s+/)[0];

  return (
    <AuthScreen logo title={firstName ? `Hi, ${firstName}!` : 'Welcome!'} subtitle="Who are you using Trackademic as?">
      {error ? <Notice tone="danger" title="Could not save your choice">{error}</Notice> : null}
      <div className="role-cards" role="radiogroup" aria-label="Your role">
        {ROLE_CARDS.map((card) => {
          const active = selected === card.role;
          return (
            <button
              key={card.role}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={card.title}
              disabled={busy}
              className="role-card"
              onClick={() => setPicked(card.role)}
            >
              <span className="role-icon">
                <Icon name={card.icon} size={28} />
              </span>
              <span className="role-text">
                <span className="role-title">{card.title}</span>
                <span className="role-body">{card.body}</span>
              </span>
              <Icon className="role-check" name={active ? 'checkmark-circle' : 'ellipse-outline'} size={24} />
            </button>
          );
        })}
      </div>
      <div className="auth-spacer" />
      <Button label="Continue" onPress={() => void next()} loading={busy} disabled={!selected} />
      <Button label="Sign Out" variant="ghost" onPress={() => void signOut()} disabled={busy} />
    </AuthScreen>
  );
}
