// Shared by pwa.ts (iOS/Android no-op) and pwa.web.ts (browser).
export interface InstallState {
  /** The browser offered to install the app; call `install()` to show its prompt. */
  canInstall: boolean;
  /** iPhone/iPad Safari: no install prompt exists, so show "Share → Add to Home Screen". */
  showIosHint: boolean;
  install: () => Promise<void>;
}
