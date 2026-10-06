import { decode } from 'base64-arraybuffer';
import { z } from 'zod';

import { ensureSignedIn, supabase } from '@/lib/supabase';
import { randomUUID } from '@/lib/uuid';

import { EVIDENCE_BUCKET } from './constants';
import {
  evidenceRecordSchema,
  saveEvidenceInputSchema,
  savedEvidenceSchema,
  type EvidenceRecord,
  type SavedEvidence,
  type SaveEvidenceInput,
} from './schema';

export class EvidenceUploadError extends Error {
  constructor(readonly cause?: unknown) {
    super('The photo could not be uploaded. Check your connection and try again.');
    this.name = 'EvidenceUploadError';
  }
}

export class EvidenceSaveError extends Error {
  constructor(message = 'The paper was uploaded but could not be saved. Please try again.', readonly cause?: unknown) {
    super(message);
    this.name = 'EvidenceSaveError';
  }
}

/** Must match the path built by public.create_evidence. */
function evidencePath(userId: string, assessmentId: string, evidenceId: string): string {
  return `${userId}/assessment/${assessmentId}/${evidenceId}.jpg`;
}

/**
 * Uploads the image to the private bucket, then asks the server to record the evidence.
 * The server re-checks the code against the assessment and sets the status
 * (CODE_MATCHED or UPLOADED). It never marks anything teacher-verified.
 */
export async function saveEvidence(rawInput: SaveEvidenceInput): Promise<SavedEvidence> {
  const input = saveEvidenceInputSchema.parse(rawInput);
  const userId = await ensureSignedIn();
  const evidenceId = randomUUID();
  const path = evidencePath(userId, input.assessmentId, evidenceId);

  const { error: uploadError } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .upload(path, decode(input.imageBase64), { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw new EvidenceUploadError(uploadError);

  const { data, error } = await supabase.rpc('create_evidence', {
    p_evidence_id: evidenceId,
    p_assessment_id: input.assessmentId,
    p_student_profile_id: input.studentProfileId,
    p_confirmed_code: input.confirmedCode,
    p_code_source: input.codeSource,
    p_score: input.score,
    p_ocr_text: input.ocrText,
    p_ocr_confidence: input.ocrConfidence,
    p_ocr_engine: input.ocrEngine,
  });
  if (error) {
    const message = error.message.includes('does not match')
      ? 'That code no longer matches an active assessment. Please check the code.'
      : error.message.startsWith('Score must be')
        ? error.message + '.'
        : error.message.includes('cannot submit')
          ? 'You can only save papers for yourself or a child linked to your account.'
          : undefined;
    throw new EvidenceSaveError(message, error);
  }

  const rows = z.array(savedEvidenceSchema).safeParse(data);
  const saved = rows.success ? rows.data[0] : undefined;
  if (!saved) throw new EvidenceSaveError('The server returned an unexpected response.');
  return saved;
}

export class EvidenceLoadError extends Error {
  constructor(readonly cause?: unknown) {
    super('Could not load records. Check your connection and try again.');
    this.name = 'EvidenceLoadError';
  }
}

const RECORD_FIELDS =
  'id, status, score, code_source, uploaded_at, student_profile_id, ' +
  'assessment:assessments(id, assessment_code, subject, title, assessment_type, quarter, total_score)';

function parseRecords(data: unknown): EvidenceRecord[] {
  const rows = z.array(evidenceRecordSchema).safeParse(data);
  if (!rows.success) throw new EvidenceLoadError(rows.error);
  return rows.data;
}

/** Evidence for one student. RLS allows the student and linked guardians only. */
export async function listStudentRecords(studentProfileId: string, limit = 50): Promise<EvidenceRecord[]> {
  await ensureSignedIn();
  const { data, error } = await supabase
    .from('evidence')
    .select(RECORD_FIELDS)
    .eq('student_profile_id', studentProfileId)
    .order('uploaded_at', { ascending: false })
    .limit(limit);
  if (error) throw new EvidenceLoadError(error);
  return parseRecords(data);
}

/** Evidence submitted for the signed-in teacher's assessments, with student names. */
export async function listSubmissionsForMyAssessments(limit = 50): Promise<EvidenceRecord[]> {
  const userId = await ensureSignedIn();
  const { data, error } = await supabase
    .from('evidence')
    .select(
      'id, status, score, code_source, uploaded_at, student_profile_id, ' +
        'assessment:assessments!inner(id, assessment_code, subject, title, assessment_type, quarter, total_score), ' +
        'student:student_profiles(display_name)',
    )
    .eq('assessment.teacher_user_id', userId)
    .order('uploaded_at', { ascending: false })
    .limit(limit);
  if (error) throw new EvidenceLoadError(error);
  return parseRecords(data);
}
