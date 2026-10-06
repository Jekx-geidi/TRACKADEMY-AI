// Small helpers shared by the Sections area screens (Sections, Section, Subject, Assessment).
import { authErrorMessage } from '@/features/auth/api';
import type { MemberStatus, SubmissionStatus } from '@/features/teacher/api';
import type { Tone } from '@/features/teacher/progress';

/** Runs a load and turns Supabase errors into plain text, so LoadGate shows a readable message. */
export async function friendly<T>(load: Promise<T>): Promise<T> {
  try {
    return await load;
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

/** "1 student", "20 students". */
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** "Oct 6, 2026" for a date ("2026-10-06") or a timestamp; "--" when empty. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '--';
  // A bare date is a calendar day, not midnight UTC.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '--';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Today's local date as YYYY-MM-DD, for <input type="date">. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "22/30" or "--" when there is no score. */
export function scoreText(score: number | null, total: number): string {
  if (score === null) return '--';
  return `${Number(score.toFixed(2))}/${total}`;
}

export const MEMBER_TONE: Record<MemberStatus, Tone> = { ACTIVE: 'success', INACTIVE: 'neutral', REMOVED: 'danger' };

export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  VERIFIED: 'Verified',
  PENDING: 'Pending Review',
  REJECTED: 'Rejected',
  MISSING: 'Missing',
  EXEMPT: 'Exempt',
};

export const SUBMISSION_TONE: Record<SubmissionStatus, Tone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  MISSING: 'danger',
  EXEMPT: 'neutral',
};
