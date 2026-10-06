// Student-facing work statuses (PRD v0.7 §26). Same states as public.student_work_items.
import type { Quarter } from '@/features/assessments/constants';
import type { NotificationType } from '@/features/teacher/api';
import type { Tone } from '@/features/teacher/progress';

export const WORK_STATUSES = ['VERIFIED', 'PENDING', 'NEEDS_RESUBMISSION', 'MISSING', 'OVERDUE', 'EXEMPT'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

/** Server filters: one status, or SUBMITTED (verified + pending) / LACKING (missing + overdue + resubmit). */
export type WorkFilter = WorkStatus | 'SUBMITTED' | 'LACKING' | '';

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  VERIFIED: 'Teacher Verified',
  PENDING: 'Awaiting Verification',
  NEEDS_RESUBMISSION: 'Needs Resubmission',
  MISSING: 'Missing',
  OVERDUE: 'Overdue',
  EXEMPT: 'Excused',
};

export const WORK_STATUS_TONE: Record<WorkStatus, Tone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  NEEDS_RESUBMISSION: 'danger',
  MISSING: 'danger',
  OVERDUE: 'danger',
  EXEMPT: 'neutral',
};

/** Work the student still has to upload. */
export const isLacking = (status: WorkStatus) => status === 'MISSING' || status === 'OVERDUE' || status === 'NEEDS_RESUBMISSION';

const shortDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Due Today", "Due Tomorrow", "Due Oct 12", or "Was due Oct 5"; '' without a due date. */
export function dueLabel(dueDate: string | null, today = new Date()): string {
  if (!dueDate) return '';
  const [y, m, d] = dueDate.split('-').map(Number);
  const due = new Date(y!, m! - 1, d!);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due.getTime() - start.getTime()) / 86_400_000);
  if (days === 0) return 'Due Today';
  if (days === 1) return 'Due Tomorrow';
  return days < 0 ? `Was due ${shortDate(due)}` : `Due ${shortDate(due)}`;
}

/** School-year quarters (June start): Jun–Aug, Sep–Nov, Dec–Feb, Mar–May. */
export function currentQuarter(date = new Date()): Quarter {
  const month = date.getMonth(); // 0 = January
  if (month >= 5 && month <= 7) return 'FIRST_QUARTER';
  if (month >= 8 && month <= 10) return 'SECOND_QUARTER';
  if (month === 11 || month <= 1) return 'THIRD_QUARTER';
  return 'FOURTH_QUARTER';
}

/** Notification filters (PRD v0.7 §27). "Missing" is not stored: it lists lacking work instead. */
export type StudentNotificationFilter = 'ALL' | 'TEACHER' | 'VERIFIED' | 'MISSING' | 'CLASS';

export const STUDENT_NOTIFICATION_TYPES: Record<'TEACHER' | 'VERIFIED' | 'CLASS', NotificationType[]> = {
  TEACHER: ['TEACHER_REMINDER', 'TEACHER_REPORT'],
  VERIFIED: ['SUBMISSION_VERIFIED', 'SCORE_UPDATED'],
  CLASS: ['ASSESSMENT_CREATED', 'CLASS_JOINED'],
};
