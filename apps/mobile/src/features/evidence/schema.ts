import { z } from 'zod';

import { assessmentCodeSchema, assessmentMatchSchema } from '@/features/assessments/schema';

import { EVIDENCE_STATUSES } from './constants';

export const codeSourceSchema = z.enum(['OCR', 'MANUAL']);
export type CodeSource = z.infer<typeof codeSourceSchema>;

export const saveEvidenceInputSchema = z.object({
  assessmentId: z.uuid(),
  studentProfileId: z.uuid(),
  confirmedCode: assessmentCodeSchema,
  codeSource: codeSourceSchema,
  /** Score written on the paper. The server checks it against the assessment's total. */
  score: z.number().min(0),
  ocrText: z.string().max(20000).nullable(),
  ocrConfidence: z.number().min(0).max(1).nullable(),
  ocrEngine: z.string().max(40).nullable(),
  /** Base64 JPEG produced by preparePaperImage. */
  imageBase64: z.string().min(1),
});
export type SaveEvidenceInput = z.infer<typeof saveEvidenceInputSchema>;

/** Parses the score field on the confirm screen: 0..total, at most 2 decimals. */
export function scoreSchema(totalScore: number) {
  return z
    .string()
    .trim()
    .min(1, 'Enter the score on the paper')
    .regex(/^\d+(\.\d{1,2})?$/, 'Use a number like 18 or 18.5')
    .transform(Number)
    .pipe(z.number().max(totalScore, `The score can't be more than ${totalScore}`));
}

const numeric = z.union([z.number(), z.string()]).transform(Number);

export const savedEvidenceSchema = z
  .object({
    id: z.uuid(),
    assessment_id: z.uuid(),
    detected_code: assessmentCodeSchema,
    status: z.enum(EVIDENCE_STATUSES),
    score: numeric.nullable(),
    uploaded_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    assessmentId: row.assessment_id,
    detectedCode: row.detected_code,
    status: row.status,
    score: row.score,
    uploadedAt: row.uploaded_at,
  }));
export type SavedEvidence = z.output<typeof savedEvidenceSchema>;

/** One evidence row with its assessment, as shown in records and dashboards. */
export const evidenceRecordSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(EVIDENCE_STATUSES),
    score: numeric.nullable(),
    code_source: codeSourceSchema,
    uploaded_at: z.string(),
    student_profile_id: z.uuid(),
    assessment: assessmentMatchSchema.nullable(),
    student: z.object({ display_name: z.string() }).nullable().optional(),
  })
  .transform((row) => ({
    id: row.id,
    status: row.status,
    score: row.score,
    codeSource: row.code_source,
    uploadedAt: row.uploaded_at,
    studentProfileId: row.student_profile_id,
    studentName: row.student?.display_name ?? null,
    assessment: row.assessment,
  }));
export type EvidenceRecord = z.output<typeof evidenceRecordSchema>;
