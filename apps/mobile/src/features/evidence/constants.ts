/**
 * Phase 0 placeholder student (seeded). No longer accepted by create_evidence since the
 * role dashboards migration; evidence now goes to the student's own profile or a linked child.
 */
export const TEST_STUDENT = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Test Student',
} as const;

export const EVIDENCE_BUCKET = 'evidence';

export const EVIDENCE_STATUSES = [
  'DRAFT',
  'UPLOADED',
  'CODE_MATCHED',
  'NEEDS_REVIEW',
  'TEACHER_VERIFIED',
  'REJECTED',
  'MISSING',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** Uploaded but not yet checked by a teacher. */
export const PENDING_STATUSES: readonly EvidenceStatus[] = ['UPLOADED', 'CODE_MATCHED', 'NEEDS_REVIEW'];

/** Plain-language labels. Uploads are never presented as teacher-verified. */
export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  DRAFT: 'Draft',
  UPLOADED: 'Uploaded — waiting for teacher check',
  CODE_MATCHED: 'Code matched — waiting for teacher check',
  NEEDS_REVIEW: 'Needs review',
  TEACHER_VERIFIED: 'Verified by teacher',
  REJECTED: 'Not accepted',
  MISSING: 'No evidence yet',
};

/** Short labels for pills in lists. */
export const EVIDENCE_STATUS_SHORT: Record<EvidenceStatus, string> = {
  DRAFT: 'Draft',
  UPLOADED: 'Waiting for teacher',
  CODE_MATCHED: 'Waiting for teacher',
  NEEDS_REVIEW: 'Needs review',
  TEACHER_VERIFIED: 'Verified',
  REJECTED: 'Not accepted',
  MISSING: 'Missing',
};
