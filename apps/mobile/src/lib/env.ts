import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  EXPO_PUBLIC_API_URL: z.url().optional(),
});

// EXPO_PUBLIC_* values are inlined at build time, so they must be referenced explicitly.
const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || undefined,
});

export const envError: string | null = parsed.success
  ? null
  : 'Supabase is not configured. Copy .env.example to .env.local and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';

export const env = parsed.success
  ? parsed.data
  : {
      EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'missing-key-placeholder',
      EXPO_PUBLIC_API_URL: undefined,
    };
