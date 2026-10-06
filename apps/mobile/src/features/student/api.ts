// Student-side backend calls (PRD v0.7). Each is a SECURITY DEFINER function that only
// returns the caller's own work (or, for a linked parent, their child's); these shape it.
import { z } from 'zod';

import { ASSESSMENT_TYPES, QUARTERS, type AssessmentType, type Quarter } from '@/features/assessments/constants';
import { PAGE_SIZE } from '@/features/teacher/progress';
import type { Page } from '@/features/teacher/api';
import { supabase } from '@/lib/supabase';

import { WORK_STATUSES, type WorkFilter } from './work';

const num = z.coerce.number();
const nullableNum = z.union([z.null(), z.coerce.number()]);
const workStatus = z.enum(WORK_STATUSES);

async function rpcRows<T>(fn: string, args: Record<string, unknown>, row: z.ZodType<T>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return z.array(row).parse(data ?? []);
}

async function rpcVoid(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

const opt = <T>(value: T | '' | null | undefined): T | null => (value === '' || value === undefined ? null : value);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const dashboardRow = z.object({
  display_name: z.string(),
  class_id: z.uuid().nullable(),
  class_name: z.string().nullable(),
  grade_level: z.number().nullable(),
  section: z.string().nullable(),
  school_year: z.string().nullable(),
  class_count: num,
  new_scores: num,
  missing: num,
  overdue: num,
  needs_resubmission: num,
  pending: num,
});
export type StudentDashboard = z.infer<typeof dashboardRow>;

export async function studentDashboard(studentProfileId?: string): Promise<StudentDashboard> {
  const [row] = await rpcRows('student_dashboard', { p_student_profile_id: opt(studentProfileId) }, dashboardRow);
  if (!row) throw new Error('Set up your student account first.');
  return row;
}

// ---------------------------------------------------------------------------
// My Work / My Lacking / My Records
// ---------------------------------------------------------------------------

const workRow = z.object({
  assessment_id: z.uuid(),
  title: z.string(),
  assessment_type: z.enum(ASSESSMENT_TYPES),
  quarter: z.enum(QUARTERS),
  assessment_code: z.string(),
  total_score: num,
  assessment_date: z.string().nullable(),
  due_date: z.string().nullable(),
  subject_id: z.uuid(),
  subject_name: z.string(),
  class_id: z.uuid(),
  class_name: z.string(),
  evidence_id: z.uuid().nullable(),
  score: nullableNum,
  evidence_status: z.string().nullable(),
  uploaded_at: z.string().nullable(),
  verified_at: z.string().nullable(),
  work_status: workStatus,
  total_count: num,
});
export type WorkItem = z.infer<typeof workRow>;

export interface WorkQuery {
  /** A linked child when the signed-in user is a parent; server authorization decides access. */
  studentProfileId?: string;
  classId?: string;
  subjectId?: string;
  search?: string;
  quarter?: Quarter | '';
  type?: AssessmentType | '';
  status?: WorkFilter;
  page?: number;
  /** Defaults to PAGE_SIZE (20). */
  limit?: number;
}

export async function listWork(q: WorkQuery = {}): Promise<Page<WorkItem>> {
  const limit = q.limit ?? PAGE_SIZE;
  const rows = await rpcRows(
    'student_work',
    {
      p_student_profile_id: opt(q.studentProfileId),
      p_class_id: opt(q.classId),
      p_subject_id: opt(q.subjectId),
      p_search: opt(q.search),
      p_quarter: opt(q.quarter),
      p_type: opt(q.type),
      p_status: opt(q.status),
      p_limit: limit,
      p_offset: (q.page ?? 0) * limit,
    },
    workRow,
  );
  return { rows, total: rows[0]?.total_count ?? 0 };
}

// ---------------------------------------------------------------------------
// Classes and subjects
// ---------------------------------------------------------------------------

const classRow = z.object({
  class_id: z.uuid(),
  name: z.string(),
  grade_level: z.number().nullable(),
  section: z.string().nullable(),
  school_year: z.string().nullable(),
  school_name: z.string().nullable(),
  teacher_name: z.string().nullable(),
  subject_count: num,
  lacking_count: num,
  pending_count: num,
  joined_at: z.string(),
});
export type StudentClass = z.infer<typeof classRow>;

export const listMyClasses = (studentProfileId?: string) => rpcRows('student_classes', { p_student_profile_id: opt(studentProfileId) }, classRow);

export async function getMyClass(classId: string, studentProfileId?: string): Promise<StudentClass | null> {
  return (await listMyClasses(studentProfileId)).find((c) => c.class_id === classId) ?? null;
}

export const SUBJECT_STATUSES = ['LACKING', 'PENDING', 'COMPLETE', 'NO_WORK'] as const;
export type SubjectStatus = (typeof SUBJECT_STATUSES)[number];

export const SUBJECT_STATUS_LABEL: Record<SubjectStatus, string> = {
  LACKING: 'Has missing work',
  PENDING: 'Awaiting verification',
  COMPLETE: 'Complete',
  NO_WORK: 'No work yet',
};

const subjectRow = z.object({
  subject_id: z.uuid(),
  name: z.string(),
  assessment_count: num,
  record_count: num,
  verified_count: num,
  pending_count: num,
  lacking_count: num,
  status: z.enum(SUBJECT_STATUSES),
});
export type StudentSubject = z.infer<typeof subjectRow>;

export const listMySubjects = (classId: string, q: { studentProfileId?: string; search?: string; quarter?: Quarter | ''; status?: SubjectStatus | '' } = {}) =>
  rpcRows('student_subjects', { p_class_id: classId, p_student_profile_id: opt(q.studentProfileId), p_search: opt(q.search), p_quarter: opt(q.quarter), p_status: opt(q.status) }, subjectRow);

/** A subject the student can read (RLS: members of its section). */
export async function getSubject(subjectId: string): Promise<{ id: string; name: string; class_id: string } | null> {
  const { data, error } = await supabase.from('subjects').select('id, name, class_id').eq('id', subjectId).maybeSingle();
  if (error) throw error;
  return data;
}

const classmateRow = z.object({ display_name: z.string(), is_me: z.boolean() });
export type Classmate = z.infer<typeof classmateRow>;

/** Names only; empty when the teacher hides classmates. */
export const listClassmates = (classId: string) => rpcRows('class_classmates', { p_class_id: classId }, classmateRow);

export const leaveClass = (classId: string) => rpcVoid('leave_class', { p_class_id: classId });

// ---------------------------------------------------------------------------
// One record
// ---------------------------------------------------------------------------

const recordRow = z.object({
  evidence_id: z.uuid(),
  assessment_id: z.uuid(),
  title: z.string(),
  assessment_type: z.enum(ASSESSMENT_TYPES),
  quarter: z.enum(QUARTERS),
  assessment_code: z.string(),
  total_score: num,
  due_date: z.string().nullable(),
  subject_id: z.uuid().nullable(),
  subject_name: z.string().nullable(),
  class_id: z.uuid().nullable(),
  class_name: z.string().nullable(),
  student_profile_id: z.uuid(),
  score: nullableNum,
  evidence_status: z.string(),
  work_status: workStatus,
  code_source: z.enum(['OCR', 'MANUAL']),
  image_path: z.string(),
  uploaded_at: z.string(),
  verified_at: z.string().nullable(),
  teacher_name: z.string().nullable(),
  teacher_note: z.string().nullable(),
  /** A newer paper for the same assessment has replaced this one. */
  replaced: z.boolean(),
});
export type StudentRecord = z.infer<typeof recordRow>;

export async function getRecord(evidenceId: string): Promise<StudentRecord> {
  const [row] = await rpcRows('student_record', { p_evidence_id: evidenceId }, recordRow);
  if (!row) throw new Error('That record was not found.');
  return row;
}

/** A short-lived link to the paper's photo (private bucket). */
export async function recordPhotoUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('evidence').createSignedUrl(imagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

// ---------------------------------------------------------------------------
// Guardians
// ---------------------------------------------------------------------------

const guardianRow = z.object({ display_name: z.string(), linked_at: z.string() });
export type Guardian = z.infer<typeof guardianRow>;

export const listMyGuardians = () => rpcRows('my_guardians', {}, guardianRow);

/** Replaces the parent link code; the old one stops working, existing links stay. */
export async function newLinkCode(): Promise<string> {
  const { data, error } = await supabase.rpc('new_my_link_code');
  if (error) throw error;
  return z.string().parse(data);
}
