import { homeFor } from '../roles';

const profile = (role: 'STUDENT' | 'PARENT' | 'TEACHER' | null, setupComplete: boolean) => ({ fullName: 'Ana', role, setupComplete });

describe('homeFor', () => {
  it('sends signed-out users to onboarding', () => {
    expect(homeFor(false, null)).toBe('/welcome');
    expect(homeFor(false, profile('TEACHER', true))).toBe('/welcome');
  });

  it('sends signed-in users without a finished setup to role selection', () => {
    expect(homeFor(true, null)).toBe('/setup/role');
    expect(homeFor(true, profile(null, false))).toBe('/setup/role');
    expect(homeFor(true, profile('STUDENT', false))).toBe('/setup/role');
    expect(homeFor(true, profile(null, true))).toBe('/setup/role');
  });

  it("sends set-up users to their own role's dashboard", () => {
    expect(homeFor(true, profile('STUDENT', true))).toBe('/student');
    expect(homeFor(true, profile('PARENT', true))).toBe('/parent');
    expect(homeFor(true, profile('TEACHER', true))).toBe('/teacher');
  });
});
