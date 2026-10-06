import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';

/**
 * A class code from an invite link opened while signed out (PRD v0.3 §9.2). Kept in this
 * tab's sessionStorage only, so it is forgotten when the tab closes. Storage can be blocked
 * (private mode, site data off), so every access is guarded; losing the code only means
 * the user opens the link again.
 */
const PENDING_JOIN_KEY = 'trackademic.pendingJoin';

export function readPendingJoin(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_JOIN_KEY);
  } catch {
    return null;
  }
}

export function savePendingJoin(code: string): void {
  try {
    window.sessionStorage.setItem(PENDING_JOIN_KEY, code);
  } catch {
    // Not fatal: see above.
  }
}

export function clearPendingJoin(): void {
  try {
    window.sessionStorage.removeItem(PENDING_JOIN_KEY);
  } catch {
    // Not fatal: see above.
  }
}

/**
 * Once a student or teacher is signed in, returns them to the invite link they opened
 * before signing in. Waits while they are on an account setup step, so choosing a role
 * isn't interrupted; the join screen clears the code as soon as a student or teacher sees it.
 * Call once, inside the router (App.tsx).
 */
export function usePendingJoin(): void {
  const { session, profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = session ? profile?.role : null;

  useEffect(() => {
    if (role !== 'STUDENT' && role !== 'TEACHER') return;
    if (pathname.startsWith('/join/') || pathname.startsWith('/setup/')) return;
    const code = readPendingJoin();
    if (code) navigate(`/join/${encodeURIComponent(code)}`, { replace: true });
  }, [role, pathname, navigate]);
}
