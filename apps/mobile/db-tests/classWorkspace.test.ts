import { describe, expect, it } from 'vitest';

import { newAccount, signInAs } from './clients';

// Fresh accounts, so these tests never add sections or memberships to the demo accounts.
const teacherAccount = async () => (await newAccount('TEACHER')).client;
const studentAccount = async () => (await newAccount('STUDENT')).client;

const workspace = {
  p_grade_level: 7,
  p_section: 'St. Mark',
  p_school_year: '2026-2027',
  p_school_name: 'Sample National High School',
  p_adviser_name: 'Ms. Santos',
};

describe('create_class_workspace', () => {
  it('creates a workspace named from grade and section, with a 6-digit join code', async () => {
    const teacher = await teacherAccount();

    const { data, error } = await teacher.rpc('create_class_workspace', workspace).single<Record<string, unknown>>();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      name: 'Grade 7 - St. Mark',
      grade_level: 7,
      section: 'St. Mark',
      school_year: '2026-2027',
      school_name: 'Sample National High School',
      adviser_name: 'Ms. Santos',
    });
    expect(data?.join_code).toMatch(/^[0-9]{6}$/);
  });

  it('makes the teacher a member, so they can read the new class', async () => {
    const teacher = await teacherAccount();
    const { data: created } = await teacher.rpc('create_class_workspace', workspace).single<{ id: string }>();

    const { data } = await teacher.from('classes').select('id, grade_level, section, school_year').eq('id', created!.id).single();

    expect(data).toEqual({ id: created!.id, grade_level: 7, section: 'St. Mark', school_year: '2026-2027' });
  });

  it('gives every workspace a different join code', async () => {
    const teacher = await teacherAccount();
    const codes = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const { data } = await teacher.rpc('create_class_workspace', workspace).single<{ join_code: string }>();
      codes.add(data!.join_code);
    }
    expect(codes.size).toBe(5);
  });

  it('trims the text fields and leaves optional fields empty when blank', async () => {
    const teacher = await teacherAccount();

    const { data } = await teacher
      .rpc('create_class_workspace', { ...workspace, p_section: '  Sampaguita  ', p_school_name: '  ', p_adviser_name: null })
      .single<Record<string, unknown>>();

    expect(data).toMatchObject({ name: 'Grade 7 - Sampaguita', section: 'Sampaguita', school_name: null, adviser_name: null });
  });

  it.each([
    ['grade below 1', { p_grade_level: 0 }, 'Grade level must be from 1 to 10.'],
    ['grade above 10', { p_grade_level: 11 }, 'Grade level must be from 1 to 10.'],
    ['blank section', { p_section: '   ' }, 'Enter a section of 1 to 60 characters.'],
    ['school year in the wrong format', { p_school_year: '2026' }, 'School year must look like 2026-2027.'],
    ['school year that is not two consecutive years', { p_school_year: '2026-2028' }, 'School year must look like 2026-2027.'],
  ])('rejects a %s', async (_case, change, message) => {
    const teacher = await teacherAccount();

    const { error } = await teacher.rpc('create_class_workspace', { ...workspace, ...change });

    expect(error?.message).toBe(message);
  });

  it('refuses students', async () => {
    const student = await studentAccount();

    const { error } = await student.rpc('create_class_workspace', workspace);

    expect(error?.message).toMatch(/teacher/i);
  });
});

describe('joining with a class join code', () => {
  it('lets a student join a new workspace with its numeric code', async () => {
    const teacher = await teacherAccount();
    const student = await studentAccount();
    const { data: created } = await teacher.rpc('create_class_workspace', workspace).single<{ id: string; join_code: string }>();

    const { data, error } = await student.rpc('join_class', { p_join_code: created!.join_code }).single<{ id: string }>();

    expect(error).toBeNull();
    expect(data?.id).toBe(created!.id);
  });

  it('still accepts an existing letter code', async () => {
    const student = await signInAs('student');

    const { data, error } = await student.rpc('join_class', { p_join_code: 'demo55' }).single<{ name: string }>();

    expect(error).toBeNull();
    expect(data?.name).toBe('Grade 5 - Sampaguita');
  });
});
