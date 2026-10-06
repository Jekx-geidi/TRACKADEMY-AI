// Completion status (PRD v0.5 §38–§39). Same rules as public.completion_percent /
// public.completion_status in the database, which uses them for filtering.

export type CompletionStatus = 'NOT_STARTED' | 'NEEDS_ATTENTION' | 'ALMOST_COMPLETE' | 'COMPLETE';
export type Tone = 'neutral' | 'danger' | 'warning' | 'success';

export const COMPLETION_LABEL: Record<CompletionStatus, string> = {
  NOT_STARTED: 'Not Started',
  NEEDS_ATTENTION: 'Needs Attention',
  ALMOST_COMPLETE: 'Almost Complete',
  COMPLETE: 'Complete',
};

export const COMPLETION_TONE: Record<CompletionStatus, Tone> = {
  NOT_STARTED: 'neutral',
  NEEDS_ATTENTION: 'danger',
  ALMOST_COMPLETE: 'warning',
  COMPLETE: 'success',
};

export interface Completion {
  percent: number;
  status: CompletionStatus;
  label: string;
  tone: Tone;
}

/** `done` of `required` students (exempt students are already left out of `required`). */
export function completion(done: number, required: number): Completion {
  let status: CompletionStatus;
  let percent: number;
  if (required > 0 && done >= required) {
    status = 'COMPLETE';
    percent = 100;
  } else if (required <= 0 || done <= 0) {
    status = 'NOT_STARTED';
    percent = 0;
  } else {
    const exact = (done * 100) / required;
    status = exact >= 80 ? 'ALMOST_COMPLETE' : 'NEEDS_ATTENTION';
    // Never round a partial result up to 100% or a started one down to 0%.
    percent = Math.min(99, Math.max(1, Math.round(exact)));
  }
  return { percent, status, label: COMPLETION_LABEL[status], tone: COMPLETION_TONE[status] };
}

/** Lists page 20 rows at a time (PRD v0.5 §35). */
export const PAGE_SIZE = 20;

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / PAGE_SIZE));

export function pageLabel(page: number, total: number): string {
  if (total === 0) return 'Showing 0 of 0';
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);
  return `Showing ${first}-${last} of ${total}`;
}
