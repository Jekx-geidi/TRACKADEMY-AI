export const ASSESSMENT_TYPES = [
  'QUIZ',
  'ASSIGNMENT',
  'ACTIVITY',
  'PROJECT',
  'EXAM',
  'PERFORMANCE_TASK',
  'SEATWORK',
  'HOMEWORK',
  'RECITATION',
  'LABORATORY_ACTIVITY',
  'OTHER',
] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  QUIZ: 'Quiz',
  ASSIGNMENT: 'Assignment',
  ACTIVITY: 'Activity',
  PROJECT: 'Project',
  EXAM: 'Exam',
  PERFORMANCE_TASK: 'Performance Task',
  SEATWORK: 'Seatwork',
  HOMEWORK: 'Homework',
  RECITATION: 'Recitation',
  LABORATORY_ACTIVITY: 'Laboratory Activity',
  OTHER: 'Other',
};

export const QUARTERS = ['FIRST_QUARTER', 'SECOND_QUARTER', 'THIRD_QUARTER', 'FOURTH_QUARTER'] as const;
export type Quarter = (typeof QUARTERS)[number];

export const QUARTER_LABELS: Record<Quarter, string> = {
  FIRST_QUARTER: 'First Quarter',
  SECOND_QUARTER: 'Second Quarter',
  THIRD_QUARTER: 'Third Quarter',
  FOURTH_QUARTER: 'Fourth Quarter',
};

export const MAX_TOTAL_SCORE = 1000;
