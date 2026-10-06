import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isOnboardingDone, markOnboardingDone } from '@/lib/localPrefs';
import { supabase } from '@/lib/supabase';

import { fetchProfile } from './api';
import type { Profile } from './schema';

interface AuthState {
  /** False until the stored session (and profile, if signed in) has been read. */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  onboardingDone: boolean;
  finishOnboarding: () => void;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  // Tagged with the user it belongs to, so a previous account's profile is never shown.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null; error: string | null } | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(isOnboardingDone);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      // Sessions from the earlier anonymous prototype are not real accounts.
      if (data.session?.user.is_anonymous) {
        await supabase.auth.signOut({ scope: 'local' });
        setSession(null);
      } else {
        setSession(data.session);
      }
      setSessionLoaded(true);
    });
    // Only store the session here: calling Supabase inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next?.user.is_anonymous ? null : next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    try {
      const next = await fetchProfile(userId);
      setLoaded({ userId, profile: next, error: null });
      return next;
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Could not load your account.';
      // Keep the last good profile on a failed refresh.
      setLoaded((prev) => ({ userId, profile: prev?.userId === userId ? prev.profile : null, error }));
      return null;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchProfile(userId).then(
      (profile) => active && setLoaded({ userId, profile, error: null }),
      (e: unknown) =>
        active && setLoaded({ userId, profile: null, error: e instanceof Error ? e.message : 'Could not load your account.' }),
    );
    return () => {
      active = false;
    };
  }, [userId]);

  const current = loaded && loaded.userId === userId ? loaded : null;
  const profile = current?.profile ?? null;
  const profileError = current?.error ?? null;

  const finishOnboarding = useCallback(() => {
    markOnboardingDone();
    setOnboardingDone(true);
  }, []);

  const ready = sessionLoaded && (userId === null || current !== null);

  const value = useMemo<AuthState>(
    () => ({ ready, session, profile, profileError, onboardingDone, finishOnboarding, refreshProfile }),
    [ready, session, profile, profileError, onboardingDone, finishOnboarding, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
