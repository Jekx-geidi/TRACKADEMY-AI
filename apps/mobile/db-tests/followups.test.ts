import { describe, expect, it } from 'vitest';

import { must, newAccount, rows, teacherWithSubject } from './clients';

describe('student joined notification', () => {
  it('names the student profile, so the teacher can open or message the student', async () => {
    const { teacher, section } = await teacherWithSubject();
    const student = await newAccount('STUDENT', 'Maria Santos');

    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
    const [note] = await rows<{ student_profile_id: string | null }>(
      teacher.client.from('notifications').select('student_profile_id').eq('type', 'STUDENT_JOINED'),
    );

    expect(note?.student_profile_id).toBe(student.studentProfileId);
  });
});

describe('assessment_progress', () => {
  it('returns one assessment’s counts for its section teacher only', async () => {
    const { teacher, subject } = await teacherWithSubject();
    const quiz = await must(
      teacher.client
        .rpc('create_subject_assessment', { p_subject_id: subject.id, p_assessment_type: 'QUIZ', p_title: 'Quiz 1', p_quarter: 'FIRST_QUARTER', p_total_score: 20 })
        .single<{ id: string }>(),
    );
    const other = await newAccount('TEACHER');

    const [row] = await rows<{ assessment_id: string; required: number; status: string }>(teacher.client.rpc('assessment_progress', { p_assessment_id: quiz.id }));
    const { error } = await other.client.rpc('assessment_progress', { p_assessment_id: quiz.id });

    expect(row).toMatchObject({ assessment_id: quiz.id, required: 0, status: 'NOT_STARTED' });
    expect(error?.message).toBe('Only teachers of this section can do that.');
  });
});

describe('teacher_student_memberships', () => {
  it('lists one student’s memberships in the teacher’s sections', async () => {
    const { teacher, section } = await teacherWithSubject();
    const student = await newAccount('STUDENT', 'Jake Engaña');
    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
    const other = await newAccount('TEACHER');

    const mine = await rows<{ class_id: string; display_name: string; status: string }>(
      teacher.client.rpc('teacher_student_memberships', { p_student_profile_id: student.studentProfileId }),
    );
    const theirs = await rows(other.client.rpc('teacher_student_memberships', { p_student_profile_id: student.studentProfileId }));

    expect(mine).toEqual([expect.objectContaining({ class_id: section.id, display_name: 'Jake Engaña', status: 'ACTIVE' })]);
    expect(theirs).toEqual([]);
  });
});
