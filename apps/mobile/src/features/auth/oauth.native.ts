import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// iOS/Android (Expo) version, moved unchanged from api.ts. The browser version is oauth.ts.
WebBrowser.maybeCompleteAuthSession();

export function redirectUrl(): string {
  return Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
}

/** Web redirects away and returns signed in; native opens a browser sheet and resolves when done. */
export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } });
    if (error) throw error;
    return;
  }

  const redirectTo = redirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // Cancelled: stay on the screen without an error.

  const url = new URL(result.url);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  const code = url.searchParams.get('code');
  const errorDescription = params.get('error_description') ?? url.searchParams.get('error_description');
  if (errorDescription) throw new Error(errorDescription);

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    return;
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('Google sign-in did not finish. Please try again.');
  const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (sessionError) throw sessionError;
}
