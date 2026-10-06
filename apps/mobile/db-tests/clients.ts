import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { inject } from 'vitest';

/** Demo accounts from supabase/seed.sql (local only). */
export type DemoUser = 'teacher' | 'student' | 'parent';

function client(): SupabaseClient {
  const { url, key } = inject('supabase');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** A Supabase client signed in as one of the seeded demo accounts. */
export async function signInAs(who: DemoUser): Promise<SupabaseClient> {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email: `${who}@demo.test`, password: 'demo1234' });
  if (error) throw new Error(`Could not sign in as ${who}@demo.test: ${error.message}. Run \`supabase db reset\` to reload the seed.`);
  return c;
}

export interface Account {
  client: SupabaseClient;
  userId: string;
  name: string;
  /** Students only: their own student profile (what evidence is filed under). */
  studentProfileId?: string;
}

let counter = 0;

/**
 * A brand-new account with its role set and setup finished, so tests don't depend on (or
 * change) the demo accounts. Local Supabase signs up without email confirmation.
 */
export async function newAccount(role: 'TEACHER' | 'STUDENT' | 'PARENT', name = `Test ${role.toLowerCase()} ${++counter}`): Promise<Account> {
  const c = client();
  const email = `${role.toLowerCase()}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@test.local`;
  const { data, error } = await c.auth.signUp({ email, password: 'test1234', options: { data: { full_name: name } } });
  if (error || !data.user) throw new Error(`Could not create a ${role} account: ${error?.message}`);
  await ok(c.rpc('set_my_role', { p_role: role }));
  await ok(c.rpc('mark_setup_complete'));
  const account: Account = { client: c, userId: data.user.id, name };
  if (role === 'STUDENT') {
    const profile = await must(c.rpc('ensure_my_student_profile').single<{ id: string }>());
    account.studentProfileId = profile.id;
  }
  return account;
}

/** For calls that return nothing: fails the test with the server's message. */
export async function ok(request: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await request;
  if (error) throw new Error(error.message);
}

/** Returns the data, or fails the test with the server's message (or when nothing came back). */
export async function must<T>(request: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) throw new Error('The server returned no data.');
  return data;
}

/** Like must(), for calls that return a list of rows (RPCs returning a table). */
export async function rows<T>(request: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  return (await must(request)) as T[];
}

/** A teacher with a fresh section and one subject in it. */
export async function teacherWithSubject(subjectName = 'Mathematics') {
  const teacher = await newAccount('TEACHER', 'Ms. Santos');
  const section = await must(
    teacher.client
      .rpc('create_class_workspace', { p_grade_level: 7, p_section: `Mango ${++counter}`, p_school_year: '2026-2027' })
      .single<{ id: string; join_code: string; name: string }>(),
  );
  const subject = await must(teacher.client.rpc('create_subject', { p_class_id: section.id, p_name: subjectName }).single<{ id: string; name: string }>());
  return { teacher, section, subject };
}

/** A smallest-possible JPEG, enough for the storage type check. */
export const TINY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9]);

/** Uploads a photo and saves evidence the way the app does; returns the evidence id. */
export async function submitEvidence(
  uploader: Account,
  assessment: { id: string; assessment_code: string },
  studentProfileId: string,
  score: number,
): Promise<string> {
  const evidenceId = crypto.randomUUID();
  const path = `${uploader.userId}/assessment/${assessment.id}/${evidenceId}.jpg`;
  const upload = await uploader.client.storage.from('evidence').upload(path, TINY_JPEG, { contentType: 'image/jpeg' });
  if (upload.error) throw new Error(upload.error.message);
  await must(
    uploader.client.rpc('create_evidence', {
      p_evidence_id: evidenceId,
      p_assessment_id: assessment.id,
      p_student_profile_id: studentProfileId,
      p_confirmed_code: assessment.assessment_code,
      p_code_source: 'MANUAL',
      p_score: score,
      p_ocr_text: null,
      p_ocr_confidence: null,
      p_ocr_engine: null,
    }),
  );
  return evidenceId;
}
