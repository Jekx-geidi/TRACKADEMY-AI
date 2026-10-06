import { describe, expect, it } from 'vitest';

import { must, newAccount, ok, submitEvidence, teacherWithSubject, type Account } from './clients';

type Assessment = { id: string; assessment_code: string };
type Note = { id: string; type: string; title: string; body: string | null; read_at: string | null; archived_at: string | null };

const inbox = (who: Account) =>
  must(who.client.from('notifications').select('id, type, title, body, read_at, archived_at').order('created_at', { ascending: true }).returns<Note[]>());

/** A section with a quiz, a member student "Jake" and Jake's linked parent. */
async function family() {
  const { teacher, section, subject } = await teacherWithSubject();
  const assessment = await must(
    teacher.client
      .rpc('create_subject_assessment', { p_subject_id: subject.id, p_assessment_type: 'QUIZ', p_title: 'Math Quiz 4', p_quarter: 'FIRST_QUARTER', p_total_score: 30 })
      .single<Assessment>(),
  );
  const student = await newAccount('STUDENT', 'Jake Engaña');
  await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
  const parent = await newAccount('PARENT', 'Maria Engaña');
  const { link_code } = await must(student.client.rpc('ensure_my_student_profile').single<{ link_code: string }>());
  await must(parent.client.rpc('link_student_by_code', { p_link_code: link_code }));
  return { teacher, section, subject, assessment, student, parent };
}

describe('notifications for a submission', () => {
  it('tells the teacher, the student and the parent; nobody else', async () => {
    const { teacher, assessment, student, parent } = await family();
    const outsider = await newAccount('STUDENT');

    await submitEvidence(student, assessment, student.studentProfileId!, 22);

    expect((await inbox(teacher)).filter((n) => n.type === 'SUBMISSION_CREATED')).toEqual([
      expect.objectContaining({ title: 'Jake Engaña submitted Math Quiz 4', body: '22/30 · Awaiting verification' }),
    ]);
    // The student also has "You joined …" (and "New quiz …" when they joined first).
    expect((await inbox(student)).filter((n) => n.type === 'SUBMISSION_CREATED')).toEqual([
      expect.objectContaining({ type: 'SUBMISSION_CREATED', title: 'Your Math Quiz 4 was recorded' }),
    ]);
    expect(await inbox(parent)).toEqual([
      expect.objectContaining({ type: 'SUBMISSION_CREATED', title: `Jake Engaña submitted Math Quiz 4 - ${assessment.assessment_code}` }),
    ]);
    expect(await inbox(outsider)).toEqual([]);
  });

  it('tells the student and parent when the teacher verifies, with the score', async () => {
    const { teacher, assessment, student, parent } = await family();
    const evidenceId = await submitEvidence(student, assessment, student.studentProfileId!, 22);

    await ok(teacher.client.rpc('verify_evidence', { p_evidence_id: evidenceId }));

    const verified = (n: Note) => n.type === 'SUBMISSION_VERIFIED';
    expect((await inbox(parent)).filter(verified)).toEqual([
      expect.objectContaining({ title: "Jake Engaña's Math Quiz 4 was verified by Ms. Santos", body: 'Score: 22/30' }),
    ]);
    expect((await inbox(student)).filter(verified)).toHaveLength(1);
  });

  it('tells the student and parent why a paper was rejected', async () => {
    const { teacher, assessment, student, parent } = await family();
    const evidenceId = await submitEvidence(student, assessment, student.studentProfileId!, 22);

    await ok(teacher.client.rpc('reject_evidence', { p_evidence_id: evidenceId, p_reason: 'The score is not readable.' }));

    expect((await inbox(parent)).filter((n) => n.type === 'SUBMISSION_REJECTED')).toEqual([
      expect.objectContaining({ body: 'The score is not readable.' }),
    ]);
    expect((await inbox(student)).filter((n) => n.type === 'SUBMISSION_REJECTED')).toHaveLength(1);
  });
});

describe('student joined', () => {
  it('tells the section teachers', async () => {
    const { teacher, section } = await teacherWithSubject();
    const student = await newAccount('STUDENT', 'Maria Santos');

    await must(student.client.rpc('join_class', { p_join_code: section.join_code }));

    expect((await inbox(teacher)).filter((n) => n.type === 'STUDENT_JOINED')).toEqual([expect.objectContaining({ title: `Maria Santos joined ${section.name}` })]);
  });
});

describe('send_reminder', () => {
  it('reaches every active student in the section and their parents', async () => {
    const { teacher, section, student, parent } = await family();
    const classmate = await newAccount('STUDENT');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));
    const outsider = await newAccount('STUDENT');

    const sent = await must(teacher.client.rpc('send_reminder', { p_class_id: section.id, p_message: 'Math Project is due Friday.' }).single<{ recipients: number }>());

    expect(sent.recipients).toBe(2);
    for (const who of [student, classmate, parent]) {
      expect((await inbox(who)).filter((n) => n.type === 'TEACHER_REMINDER')).toEqual([expect.objectContaining({ body: 'Math Project is due Friday.' })]);
    }
    expect(await inbox(outsider)).toEqual([]);
  });

  it('can target selected students only', async () => {
    const { teacher, section, student } = await family();
    const classmate = await newAccount('STUDENT');
    await must(classmate.client.rpc('join_class', { p_join_code: section.join_code }));

    await ok(teacher.client.rpc('send_reminder', { p_class_id: section.id, p_message: 'Please resubmit.', p_student_profile_ids: [student.studentProfileId] }));

    expect((await inbox(student)).filter((n) => n.type === 'TEACHER_REMINDER')).toHaveLength(1);
    expect((await inbox(classmate)).filter((n) => n.type === 'TEACHER_REMINDER')).toHaveLength(0);
  });

  it('refuses students who are not in the section', async () => {
    const { teacher, section } = await family();
    const outsider = await newAccount('STUDENT');

    const { error } = await teacher.client.rpc('send_reminder', { p_class_id: section.id, p_message: 'Hi', p_student_profile_ids: [outsider.studentProfileId] });

    expect(error?.message).toBe('This student is not in that section.');
  });
});

describe('send_report', () => {
  it('goes to the parent, and to the student only when shared with them', async () => {
    const { teacher, section, student, parent } = await family();

    await ok(
      teacher.client.rpc('send_report', {
        p_class_id: section.id,
        p_student_profile_id: student.studentProfileId,
        p_category: 'GOOD_PROGRESS',
        p_message: 'Jake is improving in fractions.',
        p_visible_to_student: false,
      }),
    );

    expect((await inbox(parent)).filter((n) => n.type === 'TEACHER_REPORT')).toEqual([expect.objectContaining({ body: 'Jake is improving in fractions.' })]);
    expect((await inbox(student)).filter((n) => n.type === 'TEACHER_REPORT')).toEqual([]);
    expect(await must(parent.client.from('teacher_reports').select('category, message'))).toEqual([{ category: 'GOOD_PROGRESS', message: 'Jake is improving in fractions.' }]);
    expect(await must(student.client.from('teacher_reports').select('id'))).toEqual([]);
  });
});

describe('reading notifications', () => {
  it('marks your own as read and archives them; never anyone else’s', async () => {
    const { teacher, assessment, student, parent } = await family();
    await submitEvidence(student, assessment, student.studentProfileId!, 22);

    await ok(student.client.rpc('mark_notifications_read', { p_ids: null }));
    const studentNotes = await inbox(student);
    const [parentNote] = await inbox(parent);
    const mine = await must(student.client.from('notifications').select('id').limit(1).single<{ id: string }>());
    await ok(student.client.rpc('archive_notification', { p_id: mine.id }));

    expect(studentNotes.length).toBeGreaterThan(0);
    expect(studentNotes.every((n) => n.read_at !== null)).toBe(true);
    expect(parentNote?.read_at).toBeNull();
    expect((await inbox(student)).find((n) => n.id === mine.id)).toMatchObject({ archived_at: expect.any(String) });
    expect(await must(teacher.client.from('notifications').select('id').eq('user_id', student.userId))).toEqual([]);
  });
});
