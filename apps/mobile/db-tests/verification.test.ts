import { describe, expect, it } from 'vitest';

import { must, newAccount, ok, submitEvidence, teacherWithSubject, type Account } from './clients';

type Assessment = { id: string; assessment_code: string };

/** A section with one 30-point quiz and one member student who has submitted 22/30. */
async function submitted() {
  const { teacher, section, subject } = await teacherWithSubject();
  const assessment = await must(
    teacher.client
      .rpc('create_subject_assessment', { p_subject_id: subject.id, p_assessment_type: 'QUIZ', p_title: 'Math Quiz 4', p_quarter: 'FIRST_QUARTER', p_total_score: 30 })
      .single<Assessment>(),
  );
  const student = await newAccount('STUDENT', 'Jake Engaña');
  await must(student.client.rpc('join_class', { p_join_code: section.join_code }));
  const evidenceId = await submitEvidence(student, assessment, student.studentProfileId!, 22);
  return { teacher, section, subject, assessment, student, evidenceId };
}

const evidenceOf = (who: Account, id: string) =>
  must(who.client.from('evidence').select('status, score, verified_by, rejection_reason').eq('id', id).single<Record<string, unknown>>());

describe('verify_evidence', () => {
  it('marks the evidence teacher-verified, recording who', async () => {
    const { teacher, student, evidenceId } = await submitted();

    await ok(teacher.client.rpc('verify_evidence', { p_evidence_id: evidenceId }));

    expect(await evidenceOf(student, evidenceId)).toMatchObject({ status: 'TEACHER_VERIFIED', verified_by: teacher.userId });
  });

  it('refuses other teachers and the student', async () => {
    const { student, evidenceId } = await submitted();
    const other = await newAccount('TEACHER');

    const byOther = await other.client.rpc('verify_evidence', { p_evidence_id: evidenceId });
    const byStudent = await student.client.rpc('verify_evidence', { p_evidence_id: evidenceId });

    expect(byOther.error?.message).toBe('Only teachers of this section can do that.');
    expect(byStudent.error?.message).toBe('Only teachers of this section can do that.');
    expect(await evidenceOf(student, evidenceId)).toMatchObject({ status: 'UPLOADED' });
  });
});

describe('reject_evidence', () => {
  it('needs a reason, and records it', async () => {
    const { teacher, student, evidenceId } = await submitted();

    const blank = await teacher.client.rpc('reject_evidence', { p_evidence_id: evidenceId, p_reason: '  ' });
    await ok(teacher.client.rpc('reject_evidence', { p_evidence_id: evidenceId, p_reason: 'The score is not readable.' }));

    expect(blank.error?.message).toBe('Give a reason so the student knows what to fix.');
    expect(await evidenceOf(student, evidenceId)).toMatchObject({ status: 'REJECTED', rejection_reason: 'The score is not readable.' });
  });
});

describe('correct_evidence_score', () => {
  it('changes the score within the total', async () => {
    const { teacher, student, evidenceId } = await submitted();

    await ok(teacher.client.rpc('correct_evidence_score', { p_evidence_id: evidenceId, p_score: 24 }));
    const tooHigh = await teacher.client.rpc('correct_evidence_score', { p_evidence_id: evidenceId, p_score: 31 });

    expect(Number((await evidenceOf(student, evidenceId)).score)).toBe(24);
    expect(tooHigh.error?.message).toBe('Score must be from 0 to 30.');
  });
});

describe('set_exemption', () => {
  it('exempts a section student, and refuses students outside the section', async () => {
    const { teacher, assessment, student } = await submitted();
    const outsider = await newAccount('STUDENT');

    await ok(teacher.client.rpc('set_exemption', { p_assessment_id: assessment.id, p_student_profile_id: student.studentProfileId, p_exempt: true }));
    const rows = await must(teacher.client.from('assessment_exemptions').select('student_profile_id').eq('assessment_id', assessment.id));
    const wrong = await teacher.client.rpc('set_exemption', { p_assessment_id: assessment.id, p_student_profile_id: outsider.studentProfileId, p_exempt: true });

    expect(rows).toEqual([{ student_profile_id: student.studentProfileId }]);
    expect(wrong.error?.message).toBe('This student is not in that section.');
  });

  it('can be undone', async () => {
    const { teacher, assessment, student } = await submitted();

    await ok(teacher.client.rpc('set_exemption', { p_assessment_id: assessment.id, p_student_profile_id: student.studentProfileId, p_exempt: true }));
    await ok(teacher.client.rpc('set_exemption', { p_assessment_id: assessment.id, p_student_profile_id: student.studentProfileId, p_exempt: false }));

    expect(await must(teacher.client.from('assessment_exemptions').select('student_profile_id').eq('assessment_id', assessment.id))).toEqual([]);
  });
});

describe('audit trail', () => {
  it('logs each evidence action for the section teacher, and hides it from the student', async () => {
    const { teacher, student, evidenceId } = await submitted();
    await ok(teacher.client.rpc('correct_evidence_score', { p_evidence_id: evidenceId, p_score: 24 }));
    await ok(teacher.client.rpc('verify_evidence', { p_evidence_id: evidenceId }));

    const log = await must(teacher.client.from('audit_logs').select('action, actor_user_id, metadata').eq('entity_id', evidenceId).order('created_at'));
    const seenByStudent = await must(student.client.from('audit_logs').select('id').eq('entity_id', evidenceId));

    expect(log.map((e) => e.action)).toEqual(['EVIDENCE_CREATED', 'SCORE_CORRECTED', 'EVIDENCE_VERIFIED']);
    expect(log[1]).toMatchObject({ actor_user_id: teacher.userId, metadata: { from: 22, to: 24 } });
    expect(seenByStudent).toEqual([]);
  });
});
