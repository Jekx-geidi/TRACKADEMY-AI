import { z } from 'zod';

import { signUpSchema } from '@/features/auth/schema';

// Same rules as sign up, so an edited name or password is never weaker than a new one.
const signUpShape = signUpSchema.shape;

export const nameSchema = z.object({ fullName: signUpShape.fullName });

export const emailChangeSchema = z.object({ email: signUpShape.email });

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'Enter your current password.' }),
    password: signUpShape.password,
    confirmPassword: z.string().min(1, { error: 'Confirm your new password.' }),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], error: 'Passwords do not match.' })
  .refine((v) => v.password !== v.currentPassword, { path: ['password'], error: 'Choose a password you are not using now.' });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
