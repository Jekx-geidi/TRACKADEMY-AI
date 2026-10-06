import { z } from 'zod';

/** Same rule as public.create_class_workspace: "Grade 7 - St. Mark". */
export const workspaceName = (gradeLevel: number, section: string) => `Grade ${gradeLevel} - ${section.trim()}`;

export const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const optionalName = z
  .string()
  .trim()
  .max(120, { error: 'Keep it to 120 characters.' })
  .transform((v) => v || undefined);

const isConsecutiveYears = (value: string) => {
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  return match !== null && Number(match[2]) === Number(match[1]) + 1;
};

/** The teacher's Create Class Workspace form; the server checks the same rules. */
export const classWorkspaceSchema = z.object({
  gradeLevel: z.number().int({ error: 'Choose a grade level.' }).min(1, { error: 'Choose a grade level.' }).max(10, { error: 'Choose a grade level.' }),
  section: z.string().trim().min(1, { error: 'Enter a section.' }).max(60, { error: 'Keep the section to 60 characters.' }),
  schoolYear: z.string().trim().refine(isConsecutiveYears, { error: 'Use two consecutive years, like 2026-2027.' }),
  schoolName: optionalName,
  adviserName: optionalName,
});
export type ClassWorkspaceInput = z.input<typeof classWorkspaceSchema>;
export type ClassWorkspace = z.output<typeof classWorkspaceSchema>;

/** The school year that starts in June of `now`'s year (Philippine school calendar), e.g. 2026-2027. */
export function currentSchoolYear(now = new Date()): string {
  const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

/**
 * A class join code as typed: 6 digits (spaces and dashes ignored), or one of the older
 * 6-letter codes, upper-cased. Student link codes are a different thing (joinCodeSchema).
 */
export const classCodeSchema = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
  .pipe(z.string().regex(/^([0-9]{6}|[A-Z2-9]{6})$/, { error: 'Class codes are 6 digits.' }));
