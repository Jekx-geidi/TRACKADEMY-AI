import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';

import connect from '../../../../assets/onboarding/connect.png';
import organized from '../../../../assets/onboarding/organized.png';
import progress from '../../../../assets/onboarding/progress.png';
import { useAuth } from '@/features/auth/AuthProvider';

import { AuthScreen, BackButton, Dots } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import './auth.css';

const SLIDES = [
  {
    image: organized,
    title: 'Keep Schoolwork Organized',
    body: 'Save quizzes, assignments, projects, and checked papers in one place.',
  },
  {
    image: progress,
    title: 'Stay Updated on Progress',
    body: 'Students and parents can easily track scores, missing work, and academic evidence.',
  },
  {
    image: connect,
    title: 'Connect Students, Parents, and Teachers',
    body: 'Keep everyone aligned with clear academic records and verified schoolwork.',
  },
] as const;

export default function OnboardingScreen() {
  const { onboardingDone, finishOnboarding } = useAuth();
  const navigate = useNavigate();
  // Read once: finishing onboarding below navigates away itself.
  const [seenBefore] = useState(onboardingDone);
  const [index, setIndex] = useState(0);

  if (seenBefore) return <Navigate to="/sign-in" replace />;

  const slide = SLIDES[index] ?? SLIDES[0];
  const last = index === SLIDES.length - 1;

  const leave = (to: '/sign-in' | '/sign-up') => {
    navigate(to, { replace: true });
    finishOnboarding();
  };

  return (
    <AuthScreen>
      <div className="onboarding-top">{index > 0 ? <BackButton onPress={() => setIndex(index - 1)} /> : null}</div>

      <div className="onboarding-body">
        {/* Image size is clamped to the window height in styles.css. */}
        <img src={slide.image} alt="" />
        <Dots count={SLIDES.length} active={index} />
        <h1 className="onboarding-title">{slide.title}</h1>
        <p className="onboarding-text">{slide.body}</p>
      </div>

      {last ? (
        <Button label="Get Started" onPress={() => leave('/sign-up')} />
      ) : (
        <div className="onboarding-actions">
          <button type="button" className="onboarding-skip" onClick={() => leave('/sign-in')}>
            Skip
          </button>
          <button type="button" className="onboarding-next" aria-label="Next" onClick={() => setIndex(index + 1)}>
            <Icon name="arrow-forward" size={24} />
          </button>
        </div>
      )}
    </AuthScreen>
  );
}
