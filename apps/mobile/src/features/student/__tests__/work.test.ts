import { describe, expect, it } from 'vitest';

import { currentQuarter, dueLabel, STUDENT_NOTIFICATION_TYPES, WORK_STATUS_LABEL, WORK_STATUS_TONE } from '../work';

describe('WORK_STATUS_LABEL', () => {
  it('uses student-friendly words, never backend status names', () => {
    expect(WORK_STATUS_LABEL).toEqual({
      VERIFIED: 'Teacher Verified',
      PENDING: 'Awaiting Verification',
      NEEDS_RESUBMISSION: 'Needs Resubmission',
      MISSING: 'Missing',
      OVERDUE: 'Overdue',
      EXEMPT: 'Excused',
    });
  });

  it('gives every status a tone, so colour is never the only signal', () => {
    expect(WORK_STATUS_TONE).toEqual({
      VERIFIED: 'success',
      PENDING: 'warning',
      NEEDS_RESUBMISSION: 'danger',
      MISSING: 'danger',
      OVERDUE: 'danger',
      EXEMPT: 'neutral',
    });
  });
});

describe('dueLabel', () => {
  const today = new Date(2026, 9, 6); // Oct 6, 2026

  it.each([
    ['2026-10-06', 'Due Today'],
    ['2026-10-07', 'Due Tomorrow'],
    ['2026-10-12', 'Due Oct 12'],
    ['2026-10-05', 'Was due Oct 5'],
  ])('%s → %s', (due, label) => {
    expect(dueLabel(due, today)).toBe(label);
  });

  it('is empty without a due date', () => {
    expect(dueLabel(null, today)).toBe('');
  });
});

describe('currentQuarter', () => {
  it.each([
    [new Date(2026, 5, 15), 'FIRST_QUARTER'],
    [new Date(2026, 7, 31), 'FIRST_QUARTER'],
    [new Date(2026, 9, 6), 'SECOND_QUARTER'],
    [new Date(2026, 11, 1), 'THIRD_QUARTER'],
    [new Date(2027, 1, 28), 'THIRD_QUARTER'],
    [new Date(2027, 2, 1), 'FOURTH_QUARTER'],
    [new Date(2027, 4, 31), 'FOURTH_QUARTER'],
  ])('%s → %s', (date, quarter) => {
    expect(currentQuarter(date)).toBe(quarter);
  });
});

describe('STUDENT_NOTIFICATION_TYPES', () => {
  it('groups notification types under the student filters', () => {
    expect(STUDENT_NOTIFICATION_TYPES).toEqual({
      TEACHER: ['TEACHER_REMINDER', 'TEACHER_REPORT'],
      VERIFIED: ['SUBMISSION_VERIFIED', 'SCORE_UPDATED'],
      CLASS: ['ASSESSMENT_CREATED', 'CLASS_JOINED'],
    });
  });
});
