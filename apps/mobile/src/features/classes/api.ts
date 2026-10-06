import { z } from 'zod';

import { supabase } from '@/lib/supabase';

import type { ClassWorkspace } from './schema';

const workspaceRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  join_code: z.string(),
  grade_level: z.number(),
  section: z.string(),
  school_year: z.string(),
  school_name: z.string().nullable(),
  adviser_name: z.string().nullable(),
});

export interface CreatedWorkspace {
  id: string;
  name: string;
  joinCode: string;
  gradeLevel: number;
  section: string;
  schoolYear: string;
  schoolName: string | null;
  adviserName: string | null;
}

/** Teachers only (checked by the server); the server builds the name and the 6-digit code. */
export async function createClassWorkspace(input: ClassWorkspace): Promise<CreatedWorkspace> {
  const { data, error } = await supabase
    .rpc('create_class_workspace', {
      p_grade_level: input.gradeLevel,
      p_section: input.section,
      p_school_year: input.schoolYear,
      p_school_name: input.schoolName ?? null,
      p_adviser_name: input.adviserName ?? null,
    })
    .single();
  if (error) throw error;
  const row = workspaceRowSchema.parse(data);
  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    gradeLevel: row.grade_level,
    section: row.section,
    schoolYear: row.school_year,
    schoolName: row.school_name,
    adviserName: row.adviser_name,
  };
}
