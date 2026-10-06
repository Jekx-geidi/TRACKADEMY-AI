import { extractCodeCandidates, mergeCandidates } from '../codeCandidates';

describe('extractCodeCandidates', () => {
  it('finds a clean 5-digit code', () => {
    expect(extractCodeCandidates('55922')).toEqual(['55922']);
  });

  it('finds a code among other text', () => {
    expect(extractCodeCandidates('Name: Jake\nCode 55922\nScore 18/20')).toEqual(['55922']);
  });

  it('ignores numbers that are not exactly 5 digits', () => {
    expect(extractCodeCandidates('1234 123456 18/20 2026')).toEqual([]);
  });

  it('joins digits split by spaces', () => {
    expect(extractCodeCandidates('5 5 9 2 2')).toEqual(['55922']);
    expect(extractCodeCandidates('55 922')).toEqual(['55922']);
  });

  it('repairs letters commonly misread as digits', () => {
    expect(extractCodeCandidates('S5922')).toEqual(['55922']);
    expect(extractCodeCandidates('7O264')).toEqual(['70264']);
    expect(extractCodeCandidates('48I17')).toEqual(['48117']);
  });

  it('does not turn ordinary words into codes', () => {
    expect(extractCodeCandidates('Solid Blocks Quiz')).toEqual([]);
  });

  it('returns every distinct candidate when several numbers are present', () => {
    expect(extractCodeCandidates('55922\n48317\n55922')).toEqual(['55922', '48317']);
  });

  it('returns nothing for empty text', () => {
    expect(extractCodeCandidates('')).toEqual([]);
  });

  it('caps the number of candidates', () => {
    const text = Array.from({ length: 15 }, (_, i) => String(10000 + i)).join('\n');
    expect(extractCodeCandidates(text)).toHaveLength(10);
  });
});

describe('mergeCandidates', () => {
  it('keeps priority order and removes duplicates', () => {
    expect(mergeCandidates([['55922'], ['48317', '55922']])).toEqual(['55922', '48317']);
  });
});
