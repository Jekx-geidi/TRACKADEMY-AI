// Single entry point for the backend. Screens import from '@/services/api/*', never from
// Supabase directly, so the transport can change (e.g. to a Laravel + Sanctum REST API at
// EXPO_PUBLIC_API_URL) by rewriting these modules only.
//
// Today every call goes to Supabase: Row Level Security limits reads to what the signed-in
// user may see, and all writes go through SECURITY DEFINER functions that check the role.
import { env } from '@/lib/env';

export { ensureSignedIn, supabase } from '@/lib/supabase';

/** Reserved for a future REST backend; undefined while Supabase is the backend. */
export const API_URL: string | undefined = env.EXPO_PUBLIC_API_URL;

/** Throws a plain-language error when a Supabase call failed. */
export function check<T>(result: { data: T; error: unknown }, message: string): T {
  if (result.error) {
    const error = new Error(message);
    (error as Error & { cause?: unknown }).cause = result.error;
    throw error;
  }
  return result.data;
}
