import './localStorage';

const ONBOARDING_KEY = 'trackademic.onboardingDone';
// Name used before the rename; still read so people who finished onboarding don't see it again.
const OLD_ONBOARDING_KEY = 'checkmetory.onboardingDone';

// Storage can be unavailable (private browsing, cleared data); onboarding then simply shows again.
export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1' || localStorage.getItem(OLD_ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Not fatal.
  }
}
