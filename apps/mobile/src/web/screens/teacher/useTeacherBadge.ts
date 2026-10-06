import { useEffect, useState } from 'react';

import { unreadNotificationCount } from '@/features/teacher/api';

const REFRESH_MS = 60_000;

/** Unread notifications for the tab badge: on open, every minute, and when the app regains focus. */
export function useTeacherBadge(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      unreadNotificationCount().then(
        (n) => active && setCount(n),
        () => {
          // A missing badge is not worth an error message; the Notifications screen shows errors.
        },
      );
    };
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('trackademic:notifications-changed', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('trackademic:notifications-changed', refresh);
    };
  }, []);

  return count;
}

/** Screens call this after marking notifications read or archiving, so the badge updates at once. */
export const notificationsChanged = () => window.dispatchEvent(new Event('trackademic:notifications-changed'));
