import { z } from 'zod';

import { ensureMyStudentProfile, joinClass } from '@/features/auth/api';

import { check, ensureSignedIn, supabase } from './client';

export interface StudentProfile {
  id: string;
  displayName: string;
  linkCode: string | null;
}

export interface ClassSummary {
  id: string;
  name: string;
  joinCode: string;
  memberRole: 'TEACHER' | 'STUDENT';
}

/** The signed-in student's own profile (created on first call). */
export async function getMyStudentProfile(): Promise<StudentProfile> {
  const row = await ensureMyStudentProfile();
  return { id: row.id, displayName: row.display_name, linkCode: row.link_code };
}

const classRowSchema = z.object({
  member_role: z.enum(['TEACHER', 'STUDENT']),
  class: z.object({ id: z.uuid(), name: z.string(), join_code: z.string() }).nullable(),
});

/** Classes the signed-in user belongs to (as a student or teacher). */
export async function listMyClasses(): Promise<ClassSummary[]> {
  const userId = await ensureSignedIn();
  const data = check(
    await supabase
      .from('class_members')
      .select('member_role, class:classes(id, name, join_code)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true }),
    'Could not load your classes.',
  );
  return z
    .array(classRowSchema)
    .parse(data)
    .flatMap((row) =>
      row.class ? [{ id: row.class.id, name: row.class.name, joinCode: row.class.join_code, memberRole: row.member_role }] : [],
    );
}

export { joinClass };
