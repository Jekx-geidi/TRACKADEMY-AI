import { defineConfig } from 'vitest/config';

// Database tests: run the RLS policies and SECURITY DEFINER functions against the local
// Supabase (`supabase start`). Kept apart from the unit tests because they need it running.
export default defineConfig({
  test: {
    include: ['db-tests/**/*.test.ts'],
    globalSetup: ['db-tests/setup.ts'],
    environment: 'node',
    // Tests share one database and the seeded demo accounts, so files run one at a time.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
