import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import logo from '../../../../assets/logo.png';
import learning from '../../../../assets/welcome/learning.png';
import wordmark from '../../../../assets/welcome/wordmark.png';
import { useAuth } from '@/features/auth/AuthProvider';

import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import './welcome.css';

const FADE_MS = 350;

/**
 * Landing screen whenever the app opens signed out: brand, one line about the app, then Continue.
 * Continue goes to onboarding the first time, and straight to sign in after that.
 */
export default function WelcomeScreen() {
  const { onboardingDone } = useAuth();
  const navigate = useNavigate();
  // Read once so the destination doesn't change mid-fade.
  const [seenBefore] = useState(onboardingDone);
  const [leaving, setLeaving] = useState(false);

  // `.welcome.leaving` fades the frame out (styles.css); move on once it has finished.
  useEffect(() => {
    if (!leaving) return;
    const to = seenBefore ? '/sign-in' : '/onboarding';
    const timer = setTimeout(() => navigate(to, { replace: true }), FADE_MS);
    return () => clearTimeout(timer);
  }, [leaving, seenBefore, navigate]);

  const next = () => {
    if (leaving) return;
    setLeaving(true);
  };

  return (
    <div className="welcome-page">
      <main className={`welcome${leaving ? ' leaving' : ''}`}>
        {/* Background shapes (sizes in welcome.css) */}
        <div className="welcome-shape welcome-dome" aria-hidden="true" />
        <div className="welcome-shape welcome-circle" aria-hidden="true" />
        <div className="welcome-shape welcome-wave" aria-hidden="true" />
        <div className="welcome-glow" aria-hidden="true" />
        {/* Content */}
        <div className="welcome-content">
          <img className="welcome-logo" src={logo} alt="" />
          <h1>
            <img className="welcome-wordmark" src={wordmark} alt="Trackademic" />
          </h1>
          <p className="welcome-tagline">
            Trackademic is a role-based academic evidence tracking platform that connects Students, Parents/Guardians, and Teachers around the
            same schoolwork records.
          </p>
          {/* Anchored low so the illustration rests on the bottom shapes, as in the design. */}
          <div className="welcome-art">
            <img src={learning} alt="" />
          </div>
        </div>

        <div className="welcome-footer">
          <DocBadge />
          <Button label="Continue" variant="accent" onPress={next} disabled={leaving} />
        </div>
      </main>
    </div>
  );
}

/** White document with an arrow, from the design's bottom-left circle. Decorative only. */
function DocBadge() {
  return (
    <div className="doc-badge" aria-hidden="true">
      <div className="doc">
        <span style={{ width: '70%' }} />
        <span style={{ width: '70%' }} />
        <span style={{ width: '45%' }} />
      </div>
      <div className="arrow">
        <Icon name="arrow-up" size={14} />
      </div>
    </div>
  );
}
