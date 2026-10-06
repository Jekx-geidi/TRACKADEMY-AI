import { z } from 'zod';

import { createChildProfile, linkStudentByCode } from '@/features/auth/api';

import { check, ensureSignedIn, supabase } from './client';
import type { StudentProfile } from './students';

const childRowSchema = z.object({
  student: z.object({ id: z.uuid(), display_name: z.string(), link_code: z.string().nullable() }).nullable(),
});

/** Children linked to the signed-in parent / guardian. */
export async function listMyChildren(): Promise<StudentProfile[]> {
  const userId = await ensureSignedIn();
  const data = check(
    await supabase
      .from('guardian_links')
      .select('student:student_profiles(id, display_name, link_code)')
      .eq('guardian_user_id', userId)
      .order('created_at', { ascending: true }),
    'Could not load your children.',
  );
  return z
    .array(childRowSchema)
    .parse(data)
    .flatMap((row) =>
      row.student ? [{ id: row.student.id, displayName: row.student.display_name, linkCode: row.student.link_code }] : [],
    );
}

export { createChildProfile, linkStudentByCode };
