import { describe, expect, it } from 'vitest';

import { must, newAccount, signInAs, submitEvidence, teacherWithSubject } from './clients';

const quiz = (subjectId: string, extra: Record<string, unknown> = {}) => ({
  p_subject_id: subjectId,
  p_assessment_type: 'QUIZ',
  p_title: 'Math Quiz 4',
  p_quarter: 'FIRST_QUARTER',
  p_total_score: 30,
  p_assessment_date: '2026-10-05',
  p_due_date: '2026-10-09',
  p_instructions: null,
  ...extra,
});

type Assessment = { id: string; assessment_code: string; subject: string; subject_id: string; due_date: string | null };

describe('sections', () => {
  it('stores an optional description', async () => {
    const teacher = await newAccount('TEACHER');

    const section = await must(
      teacher.client
        .rpc('create_class_workspace', { p_grade_level: 7, p_section: 'Mango', p_school_year: '2026-2027', p_description: '  Advisory class  ' })
        .single<{ id: string; description: string }>(),
    );

    expect(section.description).toBe('Advisory class');
  });

  it('lets a student preview a section by its join code before joining, without member data', async () => {
    const { section } = await teacherWithSubject();
    const student = await newAccount('STUDENT');

    const preview = await must(student.client.rpc('preview_class', { p_join_code: section.join_code }).single<Record<string, unknown>>());

    expect(preview).toEqual({
      name: section.name,
      grade_level: 7,
      section: section.name.replace('Grade 7 - ', ''),
      school_year: '2026-2027',
      school_name: null,
      teacher_name: 'Ms. Santos',
      student_count: 0,
    });
  });

  it('says so when no section has the code', async () => {
    const student = await newAccount('STUDENT');

    const { error } = await student.client.rpc('preview_class', { p_join_code: '000000' }).single();

    expect(error?.message).toBe('No class has that code. Check it with your teacher.');
  });

  it('makes a joining student an active member', async () => {
    const { section } = await teacherWithSubject();
    const student = await newAccount('STUDENT');

    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
    const member = await must(student.client.from('class_members').select('status, member_role').eq('class_id', section.id).single());

    expect(member).toEqual({ status: 'ACTIVE', member_role: 'STUDENT' });
  });
});

describe('subjects', () => {
  it('lets the section teacher add subjects', async () => {
    const { teacher, section } = await teacherWithSubject('Mathematics');

    const science = await must(teacher.client.rpc('create_subject', { p_class_id: section.id, p_name: '  Science ', p_code: 'SCI7' }).single<Record<string, unknown>>());

    expect(science).toMatchObject({ name: 'Science', subject_code: 'SCI7', class_id: section.id });
  });

  it('refuses a second subject with the same name in one section', async () => {
    const { teacher, section } = await teacherWithSubject('Mathematics');

    const { error } = await teacher.client.rpc('create_subject', { p_class_id: section.id, p_name: 'mathematics' });

    expect(error?.message).toBe('This section already has a subject with that name.');
  });

  it('refuses teachers of other sections and students', async () => {
    const { section } = await teacherWithSubject();
    const otherTeacher = await newAccount('TEACHER');
    const student = await newAccount('STUDENT');

    const asTeacher = await otherTeacher.client.rpc('create_subject', { p_class_id: section.id, p_name: 'Science' });
    const asStudent = await student.client.rpc('create_subject', { p_class_id: section.id, p_name: 'Science' });

    expect(asTeacher.error?.message).toBe('Only teachers of this section can do that.');
    expect(asStudent.error?.message).toMatch(/teacher/i);
  });

  it('shows a section’s subjects to its members only', async () => {
    const { section, subject } = await teacherWithSubject();
    const member = await newAccount('STUDENT');
    const outsider = await newAccount('STUDENT');
    await must(member.client.rpc('join_class', { p_join_code: section.join_code }));

    const seenByMember = await must(member.client.from('subjects').select('id').eq('class_id', section.id));
    const seenByOutsider = await must(outsider.client.from('subjects').select('id').eq('class_id', section.id));

    expect(seenByMember).toEqual([{ id: subject.id }]);
    expect(seenByOutsider).toEqual([]);
  });
});

describe('assessments inside a subject', () => {
  it('creates an assessment with a 5-digit filing code, dates and the subject name', async () => {
    const { teacher, subject } = await teacherWithSubject('Mathematics');

    const a = await must(teacher.client.rpc('create_subject_assessment', quiz(subject.id)).single<Record<string, unknown>>());

    expect(a.assessment_code).toMatch(/^[0-9]{5}$/);
    expect(a).toMatchObject({ subject_id: subject.id, subject: 'Mathematics', title: 'Math Quiz 4', total_score: 30, due_date: '2026-10-09' });
  });

  it('refuses a due date before the assessment date', async () => {
    const { teacher, subject } = await teacherWithSubject();

    const { error } = await teacher.client.rpc('create_subject_assessment', quiz(subject.id, { p_due_date: '2026-10-01' }));

    expect(error?.message).toBe('The due date cannot be before the assessment date.');
  });

  it('refuses teachers who do not teach the section', async () => {
    const { subject } = await teacherWithSubject();
    const other = await newAccount('TEACHER');

    const { error } = await other.client.rpc('create_subject_assessment', quiz(subject.id));

    expect(error?.message).toBe('Only teachers of this section can do that.');
  });

  it('lets members, but not outsiders, read the section’s assessments', async () => {
    const { teacher, section, subject } = await teacherWithSubject();
    const a = await must(teacher.client.rpc('create_subject_assessment', quiz(subject.id)).single<Assessment>());
    const member = await newAccount('STUDENT');
    const outsider = await newAccount('STUDENT');
    await must(member.client.rpc('join_class', { p_join_code: section.join_code }));

    expect(await must(member.client.from('assessments').select('id').eq('id', a.id))).toEqual([{ id: a.id }]);
    expect(await must(outsider.client.from('assessments').select('id').eq('id', a.id))).toEqual([]);
  });
});

describe('filing code lookup is scoped to the section', () => {
  it('finds a section assessment for members and their parents, not for outsiders', async () => {
    const { teacher, section, subject } = await teacherWithSubject();
    const a = await must(teacher.client.rpc('create_subject_assessment', quiz(subject.id)).single<Assessment>());
    const member = await newAccount('STUDENT');
    const outsider = await newAccount('STUDENT');
    const parent = await newAccount('PARENT');
    await must(member.client.rpc('join_class', { p_join_code: section.join_code }));
    const linkCode = (await must(member.client.rpc('ensure_my_student_profile').single<{ link_code: string }>())).link_code;
    await must(parent.client.rpc('link_student_by_code', { p_link_code: linkCode }));

    const find = (who: { client: typeof member.client }) => must(who.client.rpc('find_assessments_by_codes', { p_codes: [a.assessment_code] }));

    expect(await find(member)).toHaveLength(1);
    expect(await find(parent)).toHaveLength(1);
    expect(await find(outsider)).toHaveLength(0);
  });

  it('still finds older assessments that belong to no section', async () => {
    const student = await signInAs('student');

    const found = await must(student.rpc('find_assessments_by_codes', { p_codes: ['55922'] }));

    expect(found).toHaveLength(1);
  });

  it('refuses evidence for a section assessment from a student outside the section', async () => {
    const { teacher, subject } = await teacherWithSubject();
    const a = await must(teacher.client.rpc('create_subject_assessment', quiz(subject.id)).single<Assessment>());
    const outsider = await newAccount('STUDENT');

    await expect(submitEvidence(outsider, a, outsider.studentProfileId!, 20)).rejects.toThrow('This student is not in that section.');
  });
});

describe('teacher access to submissions', () => {
  it('lets the section teacher read a member’s evidence and open its photo; other teachers cannot', async () => {
    const { teacher, section, subject } = await teacherWithSubject();
    const a = await must(teacher.client.rpc('create_subject_assessment', quiz(subject.id)).single<Assessment>());
    const student = await newAccount('STUDENT');
    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
    const evidenceId = await submitEvidence(student, a, student.studentProfileId!, 22);
    const other = await newAccount('TEACHER');

    const row = await must(teacher.client.from('evidence').select('id, image_path').eq('id', evidenceId).single<{ id: string; image_path: string }>());
    const photo = await teacher.client.storage.from('evidence').createSignedUrl(row.image_path, 60);
    const otherRows = await must(other.client.from('evidence').select('id').eq('id', evidenceId));
    const otherPhoto = await other.client.storage.from('evidence').createSignedUrl(row.image_path, 60);

    expect(photo.data?.signedUrl).toBeTruthy();
    expect(otherRows).toEqual([]);
    expect(otherPhoto.data?.signedUrl).toBeFalsy();
  });
});
