import { z } from 'zod';

export const ROLES = ['STUDENT', 'PARENT', 'TEACHER'] as const;
export type Role = (typeof ROLES)[number];

export const PASSWORD_RULE = 'At least 8 characters, with a letter and a number.';

const email = z
  .string()
  .trim()
  .min(1, { error: 'Enter your email.' })
  .pipe(z.email({ error: 'Enter a valid email address.' }));

const password = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters.' })
  .max(72, { error: 'Password must be 72 characters or fewer.' })
  .regex(/[A-Za-z]/, { error: 'Password needs at least one letter.' })
  .regex(/[0-9]/, { error: 'Password needs at least one number.' });

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: 'Enter your full name.' })
      .max(120, { error: 'Name is too long.' }),
    email,
    password,
    confirmPassword: z.string().min(1, { error: 'Confirm your password.' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match.',
  });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password: z.string().min(1, { error: 'Enter your password.' }),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const emailOnlySchema = z.object({ email });

export const joinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, { error: 'Codes are 6 letters and numbers.' });

export const profileRowSchema = z
  .object({
    full_name: z.string().nullable(),
    role: z.enum(ROLES).nullable(),
    setup_completed_at: z.string().nullable(),
  })
  .transform((row) => ({
    fullName: row.full_name,
    role: row.role,
    setupComplete: row.setup_completed_at !== null,
  }));
export type Profile = z.output<typeof profileRowSchema>;

/** First error message per field, for showing under inputs. */
export function fieldErrors<K extends string>(error: z.ZodError): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as K | undefined;
    if (key !== undefined && out[key] === undefined) out[key] = issue.message;
  }
  return out;
}
