// Installable web app (PWA) support. iOS/Android builds are already installed apps, so
// everything here is a no-op; the browser version lives in pwa.web.ts.
import type { InstallState } from './installState';

export type { InstallState } from './installState';

export function registerServiceWorker(): void {}

export function useInstallPrompt(): InstallState {
  return { canInstall: false, showIosHint: false, install: async () => {} };
}
