import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';

import { authErrorMessage, joinClass } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';
import { classCodeSchema } from '@/features/classes/schema';
import { previewSection, type SectionPreview } from '@/features/teacher/api';
import { useLoad } from '@/lib/useLoad';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import { clearPendingJoin, savePendingJoin } from './usePendingJoin';
import '../auth/auth.css';
import './join.css';

/**
 * Invite link /join/:code (PRD v0.3 §9.2–§9.3). Anyone can open it: signed-out visitors are
 * asked to sign in first (the code waits in sessionStorage), parents are told they don't
 * join classes, and students and teachers see the class and confirm before joining.
 */
export default function JoinScreen() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { code: rawCode = '' } = useParams();
  const parsed = classCodeSchema.safeParse(rawCode);
  const code = parsed.success ? parsed.data : null;
  const role = session ? (profile?.role ?? null) : null;

  // A student, teacher or parent has now seen this link, so stop sending them back to it.
  useEffect(() => {
    if (role) clearPendingJoin();
  }, [role]);

  const goTo = (path: '/sign-in' | '/sign-up' | '/setup/role') => {
    if (code) savePendingJoin(code);
    navigate(path);
  };

  if (!code) {
    return (
      <JoinFrame>
        <Notice tone="danger" title="This invite link isn't valid">
          Class codes are 6 digits. Ask your teacher for a new link or code.
        </Notice>
        <Button label="Go Home" variant="secondary" onPress={() => navigate('/', { replace: true })} />
      </JoinFrame>
    );
  }

  if (!session) {
    return (
      <JoinFrame>
        <p className="join-question">Sign in or create an account to join this class</p>
        <p className="auth-subtitle center-text">After you sign in, we bring you back here to confirm the class.</p>
        <Button label="Sign In" onPress={() => goTo('/sign-in')} />
        <Button label="Sign Up" variant="secondary" onPress={() => goTo('/sign-up')} />
      </JoinFrame>
    );
  }

  if (!profile) {
    return (
      <JoinFrame>
        <Spinner size="large" />
      </JoinFrame>
    );
  }

  if (role === 'PARENT') {
    return (
      <JoinFrame>
        <Notice tone="info" title="Parents don't join classes">
          Link your child from your Profile instead.
        </Notice>
        <Button label="Go to Profile" onPress={() => navigate(profile.setupComplete ? '/parent/profile' : '/setup/role', { replace: true })} />
      </JoinFrame>
    );
  }

  if (role === null) {
    return (
      <JoinFrame>
        <Notice tone="info" title="Choose your role first">
          Finish setting up your account as a student or teacher, then we bring you back to join this class.
        </Notice>
        <Button label="Set Up Account" onPress={() => goTo('/setup/role')} />
      </JoinFrame>
    );
  }

  return <JoinConfirm code={code} />;
}

function JoinFrame({ children }: { children: ReactNode }) {
  return (
    <AuthScreen logo>
      <div className="join-center">{children}</div>
    </AuthScreen>
  );
}

/** Student or teacher: show the class, then join on confirmation. */
function JoinConfirm({ code }: { code: string }) {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const preview = useLoad(() => previewSection(code), code);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Setup not finished → homeFor() sends them to /setup/role to finish it.
  const home = homeFor(true, profile);

  const join = async () => {
    setError(null);
    setJoining(true);
    try {
      const row = await joinClass(code);
      clearPendingJoin();
      setJoined(row.name);
      void refreshProfile();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setJoining(false);
    }
  };

  if (joined) {
    return (
      <JoinFrame>
        <Notice tone="success" title={`You joined ${joined}`}>
          {profile?.role === 'TEACHER' ? 'It now appears in your sections.' : 'Your teacher can now see your submissions for this class.'}
        </Notice>
        <Button label={profile?.setupComplete ? 'Continue' : 'Continue Setup'} icon="arrow-forward" onPress={() => navigate(home, { replace: true })} />
      </JoinFrame>
    );
  }

  return (
    <JoinFrame>
      {preview.data ? (
        <>
          <ClassPreview preview={preview.data} />
          <p className="join-question">Join this class?</p>
          {error ? (
            <Notice tone="danger" title="Could not join">
              {error}
            </Notice>
          ) : null}
          <Button label="Join Class" icon="enter-outline" loading={joining} onPress={() => void join()} />
          <Button label="Cancel" variant="ghost" disabled={joining} onPress={() => navigate(home, { replace: true })} />
        </>
      ) : preview.error ? (
        <>
          <Notice tone="danger" title="Could not open this class">
            {authErrorMessage(new Error(preview.error))}
          </Notice>
          <Button label="Try Again" variant="secondary" icon="refresh" onPress={preview.reload} />
          <Button label="Go Home" variant="ghost" onPress={() => navigate(home, { replace: true })} />
        </>
      ) : (
        <Spinner size="large" label="Loading class" />
      )}
    </JoinFrame>
  );
}

/** Class name and facts shown before joining; also used by student setup. */
export function ClassPreview({ preview }: { preview: SectionPreview }) {
  return (
    <div className="join-preview">
      <p className="join-class-name">{preview.name}</p>
      <dl className="join-facts">
        <dt>Teacher</dt>
        <dd>{preview.teacher_name ?? 'Not listed'}</dd>
        <dt>School year</dt>
        <dd>{preview.school_year ?? 'Not listed'}</dd>
        {preview.school_name ? (
          <>
            <dt>School</dt>
            <dd>{preview.school_name}</dd>
          </>
        ) : null}
        <dt>Students</dt>
        <dd>{preview.student_count}</dd>
      </dl>
    </div>
  );
}
