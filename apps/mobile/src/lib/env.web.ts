import { z } from 'zod';

// Vite build of lib/env.ts. VITE_* is preferred; EXPO_PUBLIC_* still works so an existing
// .env.local keeps running. Same export shape as the Expo version, so callers don't change.
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  EXPO_PUBLIC_API_URL: z.url().optional(),
});

const vars = import.meta.env;
const parsed = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: vars.VITE_SUPABASE_URL || vars.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_API_URL: vars.VITE_API_URL || vars.EXPO_PUBLIC_API_URL || undefined,
});

export const envError: string | null = parsed.success
  ? null
  : 'Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.';

export const env = parsed.success
  ? parsed.data
  : {
      EXPO_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'missing-key-placeholder',
      EXPO_PUBLIC_API_URL: undefined,
    };
