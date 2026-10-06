import { useSyncExternalStore } from 'react';

import type { InstallState } from './installState';

export type { InstallState } from './installState';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

const isIosSafari = () => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

// Listen as soon as this module loads: the browser may fire the event before any screen mounts.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Production builds only: in development a cached bundle would hide code changes. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = () =>
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app works without it; it just can't be installed or reopened offline.
    });
  // The bundle can finish loading after the page's load event, so don't wait for one that's gone.
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useInstallPrompt(): InstallState {
  const canInstall = useSyncExternalStore(subscribe, () => deferred !== null, () => false);
  const standalone = typeof window !== 'undefined' && isStandalone();
  return {
    canInstall: canInstall && !standalone,
    showIosHint: !standalone && typeof navigator !== 'undefined' && isIosSafari(),
    install: async () => {
      const event = deferred;
      if (!event) return;
      await event.prompt();
      await event.userChoice;
      deferred = null;
      notify();
    },
  };
}
