// Teacher-side backend calls (PRD v0.5). Each one is a SECURITY DEFINER function or an
// RLS-protected table read; the server decides what the caller may see, these only shape it.
import { z } from 'zod';

import { ASSESSMENT_TYPES, QUARTERS } from '@/features/assessments/constants';
import { ensureSignedIn, supabase } from '@/lib/supabase';

import { PAGE_SIZE, type CompletionStatus } from './progress';

export interface Page<T> {
  rows: T[];
  total: number;
}

/** Zero-based page → limit/offset parameters. */
const paging = (page = 0) => ({ p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE });

const num = z.coerce.number();
const nullableNum = z.union([z.null(), z.coerce.number()]);
const completionStatus = z.enum(['NOT_STARTED', 'NEEDS_ATTENTION', 'ALMOST_COMPLETE', 'COMPLETE']);
const assessmentType = z.enum(ASSESSMENT_TYPES);
const quarter = z.enum(QUARTERS);

async function rpcRows<T>(fn: string, args: Record<string, unknown>, row: z.ZodType<T>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return z.array(row).parse(data ?? []);
}

async function rpcPage<T extends { total_count: number }>(fn: string, args: Record<string, unknown>, row: z.ZodType<T>): Promise<Page<T>> {
  const rows = await rpcRows(fn, args, row);
  return { rows, total: rows[0]?.total_count ?? 0 };
}

async function rpcVoid(fn: string, args: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.rpc(fn, args);
  if (error) throw error;
}

/** Drops empty filters so the server sees `null` (no filter). */
const opt = <T>(value: T | '' | null | undefined): T | null => (value === '' || value === undefined ? null : value);

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

const sectionRow = z.object({
  id: z.uuid(),
  name: z.string(),
  grade_level: z.number().nullable(),
  section: z.string().nullable(),
  school_year: z.string().nullable(),
  school_name: z.string().nullable(),
  join_code: z.string(),
  student_count: num,
  subject_count: num,
  created_at: z.string(),
  total_count: num,
});
export type SectionRow = z.infer<typeof sectionRow>;
export type SectionSort = 'newest' | 'name' | 'students';

export const listSections = (q: { search?: string; gradeLevel?: number | null; schoolYear?: string; sort?: SectionSort; page?: number } = {}) =>
  rpcPage('teacher_sections', { p_search: opt(q.search), p_grade_level: opt(q.gradeLevel), p_school_year: opt(q.schoolYear), p_sort: q.sort ?? 'newest', ...paging(q.page) }, sectionRow);

const overviewRow = z.object({
  id: z.uuid(),
  name: z.string(),
  grade_level: z.number().nullable(),
  section: z.string().nullable(),
  school_year: z.string().nullable(),
  school_name: z.string().nullable(),
  adviser_name: z.string().nullable(),
  description: z.string().nullable(),
  join_code: z.string(),
  student_count: num,
  subject_count: num,
  active_assessments: num,
  expected: num,
  submitted: num,
  verified: num,
  pending: num,
  missing: num,
  overdue: num,
  percent: num,
  status: completionStatus,
});
export type SectionOverview = z.infer<typeof overviewRow>;

export async function sectionOverview(classId: string): Promise<SectionOverview> {
  const [row] = await rpcRows('section_overview', { p_class_id: classId }, overviewRow);
  if (!row) throw new Error('Section not found.');
  return row;
}

/** Link students open to join a section (PRD v0.3 §9.2): the app's /join/:code route. */
export const inviteLink = (joinCode: string) => `${window.location.origin}/join/${joinCode}`;

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

const subjectAnalyticsRow = z.object({
  subject_id: z.uuid(),
  subject_name: z.string(),
  assessments: num,
  expected: num,
  submitted: num,
  verified: num,
  pending: num,
  missing: num,
  overdue: num,
  percent: num,
  verified_percent: num,
  status: completionStatus,
});
export type SubjectAnalytics = z.infer<typeof subjectAnalyticsRow>;

/** Every subject in the section, with its completion. */
export const sectionSubjects = (classId: string) => rpcRows('section_subject_analytics', { p_class_id: classId }, subjectAnalyticsRow);

const subjectRow = z.object({
  id: z.uuid(),
  class_id: z.uuid(),
  name: z.string(),
  subject_code: z.string().nullable(),
  description: z.string().nullable(),
});
export type Subject = z.infer<typeof subjectRow>;

export async function getSubject(subjectId: string): Promise<Subject> {
  const { data, error } = await supabase.from('subjects').select('id, class_id, name, subject_code, description').eq('id', subjectId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Subject not found.');
  return subjectRow.parse(data);
}

export async function createSubject(classId: string, input: { name: string; code?: string; description?: string }): Promise<Subject> {
  const [row] = await rpcRows(
    'create_subject',
    { p_class_id: classId, p_name: input.name, p_code: opt(input.code), p_description: opt(input.description) },
    subjectRow,
  );
  if (!row) throw new Error('The subject was not created.');
  return row;
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

const progressRow = z.object({
  assessment_id: z.uuid(),
  class_id: z.uuid(),
  subject_id: z.uuid(),
  subject_name: z.string(),
  title: z.string(),
  assessment_type: assessmentType,
  quarter,
  assessment_code: z.string(),
  total_score: num,
  assessment_date: z.string().nullable(),
  due_date: z.string().nullable(),
  created_at: z.string(),
  required: num,
  submitted: num,
  verified: num,
  pending: num,
  missing: num,
  overdue: num,
  percent: num,
  status: completionStatus,
  total_count: num,
});
export type AssessmentProgress = z.infer<typeof progressRow>;
export type AssessmentSort = 'newest' | 'title' | 'due' | 'completion';

export const listAssessmentProgress = (q: {
  classId?: string;
  subjectId?: string;
  search?: string;
  quarter?: string;
  type?: string;
  status?: CompletionStatus | '';
  sort?: AssessmentSort;
  page?: number;
}) =>
  rpcPage(
    'list_assessment_progress',
    {
      p_class_id: opt(q.classId),
      p_subject_id: opt(q.subjectId),
      p_search: opt(q.search),
      p_quarter: opt(q.quarter),
      p_type: opt(q.type),
      p_status: opt(q.status),
      p_sort: q.sort ?? 'newest',
      ...paging(q.page),
    },
    progressRow,
  );

/** One assessment's progress row. `classId` is kept for callers; the server finds the section. */
export async function assessmentProgress(assessmentId: string, _classId?: string): Promise<AssessmentProgress> {
  const [row] = await rpcRows('assessment_progress', { p_assessment_id: assessmentId }, progressRow);
  if (!row) throw new Error('Assessment not found.');
  return row;
}

const assessmentRow = z.object({
  id: z.uuid(),
  assessment_code: z.string(),
  subject_id: z.uuid().nullable(),
  subject: z.string(),
  title: z.string(),
  assessment_type: assessmentType,
  quarter,
  total_score: num,
  assessment_date: z.string().nullable(),
  due_date: z.string().nullable(),
  instructions: z.string().nullable(),
  created_at: z.string(),
});
export type AssessmentDetail = z.infer<typeof assessmentRow> & { classId: string | null; className: string | null };

export async function getAssessment(assessmentId: string): Promise<AssessmentDetail> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, assessment_code, subject_id, subject, title, assessment_type, quarter, total_score, assessment_date, due_date, instructions, created_at, subjects(class_id, classes(name))')
    .eq('id', assessmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Assessment not found.');
  const parsed = assessmentRow.parse(data);
  const link = (data as unknown as { subjects?: { class_id: string; classes: { name: string } | null } | null }).subjects;
  return { ...parsed, classId: link?.class_id ?? null, className: link?.classes?.name ?? null };
}

export interface NewAssessment {
  assessmentType: (typeof ASSESSMENT_TYPES)[number];
  title: string;
  quarter: (typeof QUARTERS)[number];
  totalScore: number;
  assessmentDate?: string;
  dueDate?: string;
  instructions?: string;
}

/** Creates the assessment; the server generates its 5-digit filing code. */
export async function createAssessment(subjectId: string, input: NewAssessment): Promise<{ id: string; code: string }> {
  const [row] = await rpcRows(
    'create_subject_assessment',
    {
      p_subject_id: subjectId,
      p_assessment_type: input.assessmentType,
      p_title: input.title,
      p_quarter: input.quarter,
      p_total_score: input.totalScore,
      p_assessment_date: opt(input.assessmentDate),
      p_due_date: opt(input.dueDate),
      p_instructions: opt(input.instructions),
    },
    z.object({ id: z.uuid(), assessment_code: z.string() }).loose(),
  );
  if (!row) throw new Error('The assessment was not created.');
  return { id: row.id, code: row.assessment_code };
}

// ---------------------------------------------------------------------------
// Submissions on one assessment
// ---------------------------------------------------------------------------

const submissionRow = z.object({
  student_profile_id: z.uuid(),
  display_name: z.string(),
  exempt: z.boolean(),
  evidence_id: z.uuid().nullable(),
  evidence_status: z.string().nullable(),
  score: nullableNum,
  uploaded_at: z.string().nullable(),
  image_path: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  row_status: z.enum(['VERIFIED', 'PENDING', 'REJECTED', 'MISSING', 'EXEMPT']),
  total_count: num,
});
export type SubmissionRow = z.infer<typeof submissionRow>;
export type SubmissionStatus = SubmissionRow['row_status'];
export type SubmissionSort = 'name' | 'status' | 'score' | 'newest';

export const assessmentStudents = (q: { assessmentId: string; search?: string; status?: SubmissionStatus | ''; sort?: SubmissionSort; page?: number }) =>
  rpcPage(
    'assessment_students',
    { p_assessment_id: q.assessmentId, p_search: opt(q.search), p_status: opt(q.status), p_sort: q.sort ?? 'name', ...paging(q.page) },
    submissionRow,
  );

/** Short-lived link to a paper's photo; the storage policy only allows its section's teachers. */
export async function evidencePhotoUrl(imagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('evidence').createSignedUrl(imagePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

export const verifyEvidence = (evidenceId: string) => rpcVoid('verify_evidence', { p_evidence_id: evidenceId });
export const bulkVerifyEvidence = (evidenceIds: string[]) => supabase.rpc('bulk_verify_evidence', { p_evidence_ids: evidenceIds }).then(({ data, error }) => { if (error) throw error; return z.number().parse(data); });
export interface CorrectionRequest { id: string; evidence_id: string; student_name: string; message: string; status: 'OPEN' | 'RESOLVED' | 'DISMISSED'; created_at: string; }
export const assessmentCorrectionRequests = (assessmentId: string) => rpcRows('assessment_correction_requests', { p_assessment_id: assessmentId }, z.object({ id: z.uuid(), evidence_id: z.uuid(), student_name: z.string(), message: z.string(), status: z.enum(['OPEN','RESOLVED','DISMISSED']), created_at: z.string() }));
export const resolveCorrectionRequest = (requestId: string, status: 'RESOLVED' | 'DISMISSED' = 'RESOLVED') => rpcVoid('resolve_correction_request', { p_request_id: requestId, p_status: status });
export const rejectEvidence = (evidenceId: string, reason: string) => rpcVoid('reject_evidence', { p_evidence_id: evidenceId, p_reason: reason });
export const correctScore = (evidenceId: string, score: number) => rpcVoid('correct_evidence_score', { p_evidence_id: evidenceId, p_score: score });
export const setExemption = (assessmentId: string, studentProfileId: string, exempt: boolean, reason?: string) =>
  rpcVoid('set_exemption', { p_assessment_id: assessmentId, p_student_profile_id: studentProfileId, p_exempt: exempt, p_reason: reason ?? null });

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

export interface ReminderInput {
  classId: string;
  message: string;
  /** Omit for the whole section. */
  studentProfileIds?: string[];
  subjectId?: string;
  assessmentId?: string;
  dueDate?: string;
}

export async function sendReminder(input: ReminderInput): Promise<number> {
  const [row] = await rpcRows(
    'send_reminder',
    {
      p_class_id: input.classId,
      p_message: input.message,
      p_student_profile_ids: input.studentProfileIds?.length ? input.studentProfileIds : null,
      p_subject_id: opt(input.subjectId),
      p_assessment_id: opt(input.assessmentId),
      p_due_date: opt(input.dueDate),
    },
    z.object({ id: z.uuid(), recipients: num }),
  );
  return row?.recipients ?? 0;
}

export const REPORT_CATEGORIES = ['GOOD_PROGRESS', 'NEEDS_IMPROVEMENT', 'MISSING_REQUIREMENTS', 'PARTICIPATION', 'GENERAL_NOTE'] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  GOOD_PROGRESS: 'Good Progress',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  MISSING_REQUIREMENTS: 'Missing Requirements',
  PARTICIPATION: 'Participation',
  GENERAL_NOTE: 'General Note',
};

export const sendReport = (input: { classId: string; studentProfileId: string; category: ReportCategory; message: string; subjectId?: string; visibleToStudent?: boolean }) =>
  rpcVoid('send_report', {
    p_class_id: input.classId,
    p_student_profile_id: input.studentProfileId,
    p_category: input.category,
    p_message: input.message,
    p_subject_id: opt(input.subjectId),
    p_visible_to_student: input.visibleToStudent ?? false,
  });

const reportRow = z.object({
  id: z.uuid(),
  category: z.enum(REPORT_CATEGORIES),
  message: z.string(),
  visible_to_student: z.boolean(),
  created_at: z.string(),
  class_id: z.uuid(),
});
export type TeacherReport = z.infer<typeof reportRow>;

/** Reports about one student the caller may read (RLS). */
export async function studentReports(studentProfileId: string): Promise<TeacherReport[]> {
  const { data, error } = await supabase
    .from('teacher_reports')
    .select('id, category, message, visible_to_student, created_at, class_id')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return z.array(reportRow).parse(data ?? []);
}

const reminderRow = z.object({ id: z.uuid(), message: z.string(), due_date: z.string().nullable(), created_at: z.string(), class_id: z.uuid() });
export type SentReminder = z.infer<typeof reminderRow>;

/** Reminders sent to one student that the caller may read (RLS). */
export async function studentReminders(studentProfileId: string): Promise<SentReminder[]> {
  const { data, error } = await supabase
    .from('reminder_recipients')
    .select('reminder:reminders(id, message, due_date, created_at, class_id)')
    .eq('student_profile_id', studentProfileId)
    .limit(50);
  if (error) throw error;
  const rows = (data ?? []).flatMap((r) => {
    const reminder = (r as { reminder: unknown }).reminder;
    return reminder ? [reminderRow.parse(reminder)] : [];
  });
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export const MEMBER_STATUSES = ['ACTIVE', 'INACTIVE', 'REMOVED'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];
export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', REMOVED: 'Removed' };

const studentRow = z.object({
  student_profile_id: z.uuid(),
  user_id: z.uuid().nullable(),
  display_name: z.string(),
  class_id: z.uuid(),
  class_name: z.string(),
  status: z.enum(MEMBER_STATUSES),
  joined_at: z.string(),
  subject_count: num,
  missing_count: num,
  total_count: num,
});
export type StudentRow = z.infer<typeof studentRow>;
export type StudentSort = 'name' | 'section' | 'newest' | 'missing';

export const listStudents = (q: { search?: string; classId?: string; status?: MemberStatus | ''; sort?: StudentSort; page?: number } = {}) =>
  rpcPage('teacher_students', { p_search: opt(q.search), p_class_id: opt(q.classId), p_status: opt(q.status), p_sort: q.sort ?? 'name', ...paging(q.page) }, studentRow);

/** Every section membership of one student in the teacher's sections. */
export const studentMemberships = (studentProfileId: string) =>
  rpcRows('teacher_student_memberships', { p_student_profile_id: studentProfileId }, studentRow);

export const setMemberStatus = (classId: string, studentProfileId: string, status: MemberStatus) =>
  rpcVoid('set_member_status', { p_class_id: classId, p_student_profile_id: studentProfileId, p_status: status });

export const moveStudent = (studentProfileId: string, fromClassId: string, toClassId: string) =>
  rpcVoid('move_student', { p_student_profile_id: studentProfileId, p_from_class_id: fromClassId, p_to_class_id: toClassId });

const missingRow = z.object({
  assessment_id: z.uuid(),
  title: z.string(),
  assessment_type: assessmentType,
  quarter,
  subject_id: z.uuid(),
  subject_name: z.string(),
  class_id: z.uuid(),
  class_name: z.string(),
  due_date: z.string().nullable(),
  overdue: z.boolean(),
});
export type MissingWork = z.infer<typeof missingRow>;

/** Work the student hasn't submitted (their family, or their teachers for their own sections). */
export const studentMissingWork = (studentProfileId: string) => rpcRows('student_missing_work', { p_student_profile_id: studentProfileId }, missingRow);

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

const dashboardRow = z.object({
  teacher_name: z.string().nullable(),
  school_year: z.string().nullable(),
  section_count: num,
  student_count: num,
  active_assessments: num,
  missing: num,
  pending: num,
  overdue: num,
});
export type DashboardSummary = z.infer<typeof dashboardRow>;

export async function dashboardSummary(): Promise<DashboardSummary> {
  const [row] = await rpcRows('teacher_dashboard', {}, dashboardRow);
  if (!row) throw new Error('Could not load the dashboard.');
  return row;
}

const attentionRow = z.object({
  assessment_id: z.uuid(),
  title: z.string(),
  subject_name: z.string(),
  class_id: z.uuid(),
  class_name: z.string(),
  due_date: z.string().nullable(),
  missing: num,
  pending: num,
  overdue: num,
});
export type AttentionItem = z.infer<typeof attentionRow>;

export const needsAttention = (limit = 10) => rpcRows('teacher_needs_attention', { p_limit: limit }, attentionRow);

const sectionAnalyticsRow = z.object({
  class_id: z.uuid(),
  class_name: z.string(),
  expected: num,
  submitted: num,
  verified: num,
  pending: num,
  missing: num,
  overdue: num,
  percent: num,
  verified_percent: num,
  status: completionStatus,
});
export type SectionAnalytics = z.infer<typeof sectionAnalyticsRow>;

export const sectionAnalytics = () => rpcRows('teacher_section_analytics', {}, sectionAnalyticsRow);

// ---------------------------------------------------------------------------
// Notifications (every role reads only their own; RLS)
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  'SUBMISSION_CREATED',
  'SUBMISSION_VERIFIED',
  'SUBMISSION_REJECTED',
  'SCORE_UPDATED',
  'STUDENT_JOINED',
  'STUDENT_LEFT',
  'TEACHER_REMINDER',
  'TEACHER_REPORT',
  'ASSESSMENT_CREATED',
  'CLASS_JOINED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const notificationRow = z.object({
  id: z.uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string().nullable(),
  class_id: z.uuid().nullable(),
  subject_id: z.uuid().nullable(),
  assessment_id: z.uuid().nullable(),
  evidence_id: z.uuid().nullable(),
  student_profile_id: z.uuid().nullable(),
  read_at: z.string().nullable(),
  archived_at: z.string().nullable(),
  created_at: z.string(),
  evidence: z.object({ status: z.string() }).nullable(),
});
export type AppNotification = z.infer<typeof notificationRow>;

/**
 * Pass = a submission the teacher verified; Pending = submitted, waiting for review
 * (PRD v0.5 §18). Overdue is not a stored notification: see studentMissingWork /
 * listAssessmentProgress, which compute it from due dates.
 */
export type NotificationFilter = 'ALL' | 'PASS' | 'PENDING';

export function notificationStatus(n: Pick<AppNotification, 'evidence'>): 'PASS' | 'PENDING' | null {
  const status = n.evidence?.status;
  if (!status) return null;
  if (status === 'TEACHER_VERIFIED') return 'PASS';
  return status === 'REJECTED' ? null : 'PENDING';
}

export async function listNotifications(q: {
  filter?: NotificationFilter;
  classId?: string;
  subjectId?: string;
  type?: NotificationType | '';
  /** Any of these types (student filters group several). */
  types?: NotificationType[];
  search?: string;
  from?: string;
  to?: string;
  archived?: boolean;
  page?: number;
}): Promise<Page<AppNotification>> {
  const userId = await ensureSignedIn();
  const filter = q.filter ?? 'ALL';
  const embed = filter === 'ALL' ? 'evidence(status)' : 'evidence!inner(status)';
  let query = supabase
    .from('notifications')
    .select(`id, type, title, body, class_id, subject_id, assessment_id, evidence_id, student_profile_id, read_at, archived_at, created_at, ${embed}`, { count: 'exact' })
    .eq('user_id', userId);
  query = q.archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  if (filter === 'PASS') query = query.eq('evidence.status', 'TEACHER_VERIFIED');
  if (filter === 'PENDING') query = query.in('evidence.status', ['UPLOADED', 'CODE_MATCHED', 'NEEDS_REVIEW']);
  if (q.classId) query = query.eq('class_id', q.classId);
  if (q.subjectId) query = query.eq('subject_id', q.subjectId);
  if (q.type) query = query.eq('type', q.type);
  if (q.types?.length) query = query.in('type', q.types);
  if (q.search) query = query.or(`title.ilike.%${q.search.replace(/[%,()]/g, ' ')}%,body.ilike.%${q.search.replace(/[%,()]/g, ' ')}%`);
  if (q.from) query = query.gte('created_at', q.from);
  if (q.to) query = query.lte('created_at', `${q.to}T23:59:59.999Z`);
  const start = (q.page ?? 0) * PAGE_SIZE;
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(start, start + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: z.array(notificationRow).parse(data ?? []), total: count ?? 0 };
}

export async function unreadNotificationCount(): Promise<number> {
  const userId = await ensureSignedIn();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('archived_at', null);
  if (error) throw error;
  return count ?? 0;
}

/** Marks the given notifications read, or all of them when `ids` is omitted. */
export const markNotificationsRead = (ids?: string[]) => rpcVoid('mark_notifications_read', { p_ids: ids ?? null });
export const archiveNotification = (id: string) => rpcVoid('archive_notification', { p_id: id });

// ---------------------------------------------------------------------------
// Teacher information
// ---------------------------------------------------------------------------

const teacherInfoRow = z.object({ school_name: z.string().nullable(), department: z.string().nullable(), teaching_subjects: z.array(z.string()) });
export type TeacherInfo = z.infer<typeof teacherInfoRow>;

export async function getTeacherInfo(): Promise<TeacherInfo> {
  const userId = await ensureSignedIn();
  const { data, error } = await supabase.from('profiles').select('school_name, department, teaching_subjects').eq('id', userId).single();
  if (error) throw error;
  return teacherInfoRow.parse(data);
}

export const updateTeacherInfo = (info: { schoolName: string; department: string; teachingSubjects: string[] }) =>
  rpcVoid('update_my_teacher_info', { p_school_name: info.schoolName, p_department: info.department, p_teaching_subjects: info.teachingSubjects });

// ---------------------------------------------------------------------------
// Joining a section (students and teachers)
// ---------------------------------------------------------------------------

const previewRow = z.object({
  name: z.string(),
  grade_level: z.number().nullable(),
  section: z.string().nullable(),
  school_year: z.string().nullable(),
  school_name: z.string().nullable(),
  teacher_name: z.string().nullable(),
  student_count: num,
});
export type SectionPreview = z.infer<typeof previewRow>;

/** What a student sees before confirming a join (PRD v0.3 §9.3). */
export async function previewSection(code: string): Promise<SectionPreview> {
  const [row] = await rpcRows('preview_class', { p_join_code: code }, previewRow);
  if (!row) throw new Error('No class has that code. Check it with your teacher.');
  return row;
}
