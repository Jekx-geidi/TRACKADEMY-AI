import { redirectUrl } from '@/features/auth/oauth';
import { ensureSignedIn, supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

import type { PasswordChangeInput } from './schema';

/** Private bucket; see supabase/migrations/20261005000300_profile_editing.sql. */
const PROFILE_BUCKET = 'profile';
/** Signed URLs for the photo last this long; the profile screen asks again on each visit. */
const PHOTO_URL_SECONDS = 60 * 60;

export async function updateMyName(fullName: string): Promise<string> {
  const { data, error } = await supabase.rpc('update_my_profile', { p_full_name: fullName });
  if (error) throw error;
  return String(data);
}

/** Signed URL of the user's own photo, or null when they have none. Never a public URL. */
export async function getMyPhotoUrl(): Promise<string | null> {
  const userId = await ensureSignedIn();
  const { data, error } = await supabase.from('profiles').select('avatar_path').eq('id', userId).maybeSingle();
  if (error) throw error;
  const path = (data as { avatar_path: string | null } | null)?.avatar_path;
  if (!path) return null;
  const signed = await supabase.storage.from(PROFILE_BUCKET).createSignedUrl(path, PHOTO_URL_SECONDS);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

async function removeOldPhoto(path: unknown): Promise<void> {
  // Best effort: the profile no longer points at it, and only the owner can read it anyway.
  if (typeof path === 'string' && path) await supabase.storage.from(PROFILE_BUCKET).remove([path]);
}

/** Uploads a prepared JPEG, points the profile at it and deletes the previous photo. */
export async function setMyPhoto(jpeg: Blob): Promise<void> {
  const userId = await ensureSignedIn();
  const path = `${userId}/avatar/${randomUUID()}.jpg`;
  const upload = await supabase.storage.from(PROFILE_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw new Error('The photo could not be uploaded. Check your connection and try again.');
  const { data, error } = await supabase.rpc('set_my_avatar', { p_path: path });
  if (error) {
    await removeOldPhoto(path);
    throw error;
  }
  await removeOldPhoto(data);
}

export async function removeMyPhoto(): Promise<void> {
  const { data, error } = await supabase.rpc('set_my_avatar', { p_path: null });
  if (error) throw error;
  await removeOldPhoto(data);
}

/**
 * Supabase emails a confirmation link to the new address (and, with "secure email change"
 * on, to the old one too). The email only changes after the link is opened.
 */
export async function changeMyEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectUrl() });
  if (error) throw error;
}

/** Checks the current password first, so an unattended signed-in device can't change it. */
export async function changeMyPassword(input: PasswordChangeInput): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) throw new Error('This account has no password. It signs in with Google.');
  const check = await supabase.auth.signInWithPassword({ email, password: input.currentPassword });
  if (check.error) throw new Error('Your current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) throw error;
}
