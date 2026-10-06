import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { inject } from 'vitest';

/** Demo accounts from supabase/seed.sql (local only). */
export type DemoUser = 'teacher' | 'student' | 'parent';

/** A Supabase client signed in as one of the seeded demo accounts. */
export async function signInAs(who: DemoUser): Promise<SupabaseClient> {
  const { url, key } = inject('supabase');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: `${who}@demo.test`, password: 'demo1234' });
  if (error) throw new Error(`Could not sign in as ${who}@demo.test: ${error.message}. Run \`supabase db reset\` to reload the seed.`);
  return client;
}
