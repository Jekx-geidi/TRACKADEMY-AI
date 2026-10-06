import { useState } from 'react';

import { authErrorMessage, markSetupComplete } from './api';
import { useAuth } from './AuthProvider';

/** Marks setup done; the root layout then switches to the main app. */
export function useFinishSetup() {
  const { refreshProfile } = useAuth();
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const finish = async () => {
    setFinishError(null);
    setFinishing(true);
    try {
      await markSetupComplete();
      await refreshProfile();
    } catch (e) {
      setFinishError(authErrorMessage(e));
      setFinishing(false);
    }
  };

  return { finish, finishing, finishError };
}
