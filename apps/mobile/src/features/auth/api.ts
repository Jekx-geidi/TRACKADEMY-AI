import { supabase } from '@/lib/supabase';

import { redirectUrl } from './oauth';
import { profileRowSchema, type Profile, type Role, type SignInInput, type SignUpInput } from './schema';

// Google sign-in differs per platform: oauth.ts (browser) and oauth.native.ts (iOS/Android).
export { signInWithGoogle } from './oauth';

/** Turns Supabase/Postgres errors into short, plain-language messages. */
export function authErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/already (been )?registered|user already exists/i.test(message)) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox.';
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return 'Google sign-in is not set up for this project yet. Use email and password for now.';
  }
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  if (/failed to fetch|network request failed|networkerror/i.test(message)) {
    return 'Could not reach the server. Check your internet connection.';
  }
  return message || 'Something went wrong. Please try again.';
}

/** Returns true when the account still needs its email confirmed before signing in. */
export async function signUp(input: SignUpInput): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.fullName }, emailRedirectTo: redirectUrl() },
  });
  if (error) throw error;
  // With email confirmation on, Supabase returns a user with no identities for an existing email.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('An account with this email already exists. Try signing in.');
  }
  return { needsConfirmation: data.session === null };
}

export async function signIn(input: SignInInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) throw error;
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, role, setup_completed_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? profileRowSchema.parse(data) : { fullName: null, role: null, setupComplete: false };
}

export async function setMyRole(role: Role): Promise<void> {
  const { error } = await supabase.rpc('set_my_role', { p_role: role });
  if (error) throw error;
}

export async function markSetupComplete(): Promise<void> {
  const { error } = await supabase.rpc('mark_setup_complete');
  if (error) throw error;
}

async function firstRow<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('No result returned. Please try again.');
  return row as T;
}

export const createClass = (name: string) =>
  firstRow<{ id: string; name: string; join_code: string }>(supabase.rpc('create_class', { p_name: name }));

export const joinClass = (code: string) =>
  firstRow<{ id: string; name: string }>(supabase.rpc('join_class', { p_join_code: code }));

export const ensureMyStudentProfile = () =>
  firstRow<{ id: string; display_name: string; link_code: string }>(supabase.rpc('ensure_my_student_profile'));

export const linkStudentByCode = (code: string) =>
  firstRow<{ id: string; display_name: string }>(supabase.rpc('link_student_by_code', { p_link_code: code }));

export const createChildProfile = (name: string) =>
  firstRow<{ id: string; display_name: string }>(supabase.rpc('create_child_profile', { p_display_name: name }));
