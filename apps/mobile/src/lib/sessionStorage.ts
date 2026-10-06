// Where the auth session (access + refresh token) is kept.
// iOS/Android: sessionStorage.native.ts keeps it in SecureStore (Keychain / Keystore).
// Web (the PWA): browsers have no Keychain-style store, so the session sits in this site's
// localStorage, the standard for browser Supabase apps. Any script running on the page could
// read it, so the web build must not load untrusted scripts (see the Content-Security-Policy
// notes in the README). On shared school devices, users should sign out when done.
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const store = () => (typeof window === 'undefined' ? null : window.localStorage);

export const sessionStorage: SessionStorage = {
  getItem: async (key) => store()?.getItem(key) ?? null,
  setItem: async (key, value) => store()?.setItem(key, value),
  removeItem: async (key) => store()?.removeItem(key),
};
