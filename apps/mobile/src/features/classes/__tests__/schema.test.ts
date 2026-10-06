import { classCodeSchema, classWorkspaceSchema, currentSchoolYear, workspaceName } from '../schema';

const valid = { gradeLevel: 7, section: 'St. Mark', schoolYear: '2026-2027', schoolName: '', adviserName: 'Ms. Santos' };

describe('classWorkspaceSchema', () => {
  it('accepts a complete workspace and drops blank optional fields', () => {
    expect(classWorkspaceSchema.parse(valid)).toEqual({
      gradeLevel: 7,
      section: 'St. Mark',
      schoolYear: '2026-2027',
      schoolName: undefined,
      adviserName: 'Ms. Santos',
    });
  });

  it('trims the section', () => {
    expect(classWorkspaceSchema.parse({ ...valid, section: '  Sampaguita ' }).section).toBe('Sampaguita');
  });

  it.each([0, 11, 7.5])('rejects grade level %s', (gradeLevel) => {
    expect(classWorkspaceSchema.safeParse({ ...valid, gradeLevel }).success).toBe(false);
  });

  it('requires a section', () => {
    const result = classWorkspaceSchema.safeParse({ ...valid, section: '  ' });
    expect(result.error?.issues[0]?.message).toBe('Enter a section.');
  });

  it.each(['2026', '2026-2028', '2027-2026', '26-27'])('rejects school year %s', (schoolYear) => {
    const result = classWorkspaceSchema.safeParse({ ...valid, schoolYear });
    expect(result.error?.issues[0]?.message).toBe('Use two consecutive years, like 2026-2027.');
  });
});

describe('workspaceName', () => {
  it('joins grade and section the way the server does', () => {
    expect(workspaceName(7, 'St. Mark')).toBe('Grade 7 - St. Mark');
  });
});

describe('classCodeSchema', () => {
  it('accepts a 6-digit code, including 0 and 1', () => {
    expect(classCodeSchema.parse('642910')).toBe('642910');
  });

  it('ignores spaces and dashes people type between digits', () => {
    expect(classCodeSchema.parse(' 642-913 ')).toBe('642913');
  });

  it('still accepts the older 6-letter codes, upper-cased', () => {
    expect(classCodeSchema.parse('demo55')).toBe('DEMO55');
  });

  it.each(['12345', '1234567', 'ABC1'])('rejects %s', (code) => {
    expect(classCodeSchema.safeParse(code).error?.issues[0]?.message).toBe('Class codes are 6 digits.');
  });
});

describe('currentSchoolYear', () => {
  it('starts a new school year in June', () => {
    expect(currentSchoolYear(new Date(2026, 5, 1))).toBe('2026-2027');
  });

  it('is still the previous school year in May', () => {
    expect(currentSchoolYear(new Date(2027, 4, 31))).toBe('2026-2027');
  });
});
