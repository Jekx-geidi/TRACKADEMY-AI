const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

// eslint-disable-next-line import/first -- must load after the mock
import { sessionStorage } from '../sessionStorage.native';

beforeEach(() => mockStore.clear());

describe('SecureStore session storage', () => {
  it('round-trips a session larger than one SecureStore value', async () => {
    const session = JSON.stringify({ access_token: 'a'.repeat(3000), refresh_token: 'r'.repeat(500) });
    await sessionStorage.setItem('sb-auth', session);
    expect(mockStore.get('sb-auth.n')).toBe('2');
    await expect(sessionStorage.getItem('sb-auth')).resolves.toBe(session);
  });

  it('drops leftover chunks when the session shrinks', async () => {
    await sessionStorage.setItem('k', 'x'.repeat(4000));
    await sessionStorage.setItem('k', 'short');
    expect(mockStore.has('k.1')).toBe(false);
    await expect(sessionStorage.getItem('k')).resolves.toBe('short');
  });

  it('removes everything on sign out', async () => {
    await sessionStorage.setItem('k', 'x'.repeat(4000));
    await sessionStorage.removeItem('k');
    expect(mockStore.size).toBe(0);
    await expect(sessionStorage.getItem('k')).resolves.toBeNull();
  });
});
