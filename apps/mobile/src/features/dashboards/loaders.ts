import type { AssessmentMatch } from '@/features/assessments/schema';
import type { EvidenceRecord } from '@/features/evidence/schema';
import { listMyAssessments } from '@/services/api/assessments';
import { listStudentRecords, listSubmissionsForMyAssessments } from '@/services/api/evidence';
import { listMyChildren } from '@/services/api/guardians';
import { getMyStudentProfile, listMyClasses, type ClassSummary, type StudentProfile } from '@/services/api/students';

export interface StudentOverview {
  student: StudentProfile;
  classes: ClassSummary[];
  records: EvidenceRecord[];
}

export async function loadStudentOverview(): Promise<StudentOverview> {
  const [student, classes] = await Promise.all([getMyStudentProfile(), listMyClasses()]);
  const records = await listStudentRecords(student.id);
  return { student, classes, records };
}

export const loadChildren = listMyChildren;

export const loadChildRecords = (childId: string) => listStudentRecords(childId);

export interface TeacherOverview {
  assessments: AssessmentMatch[];
  submissions: EvidenceRecord[];
  classes: ClassSummary[];
}

export async function loadTeacherOverview(): Promise<TeacherOverview> {
  const [assessments, submissions, classes] = await Promise.all([listMyAssessments(), listSubmissionsForMyAssessments(), listMyClasses()]);
  return { assessments, submissions, classes };
}
