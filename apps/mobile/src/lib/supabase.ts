import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { env } from './env';
import { sessionStorage } from './sessionStorage';

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // SecureStore on iOS/Android (see sessionStorage.native.ts).
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Web finishes Google sign-in by reading the tokens from the redirect URL.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

/** The signed-in user's id. Screens behind the auth gate call this before any request. */
export async function ensureSignedIn(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('Please sign in again.');
  return user.id;
}
