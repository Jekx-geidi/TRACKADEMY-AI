import { z } from 'zod';

import { ASSESSMENT_TYPES, MAX_TOTAL_SCORE, QUARTERS } from './constants';

/** A 5-digit routing code. A lookup value only — never an ID or proof of authenticity. */
export const assessmentCodeSchema = z.string().regex(/^\d{5}$/, 'Enter exactly 5 digits');

export const createAssessmentInputSchema = z.object({
  subject: z.string().trim().min(1, 'Enter a subject').max(80, 'Subject is too long'),
  title: z.string().trim().min(1, 'Enter a title').max(120, 'Title is too long'),
  assessmentType: z.enum(ASSESSMENT_TYPES),
  quarter: z.enum(QUARTERS),
  totalScore: z.coerce
    .number({ error: 'Enter a number' })
    .int('Use a whole number')
    .positive('Total score must be more than 0')
    .max(MAX_TOTAL_SCORE, `Total score must be ${MAX_TOTAL_SCORE} or less`),
});
export type CreateAssessmentInput = z.infer<typeof createAssessmentInputSchema>;

/** Routing fields returned by the server for a matched code. */
export const assessmentMatchSchema = z
  .object({
    id: z.uuid(),
    assessment_code: assessmentCodeSchema,
    subject: z.string(),
    title: z.string(),
    assessment_type: z.enum(ASSESSMENT_TYPES),
    quarter: z.enum(QUARTERS),
    total_score: z.number().int().positive(),
  })
  .transform((row) => ({
    id: row.id,
    code: row.assessment_code,
    subject: row.subject,
    title: row.title,
    assessmentType: row.assessment_type,
    quarter: row.quarter,
    totalScore: row.total_score,
  }));
export type AssessmentMatch = z.output<typeof assessmentMatchSchema>;
