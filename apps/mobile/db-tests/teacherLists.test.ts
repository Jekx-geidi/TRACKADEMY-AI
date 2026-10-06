import { describe, expect, it } from 'vitest';

import { must, newAccount, ok, rows, submitEvidence, teacherWithSubject, type Account } from './clients';

type Assessment = { id: string; assessment_code: string };
type Progress = {
  assessment_id: string;
  required: number;
  submitted: number;
  verified: number;
  pending: number;
  missing: number;
  overdue: number;
  percent: number;
  status: string;
  total_count: number;
};

const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

/**
 * A section with three students and a quiz due yesterday:
 * Ana submitted and was verified, Ben submitted and waits, Carl has nothing.
 */
async function classroom() {
  const { teacher, section, subject } = await teacherWithSubject('Mathematics');
  const quiz = await must(
    teacher.client
      .rpc('create_subject_assessment', {
        p_subject_id: subject.id,
        p_assessment_type: 'QUIZ',
        p_title: 'Math Quiz 4',
        p_quarter: 'FIRST_QUARTER',
        p_total_score: 30,
        p_assessment_date: yesterday(),
        p_due_date: yesterday(),
      })
      .single<Assessment>(),
  );
  const join = async (name: string) => {
    const s = await newAccount('STUDENT', name);
    await must(s.client.rpc('join_class', { p_join_code: section.join_code }));
    return s;
  };
  const ana = await join('Ana Cruz');
  const ben = await join('Ben Reyes');
  const carl = await join('Carl Santos');
  const anaEvidence = await submitEvidence(ana, quiz, ana.studentProfileId!, 28);
  await ok(teacher.client.rpc('verify_evidence', { p_evidence_id: anaEvidence }));
  await submitEvidence(ben, quiz, ben.studentProfileId!, 20);
  return { teacher, section, subject, quiz, ana, ben, carl };
}

const progressOf = async (teacher: Account, classId: string) =>
  rows<Progress>(teacher.client.rpc('list_assessment_progress', { p_class_id: classId }));

describe('assessment progress', () => {
  it('counts required, submitted, verified, pending, missing and overdue', async () => {
    const { teacher, section } = await classroom();

    const [row] = await progressOf(teacher, section.id);

    expect(row).toMatchObject({ required: 3, submitted: 2, verified: 1, pending: 1, missing: 1, overdue: 1, percent: 67, status: 'NEEDS_ATTENTION' });
  });

  it('leaves exempt students out of the required count', async () => {
    const { teacher, section, quiz, carl } = await classroom();

    await ok(teacher.client.rpc('set_exemption', { p_assessment_id: quiz.id, p_student_profile_id: carl.studentProfileId, p_exempt: true }));
    const [row] = await progressOf(teacher, section.id);

    expect(row).toMatchObject({ required: 2, submitted: 2, missing: 0, overdue: 0, percent: 100, status: 'COMPLETE' });
  });

  it('treats a rejected paper as not submitted', async () => {
    const { teacher, section, quiz, carl } = await classroom();
    const carlEvidence = await submitEvidence(carl, quiz, carl.studentProfileId!, 10);

    await ok(teacher.client.rpc('reject_evidence', { p_evidence_id: carlEvidence, p_reason: 'Blurry photo.' }));
    const [row] = await progressOf(teacher, section.id);

    expect(row).toMatchObject({ submitted: 2, missing: 1 });
  });

  it('filters by status and refuses teachers of other sections', async () => {
    const { teacher, section } = await classroom();
    const other = await newAccount('TEACHER');

    const complete = await must(teacher.client.rpc('list_assessment_progress', { p_class_id: section.id, p_status: 'COMPLETE' }));
    const { error } = await other.client.rpc('list_assessment_progress', { p_class_id: section.id });

    expect(complete).toEqual([]);
    expect(error?.message).toBe('Only teachers of this section can do that.');
  });
});

describe('assessment_students', () => {
  it('lists every required student with their status', async () => {
    const { teacher, quiz } = await classroom();

    const list = await rows<{ display_name: string; row_status: string; score: number | null }>(
      teacher.client.rpc('assessment_students', { p_assessment_id: quiz.id, p_sort: 'name' }),
    );

    expect(list.map((r) => [r.display_name, r.row_status, r.score === null ? null : Number(r.score)])).toEqual([
      ['Ana Cruz', 'VERIFIED', 28],
      ['Ben Reyes', 'PENDING', 20],
      ['Carl Santos', 'MISSING', null],
    ]);
  });

  it('searches and filters', async () => {
    const { teacher, quiz } = await classroom();

    const missing = await rows<{ display_name: string }>(teacher.client.rpc('assessment_students', { p_assessment_id: quiz.id, p_status: 'MISSING' }));
    const search = await rows<{ display_name: string }>(teacher.client.rpc('assessment_students', { p_assessment_id: quiz.id, p_search: 'reyes' }));

    expect(missing.map((r) => r.display_name)).toEqual(['Carl Santos']);
    expect(search.map((r) => r.display_name)).toEqual(['Ben Reyes']);
  });
});

describe('teacher_sections', () => {
  it('lists only the teacher’s sections, with counts, search and paging', async () => {
    const { teacher, section } = await classroom();
    await must(teacher.client.rpc('create_class_workspace', { p_grade_level: 8, p_section: 'Apple', p_school_year: '2026-2027' }));
    const other = await newAccount('TEACHER');

    const all = await rows<{ name: string; student_count: number; subject_count: number; total_count: number }>(teacher.client.rpc('teacher_sections', { p_sort: 'name' }));
    const page = await rows<{ name: string; total_count: number }>(teacher.client.rpc('teacher_sections', { p_sort: 'name', p_limit: 1, p_offset: 1 }));
    const searched = await rows<{ name: string }>(teacher.client.rpc('teacher_sections', { p_search: 'apple' }));

    expect(all).toEqual([
      expect.objectContaining({ name: section.name, student_count: 3, subject_count: 1, total_count: 2 }),
      expect.objectContaining({ name: 'Grade 8 - Apple', student_count: 0, subject_count: 0, total_count: 2 }),
    ]);
    expect(page).toEqual([expect.objectContaining({ name: 'Grade 8 - Apple', total_count: 2 })]);
    expect(searched.map((r) => r.name)).toEqual(['Grade 8 - Apple']);
    expect(await must(other.client.rpc('teacher_sections', {}))).toEqual([]);
  });
});

describe('student management', () => {
  it('lists the teacher’s students across sections and filters by status', async () => {
    const { teacher, section, carl } = await classroom();

    await ok(teacher.client.rpc('set_member_status', { p_class_id: section.id, p_student_profile_id: carl.studentProfileId, p_status: 'INACTIVE' }));
    const active = await rows<{ display_name: string; class_name: string }>(teacher.client.rpc('teacher_students', { p_status: 'ACTIVE', p_sort: 'name' }));
    const inactive = await rows<{ display_name: string }>(teacher.client.rpc('teacher_students', { p_status: 'INACTIVE' }));

    expect(active.map((r) => r.display_name)).toEqual(['Ana Cruz', 'Ben Reyes']);
    expect(active[0]?.class_name).toBe(section.name);
    expect(inactive.map((r) => r.display_name)).toEqual(['Carl Santos']);
  });

  it('stops counting an inactive student as required', async () => {
    const { teacher, section, carl } = await classroom();

    await ok(teacher.client.rpc('set_member_status', { p_class_id: section.id, p_student_profile_id: carl.studentProfileId, p_status: 'INACTIVE' }));
    const [row] = await progressOf(teacher, section.id);

    expect(row).toMatchObject({ required: 2, missing: 0 });
  });

  it('moves a student to another section, keeping the old evidence', async () => {
    const { teacher, section, quiz, ben } = await classroom();
    const apple = await must(teacher.client.rpc('create_class_workspace', { p_grade_level: 7, p_section: 'Apple', p_school_year: '2026-2027' }).single<{ id: string }>());

    await ok(teacher.client.rpc('move_student', { p_student_profile_id: ben.studentProfileId, p_from_class_id: section.id, p_to_class_id: apple.id }));
    const memberships = await rows<{ class_id: string; status: string }>(teacher.client.rpc('teacher_students', { p_search: 'Ben' }));
    const oldEvidence = await must(teacher.client.from('evidence').select('id').eq('assessment_id', quiz.id).eq('student_profile_id', ben.studentProfileId!));

    expect(memberships).toEqual(
      expect.arrayContaining([expect.objectContaining({ class_id: section.id, status: 'REMOVED' }), expect.objectContaining({ class_id: apple.id, status: 'ACTIVE' })]),
    );
    expect(oldEvidence).toHaveLength(1);
  });

  it('refuses a move into a section the teacher does not teach', async () => {
    const { teacher, section, ben } = await classroom();
    const { section: elsewhere } = await teacherWithSubject();

    const { error } = await teacher.client.rpc('move_student', { p_student_profile_id: ben.studentProfileId, p_from_class_id: section.id, p_to_class_id: elsewhere.id });

    expect(error?.message).toBe('Only teachers of this section can do that.');
  });
});

describe('dashboard', () => {
  it('sums sections, students, missing and pending, and lists what needs attention', async () => {
    const { teacher, quiz } = await classroom();

    const summary = await must(teacher.client.rpc('teacher_dashboard').single<Record<string, unknown>>());
    const attention = await rows<{ assessment_id: string; missing: number; pending: number }>(teacher.client.rpc('teacher_needs_attention'));

    expect(summary).toMatchObject({ section_count: 1, student_count: 3, missing: 1, pending: 1, school_year: '2026-2027' });
    expect(attention).toEqual([expect.objectContaining({ assessment_id: quiz.id, missing: 1, pending: 1 })]);
  });

  it('gives per-section and per-subject analytics', async () => {
    const { teacher, section, subject } = await classroom();

    const sections = await rows<Record<string, unknown>>(teacher.client.rpc('teacher_section_analytics'));
    const subjects = await rows<Record<string, unknown>>(teacher.client.rpc('section_subject_analytics', { p_class_id: section.id }));

    expect(sections).toEqual([expect.objectContaining({ class_id: section.id, expected: 3, submitted: 2, verified: 1, percent: 67, status: 'NEEDS_ATTENTION' })]);
    expect(subjects).toEqual([expect.objectContaining({ subject_id: subject.id, expected: 3, submitted: 2 })]);
  });
});

describe('missing work', () => {
  it('shows a student’s missing work to their parent and their teacher, nobody else', async () => {
    const { teacher, quiz, carl } = await classroom();
    const parent = await newAccount('PARENT');
    const { link_code } = await must(carl.client.rpc('ensure_my_student_profile').single<{ link_code: string }>());
    await must(parent.client.rpc('link_student_by_code', { p_link_code: link_code }));
    const stranger = await newAccount('PARENT');

    const forParent = await rows<{ assessment_id: string; overdue: boolean }>(parent.client.rpc('student_missing_work', { p_student_profile_id: carl.studentProfileId }));
    const forTeacher = await rows<{ assessment_id: string }>(teacher.client.rpc('student_missing_work', { p_student_profile_id: carl.studentProfileId }));
    const forStranger = await stranger.client.rpc('student_missing_work', { p_student_profile_id: carl.studentProfileId });

    expect(forParent).toEqual([expect.objectContaining({ assessment_id: quiz.id, overdue: true })]);
    expect(forTeacher).toHaveLength(1);
    expect(forStranger.error?.message).toBe('You cannot see this student’s records.');
  });
});

describe('teacher information', () => {
  it('saves school, department and teaching subjects', async () => {
    const teacher = await newAccount('TEACHER');

    await ok(teacher.client.rpc('update_my_teacher_info', { p_school_name: 'Sample NHS', p_department: 'Math', p_teaching_subjects: ['Mathematics', ' Science ', ''] }));
    const row = await must(teacher.client.from('profiles').select('school_name, department, teaching_subjects').eq('id', teacher.userId).single());

    expect(row).toEqual({ school_name: 'Sample NHS', department: 'Math', teaching_subjects: ['Mathematics', 'Science'] });
  });
});
