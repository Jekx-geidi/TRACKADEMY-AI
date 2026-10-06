import * as SecureStore from 'expo-secure-store';

import type { SessionStorage } from './sessionStorage';

// SecureStore (Keychain / Keystore) warns above ~2 KB per value and a Supabase session is
// larger, so the session is split into chunks. `${key}.n` holds the chunk count.
const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

async function chunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}.n`, OPTIONS);
  const n = raw ? Number(raw) : 0;
  return Number.isInteger(n) && n > 0 ? n : 0;
}

async function removeChunks(key: string, from: number, to: number): Promise<void> {
  for (let i = from; i < to; i++) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
}

export const sessionStorage: SessionStorage = {
  async getItem(key) {
    const n = await chunkCount(key);
    if (n === 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null; // Partially written: treat as signed out.
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key, value) {
    const previous = await chunkCount(key);
    const n = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    await SecureStore.setItemAsync(`${key}.n`, String(n), OPTIONS);
    await removeChunks(key, n, previous);
  },
  async removeItem(key) {
    const n = await chunkCount(key);
    await SecureStore.deleteItemAsync(`${key}.n`, OPTIONS);
    await removeChunks(key, 0, n);
  },
};
