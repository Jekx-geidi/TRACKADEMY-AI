import { describe, expect, it } from 'vitest';

import { must, newAccount, ok, rows, submitEvidence, teacherWithSubject, TINY_JPEG, type Account } from './clients';

type Assessment = { id: string; assessment_code: string };

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

async function quiz(teacher: Account, subjectId: string, title: string, dueDate: string | null = null, assessmentDate: string | null = null) {
  return must(
    teacher.client
      .rpc('create_subject_assessment', {
        p_subject_id: subjectId,
        p_assessment_type: 'QUIZ',
        p_title: title,
        p_quarter: 'FIRST_QUARTER',
        p_total_score: 30,
        p_assessment_date: assessmentDate,
        p_due_date: dueDate,
      })
      .single<Assessment>(),
  );
}

/** A section with one joined student and one assessment in each work state. */
async function classWithWork() {
  const { teacher, section, subject } = await teacherWithSubject();
  const student = await newAccount('STUDENT', 'Jake Engaña');
  await must(student.client.rpc('join_class', { p_join_code: section.join_code }));

  const verified = await quiz(teacher, subject.id, 'Quiz Verified');
  const pending = await quiz(teacher, subject.id, 'Quiz Pending');
  const rejected = await quiz(teacher, subject.id, 'Quiz Rejected');
  const missing = await quiz(teacher, subject.id, 'Quiz Missing', day(3));
  const overdue = await quiz(teacher, subject.id, 'Quiz Overdue', day(-2), day(-5));
  const exempt = await quiz(teacher, subject.id, 'Quiz Exempt');

  const verifiedId = await submitEvidence(student, verified, student.studentProfileId!, 22);
  await ok(teacher.client.rpc('verify_evidence', { p_evidence_id: verifiedId }));
  const pendingId = await submitEvidence(student, pending, student.studentProfileId!, 18);
  const rejectedId = await submitEvidence(student, rejected, student.studentProfileId!, 10);
  await ok(teacher.client.rpc('reject_evidence', { p_evidence_id: rejectedId, p_reason: 'The score is not readable.' }));
  await ok(teacher.client.rpc('set_exemption', { p_assessment_id: exempt.id, p_student_profile_id: student.studentProfileId, p_exempt: true, p_reason: 'Sick' }));

  return { teacher, section, subject, student, verified, pending, rejected, missing, overdue, exempt, verifiedId, pendingId, rejectedId };
}

type WorkRow = { title: string; work_status: string; score: number | null; total_count: number; evidence_id: string | null; class_name: string };

const work = (who: Account, args: Record<string, unknown> = {}) => rows<WorkRow>(who.client.rpc('student_work', args));

describe('student_work', () => {
  it('gives every assessment in my sections a student-facing status', async () => {
    const { student } = await classWithWork();

    const all = await work(student);
    const byTitle = Object.fromEntries(all.map((r) => [r.title, r.work_status]));

    expect(byTitle).toEqual({
      'Quiz Verified': 'VERIFIED',
      'Quiz Pending': 'PENDING',
      'Quiz Rejected': 'NEEDS_RESUBMISSION',
      'Quiz Missing': 'MISSING',
      'Quiz Overdue': 'OVERDUE',
      'Quiz Exempt': 'EXEMPT',
    });
    expect(all.find((r) => r.title === 'Quiz Verified')).toMatchObject({ score: 22, class_name: expect.stringMatching(/^Grade 7 - Mango/) });
  });

  it('filters lacking work (missing, overdue, resubmit), soonest due first', async () => {
    const { student } = await classWithWork();

    const lacking = await work(student, { p_status: 'LACKING' });

    expect(lacking.map((r) => r.title)).toEqual(['Quiz Overdue', 'Quiz Missing', 'Quiz Rejected']);
    expect(lacking[0]?.total_count).toBe(3);
  });

  it('filters submitted work and pages it', async () => {
    const { student } = await classWithWork();

    const first = await work(student, { p_status: 'SUBMITTED', p_limit: 1 });
    const second = await work(student, { p_status: 'SUBMITTED', p_limit: 1, p_offset: 1 });

    expect(first).toHaveLength(1);
    expect(first[0]?.total_count).toBe(2);
    expect(new Set([first[0]?.title, second[0]?.title])).toEqual(new Set(['Quiz Verified', 'Quiz Pending']));
  });

  it('a resubmission replaces the rejected paper', async () => {
    const { student, rejected } = await classWithWork();

    await submitEvidence(student, rejected, student.studentProfileId!, 12);
    const [row] = await work(student, { p_search: 'Rejected' });

    expect(row).toMatchObject({ work_status: 'PENDING', score: 12 });
  });

  it('lets a linked parent read the child’s work, and nobody else', async () => {
    const { student, section } = await classWithWork();
    const parent = await newAccount('PARENT');
    const { data: me } = await student.client.from('student_profiles').select('link_code').eq('id', student.studentProfileId!).single<{ link_code: string }>();
    await must(parent.client.rpc('link_student_by_code', { p_link_code: me!.link_code }));
    const classmate = await newAccount('STUDENT');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));

    const forParent = await work(parent, { p_student_profile_id: student.studentProfileId });
    const { error } = await classmate.client.rpc('student_work', { p_student_profile_id: student.studentProfileId });

    expect(forParent).toHaveLength(6);
    expect(error?.message).toBe('You cannot see this student’s records.');
  });
});

describe('student_classes', () => {
  it('lists my sections with the teacher, subjects and lacking work', async () => {
    const { student, section } = await classWithWork();
    await newAccount('TEACHER'); // a teacher of nothing I joined

    const classes = await rows<Record<string, unknown>>(student.client.rpc('student_classes'));

    expect(classes).toEqual([
      expect.objectContaining({ class_id: section.id, name: section.name, teacher_name: 'Ms. Santos', subject_count: 1, lacking_count: 3, pending_count: 1, school_year: '2026-2027' }),
    ]);
  });
});

describe('student_subjects', () => {
  it('counts my records and lacking work per subject', async () => {
    const { student, section, subject, teacher } = await classWithWork();
    await must(teacher.client.rpc('create_subject', { p_class_id: section.id, p_name: 'Science' }));

    const subjects = await rows<Record<string, unknown>>(student.client.rpc('student_subjects', { p_class_id: section.id }));

    expect(subjects).toEqual([
      expect.objectContaining({ subject_id: subject.id, name: 'Mathematics', record_count: 2, lacking_count: 3, pending_count: 1, status: 'LACKING' }),
      expect.objectContaining({ name: 'Science', record_count: 0, lacking_count: 0, status: 'NO_WORK' }),
    ]);
  });

  it('refuses a section I am not in', async () => {
    const { section } = await classWithWork();
    const outsider = await newAccount('STUDENT');

    const { error } = await outsider.client.rpc('student_subjects', { p_class_id: section.id });

    expect(error?.message).toBe('You are not in that class.');
  });
});

describe('student_dashboard', () => {
  it('summarizes new scores, lacking and pending work', async () => {
    const { student } = await classWithWork();

    const summary = await must(student.client.rpc('student_dashboard').single<Record<string, unknown>>());

    expect(summary).toMatchObject({ display_name: 'Jake Engaña', grade_level: 7, new_scores: 1, missing: 1, overdue: 1, needs_resubmission: 1, pending: 1 });
  });
});

describe('class_classmates', () => {
  it('shows only names, marking me', async () => {
    const { student, section } = await classWithWork();
    const classmate = await newAccount('STUDENT', 'Maria Santos');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));

    const members = await rows<Record<string, unknown>>(student.client.rpc('class_classmates', { p_class_id: section.id }));

    expect(members).toEqual([
      { display_name: 'Jake Engaña', is_me: true },
      { display_name: 'Maria Santos', is_me: false },
    ]);
  });

  it('is empty when the teacher hides classmates, and refused outside the class', async () => {
    const { student, section, teacher } = await classWithWork();
    const outsider = await newAccount('STUDENT');
    await ok(teacher.client.rpc('set_classmates_visible', { p_class_id: section.id, p_visible: false }));

    const hidden = await rows(student.client.rpc('class_classmates', { p_class_id: section.id }));
    const { error } = await outsider.client.rpc('class_classmates', { p_class_id: section.id });

    expect(hidden).toEqual([]);
    expect(error?.message).toBe('You are not in that class.');
  });
});

describe('student_record', () => {
  it('shows my record with its subject, teacher and the teacher’s note', async () => {
    const { student, rejectedId, subject } = await classWithWork();

    const record = await must(student.client.rpc('student_record', { p_evidence_id: rejectedId }).single<Record<string, unknown>>());

    expect(record).toMatchObject({
      title: 'Quiz Rejected',
      subject_name: subject.name,
      teacher_name: 'Ms. Santos',
      work_status: 'NEEDS_RESUBMISSION',
      teacher_note: 'The score is not readable.',
      score: 10,
      total_score: 30,
    });
  });

  it('refuses a classmate', async () => {
    const { section, rejectedId } = await classWithWork();
    const classmate = await newAccount('STUDENT');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));

    const { error } = await classmate.client.rpc('student_record', { p_evidence_id: rejectedId });

    expect(error?.message).toBe('You cannot see this student’s records.');
  });
});

describe('evidence photos for the family', () => {
  it('lets the student open a photo their parent uploaded; classmates cannot', async () => {
    const { teacher, subject, section, student } = await classWithWork();
    const parent = await newAccount('PARENT');
    const { data: me } = await student.client.from('student_profiles').select('link_code').eq('id', student.studentProfileId!).single<{ link_code: string }>();
    await must(parent.client.rpc('link_student_by_code', { p_link_code: me!.link_code }));
    const extra = await quiz(teacher, subject.id, 'Parent Upload');
    const evidenceId = await submitEvidence(parent, extra, student.studentProfileId!, 25);
    const path = `${parent.userId}/assessment/${extra.id}/${evidenceId}.jpg`;
    const classmate = await newAccount('STUDENT');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));

    const mine = await student.client.storage.from('evidence').download(path);
    const theirs = await classmate.client.storage.from('evidence').download(path);

    expect(mine.error).toBeNull();
    expect(mine.data?.size).toBe(TINY_JPEG.length);
    expect(theirs.data).toBeNull();
  });
});

describe('leave_class', () => {
  it('ends my membership and tells the teacher', async () => {
    const { student, section, teacher } = await classWithWork();

    await ok(student.client.rpc('leave_class', { p_class_id: section.id }));
    const classes = await rows(student.client.rpc('student_classes'));
    const [note] = await rows<{ title: string }>(teacher.client.from('notifications').select('title').eq('type', 'STUDENT_LEFT'));
    const rejoin = await student.client.rpc('join_class', { p_join_code: section.join_code });

    expect(classes).toEqual([]);
    expect(note?.title).toBe(`Jake Engaña left ${section.name}`);
    expect(rejoin.error).toBeNull();
  });

  it('refuses a class I am not in', async () => {
    const { section } = await classWithWork();
    const outsider = await newAccount('STUDENT');

    const { error } = await outsider.client.rpc('leave_class', { p_class_id: section.id });

    expect(error?.message).toBe('You are not in that class.');
  });
});

describe('student notifications', () => {
  it('tells active students about a new assessment', async () => {
    const { teacher, subject, section } = await teacherWithSubject();
    const student = await newAccount('STUDENT');
    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));

    const created = await quiz(teacher, subject.id, 'Math Quiz 5', '2026-12-04');
    const [note] = await rows<Record<string, unknown>>(
      student.client.from('notifications').select('title, body, assessment_id, class_id').eq('type', 'ASSESSMENT_CREATED'),
    );
    const teacherCopy = await rows(teacher.client.from('notifications').select('id').eq('type', 'ASSESSMENT_CREATED'));

    expect(note).toEqual({ title: 'New quiz: Math Quiz 5', body: 'Mathematics · Due Dec 4 · Code ' + created.assessment_code, assessment_id: created.id, class_id: section.id });
    expect(teacherCopy).toEqual([]);
  });

  it('confirms to the student that they joined', async () => {
    const { section } = await teacherWithSubject();
    const student = await newAccount('STUDENT');

    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
    const [note] = await rows<{ title: string }>(student.client.from('notifications').select('title').eq('type', 'CLASS_JOINED'));

    expect(note?.title).toBe(`You joined ${section.name}`);
  });
});

describe('guardians', () => {
  it('lists my linked guardians and lets me replace my link code', async () => {
    const student = await newAccount('STUDENT');
    const parent = await newAccount('PARENT', 'Rosa Engaña');
    const { data: me } = await student.client.from('student_profiles').select('link_code').eq('id', student.studentProfileId!).single<{ link_code: string }>();
    await must(parent.client.rpc('link_student_by_code', { p_link_code: me!.link_code }));

    const guardians = await rows<Record<string, unknown>>(student.client.rpc('my_guardians'));
    const fresh = await must(student.client.rpc('new_my_link_code'));
    const oldCode = await (await newAccount('PARENT')).client.rpc('link_student_by_code', { p_link_code: me!.link_code });

    expect(guardians).toEqual([expect.objectContaining({ display_name: 'Rosa Engaña' })]);
    expect(fresh).toMatch(/^[A-Z2-9]{6}$/);
    expect(fresh).not.toBe(me!.link_code);
    expect(oldCode.error?.message).toMatch(/No student has that code/);
  });
});
