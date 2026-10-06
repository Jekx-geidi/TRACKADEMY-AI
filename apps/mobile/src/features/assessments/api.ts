import { z } from 'zod';

import { ensureSignedIn, supabase } from '@/lib/supabase';

import { assessmentCodeSchema, assessmentMatchSchema, type AssessmentMatch, type CreateAssessmentInput } from './schema';

/** Server allows at most this many codes per lookup (see find_assessments_by_codes). */
export const MAX_CODES_PER_LOOKUP = 10;

export class AssessmentServiceError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AssessmentServiceError';
  }
}

/** Creates an assessment; the 5-digit code is generated server-side. */
export async function createAssessment(input: CreateAssessmentInput): Promise<AssessmentMatch> {
  await ensureSignedIn();
  const { data, error } = await supabase.rpc('create_assessment', {
    p_subject: input.subject,
    p_title: input.title,
    p_assessment_type: input.assessmentType,
    p_quarter: input.quarter,
    p_total_score: input.totalScore,
  });
  if (error) throw new AssessmentServiceError('Could not create the assessment.', error);

  const rows = z.array(assessmentMatchSchema).safeParse(data);
  const created = rows.success ? rows.data[0] : undefined;
  if (!created) throw new AssessmentServiceError('The server returned an unexpected response.');
  return created;
}

/**
 * Validates codes against active assessments in the database.
 * OCR output is untrusted: only codes returned here may be used for routing.
 */
export async function findAssessmentsByCodes(codes: readonly string[]): Promise<AssessmentMatch[]> {
  const valid = [...new Set(codes)].filter((c) => assessmentCodeSchema.safeParse(c).success).slice(0, MAX_CODES_PER_LOOKUP);
  if (valid.length === 0) return [];

  await ensureSignedIn();
  const { data, error } = await supabase.rpc('find_assessments_by_codes', { p_codes: valid });
  if (error) throw new AssessmentServiceError('Could not check the code. Please check your connection.', error);

  const rows = z.array(assessmentMatchSchema).safeParse(data);
  if (!rows.success) throw new AssessmentServiceError('The server returned an unexpected response.', rows.error);

  // Keep the caller's candidate order (most likely first).
  return rows.data.sort((a, b) => valid.indexOf(a.code) - valid.indexOf(b.code));
}

/** Assessments created by the signed-in teacher (RLS limits rows to their own). */
export async function listMyAssessments(): Promise<AssessmentMatch[]> {
  const userId = await ensureSignedIn();
  const { data, error } = await supabase
    .from('assessments')
    .select('id, assessment_code, subject, title, assessment_type, quarter, total_score')
    .eq('teacher_user_id', userId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw new AssessmentServiceError('Could not load your assessments.', error);

  const rows = z.array(assessmentMatchSchema).safeParse(data);
  if (!rows.success) throw new AssessmentServiceError('The server returned an unexpected response.', rows.error);
  return rows.data;
}
