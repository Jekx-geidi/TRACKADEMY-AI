import { assessmentCodeSchema, createAssessmentInputSchema } from '../schema';

describe('assessmentCodeSchema', () => {
  it.each(['55922', '00001'])('accepts %s', (code) => {
    expect(assessmentCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each(['5592', '559221', '55a22', ' 55922', ''])('rejects %j', (code) => {
    expect(assessmentCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe('createAssessmentInputSchema', () => {
  const valid = {
    subject: 'Mathematics',
    title: 'Fractions Quiz',
    assessmentType: 'QUIZ',
    quarter: 'FIRST_QUARTER',
    totalScore: '20',
  };

  it('accepts a valid assessment and coerces the total score', () => {
    const result = createAssessmentInputSchema.parse(valid);
    expect(result.totalScore).toBe(20);
  });

  it.each(['0', '-5', '2.5', 'abc', '1001'])('rejects total score %j', (totalScore) => {
    expect(createAssessmentInputSchema.safeParse({ ...valid, totalScore }).success).toBe(false);
  });

  it('rejects blank subject and title', () => {
    expect(createAssessmentInputSchema.safeParse({ ...valid, subject: '   ' }).success).toBe(false);
    expect(createAssessmentInputSchema.safeParse({ ...valid, title: '' }).success).toBe(false);
  });

  it('rejects unknown types and quarters', () => {
    expect(createAssessmentInputSchema.safeParse({ ...valid, assessmentType: 'ESSAY' }).success).toBe(false);
    expect(createAssessmentInputSchema.safeParse({ ...valid, quarter: 'Q5' }).success).toBe(false);
  });
});
