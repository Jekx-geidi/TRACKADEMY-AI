import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import logoFull from '../../../assets/logo-full.png';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

/** White page used by onboarding, sign in, sign up and account setup. */
export function AuthScreen({
  children,
  back = false,
  title,
  subtitle,
  logo = false,
}: {
  children: ReactNode;
  back?: boolean;
  title?: string;
  subtitle?: string;
  logo?: boolean;
}) {
  return (
    <main className="auth-screen">
      <div className="auth-inner">
        {back ? <BackButton /> : null}
        {logo ? <img className="auth-logo" src={logoFull} alt="Trackademic" /> : null}
        {title ? (
          <div className="auth-titles">
            <h1 className="auth-title">{title}</h1>
            {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </main>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="back-btn"
      aria-label="Go back"
      onClick={onPress ?? (() => (history.length > 1 ? navigate(-1) : navigate('/', { replace: true })))}
    >
      <Icon name="chevron-back" size={24} />
    </button>
  );
}

export function OrDivider() {
  return <div className="or-divider">Or continue with</div>;
}

export function GoogleButton({ onPress, loading, disabled }: { onPress: () => void; loading: boolean; disabled: boolean }) {
  return (
    <button type="button" className="btn secondary" onClick={onPress} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? (
        <Spinner size="small" label="Continue with Google" />
      ) : (
        <>
          <Icon name="logo-google" size={20} />
          <span style={{ fontSize: 16 }}>Continue with Google</span>
        </>
      )}
    </button>
  );
}

/** "Already have an account? Sign In" style footer. */
export function SwitchPrompt({ question, action, onPress }: { question: string; action: string; onPress: () => void }) {
  return (
    <p className="switch-prompt">
      {question}{' '}
      <button type="button" className="link-btn" onClick={onPress}>
        {action}
      </button>
    </p>
  );
}

export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="dots" role="img" aria-label={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={i === active ? 'active' : undefined} />
      ))}
    </div>
  );
}
