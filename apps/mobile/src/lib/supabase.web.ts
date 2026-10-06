import { createClient } from '@supabase/supabase-js';

import { env } from './env';
import { sessionStorage } from './sessionStorage';

// Browser build of lib/supabase.ts. The session lives in this site's localStorage
// (see sessionStorage.ts); tokens refresh automatically while the page is open.
export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Google sign-in and email links return with the tokens in the URL.
    detectSessionInUrl: true,
  },
});

/** The signed-in user's id. Screens behind the auth gate call this before any request. */
export async function ensureSignedIn(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user;
  if (!user) throw new Error('Please sign in again.');
  return user.id;
}
