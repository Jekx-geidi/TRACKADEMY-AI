import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    supabase: { url: string; key: string };
  }
}

/**
 * Database tests run against the LOCAL Supabase only (`supabase start`). The URL comes from
 * `supabase status`, and anything that isn't localhost is refused, so these tests can never
 * write to the hosted project.
 */
export default function setup(project: TestProject) {
  const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
  let status: Record<string, string>;
  try {
    // Through the shell: on Windows the CLI is often a .cmd/.ps1 shim that Node can't start directly.
    status = JSON.parse(execSync('supabase status -o json', { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    throw new Error('Local Supabase is not running. Start it with `supabase start` (from the repo root), then run `npm run test:db` again.');
  }
  const url = status.API_URL ?? '';
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY ?? '';
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url)) throw new Error(`Refusing to run database tests against ${url || 'an unknown URL'}: local Supabase only.`);
  project.provide('supabase', { url, key });
}
