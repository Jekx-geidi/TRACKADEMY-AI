import { scoreSchema, type EvidenceRecord } from '../schema';
import { formatScore, isPending, isWithinDays, needsAttention, summarizeBySubject } from '../summary';

function record(subject: string, score: number | null, total = 20, overrides: Partial<EvidenceRecord> = {}): EvidenceRecord {
  return {
    id: `${subject}-${score}`,
    status: 'CODE_MATCHED',
    score,
    codeSource: 'OCR',
    uploadedAt: '2026-10-01T00:00:00Z',
    studentProfileId: '00000000-0000-4000-8000-000000000009',
    studentName: null,
    assessment: { id: 'a', code: '55922', subject, title: 'Quiz', assessmentType: 'QUIZ', quarter: 'FIRST_QUARTER', totalScore: total },
    ...overrides,
  };
}

describe('summarizeBySubject', () => {
  it('averages score / total per subject, most papers first', () => {
    const result = summarizeBySubject([record('Math', 20), record('Math', 10), record('Science', 15, 30)]);
    expect(result).toEqual([
      { subject: 'Math', papers: 2, average: 0.75 },
      { subject: 'Science', papers: 1, average: 0.5 },
    ]);
  });

  it('counts papers without a score but leaves them out of the average', () => {
    expect(summarizeBySubject([record('Math', null)])).toEqual([{ subject: 'Math', papers: 1, average: null }]);
  });
});

describe('record helpers', () => {
  it('formats scores against the total', () => {
    expect(formatScore(record('Math', 18))).toBe('18/20');
    expect(formatScore(record('Math', 18.5))).toBe('18.5/20');
    expect(formatScore(record('Math', null))).toBe('—');
  });

  it('flags low scores and teacher-flagged papers', () => {
    expect(needsAttention(record('Math', 14))).toBe(true);
    expect(needsAttention(record('Math', 15))).toBe(false);
    expect(needsAttention(record('Math', 20, 20, { status: 'REJECTED' }))).toBe(true);
  });

  it('treats uploaded / matched / needs-review papers as pending', () => {
    expect(isPending(record('Math', 1))).toBe(true);
    expect(isPending(record('Math', 1, 20, { status: 'TEACHER_VERIFIED' }))).toBe(false);
  });

  it('knows whether a paper is recent', () => {
    const now = new Date('2026-10-05T00:00:00Z').getTime();
    expect(isWithinDays(record('Math', 1), 7, now)).toBe(true);
    expect(isWithinDays(record('Math', 1), 3, now)).toBe(false);
  });
});

describe('scoreSchema', () => {
  const schema = scoreSchema(20);
  it('accepts 0..total with up to 2 decimals', () => {
    expect(schema.parse('0')).toBe(0);
    expect(schema.parse(' 18.5 ')).toBe(18.5);
    expect(schema.parse('20')).toBe(20);
  });
  it('rejects empty, over-total and malformed scores', () => {
    expect(schema.safeParse('').success).toBe(false);
    expect(schema.safeParse('21').success).toBe(false);
    expect(schema.safeParse('18.555').success).toBe(false);
    expect(schema.safeParse('1.2.3').success).toBe(false);
  });
});
