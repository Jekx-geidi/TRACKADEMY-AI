const url = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.EXPO_PUBLIC_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig =
  typeof url === 'string' && typeof key === 'string' && url.length > 0 && key.length > 20
    ? { url, key }
    : null;
