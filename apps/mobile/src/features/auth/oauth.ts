import { supabase } from '@/lib/supabase';

// Browser version. iOS/Android (Expo) is oauth.native.ts.

/** Where Supabase sends the user back after email confirmation, password reset or Google. */
export function redirectUrl(): string {
  return window.location.origin;
}

/** Redirects to Google; the page comes back signed in (detectSessionInUrl). */
export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
  if (error) throw error;
}
