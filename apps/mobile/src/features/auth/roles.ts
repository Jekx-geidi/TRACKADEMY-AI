import type { Profile, Role } from './schema';

export const ROLE_HOME = { STUDENT: '/student', PARENT: '/parent', TEACHER: '/teacher' } as const satisfies Record<Role, string>;

export const ROLE_LABELS: Record<Role, string> = { STUDENT: 'Student', PARENT: 'Parent / Guardian', TEACHER: 'Teacher' };

export type AppHref = '/welcome' | '/setup/role' | (typeof ROLE_HOME)[Role];

/** Where a user belongs: auth, account setup, or their own role's dashboard. */
export function homeFor(signedIn: boolean, profile: Profile | null): AppHref {
  if (!signedIn) return '/welcome';
  if (!profile?.setupComplete || !profile.role) return '/setup/role';
  return ROLE_HOME[profile.role];
}
