import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AuthScreen } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { Notice } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { authErrorMessage, sendPasswordReset } from '@/features/auth/api';
import { emailOnlySchema, fieldErrors } from '@/features/auth/schema';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const parsed = emailOnlySchema.safeParse({ email });
    if (!parsed.success) {
      setError(fieldErrors<'email'>(parsed.error).email);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSentTo(parsed.data.email);
    } catch (e) {
      setFormError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen back title="Forgot Password?" subtitle="Enter your email and we will send you a link to reset your password.">
      {sentTo ? (
        <>
          <Notice tone="success" title="Check your email">
            If an account exists for {sentTo}, a reset link is on its way.
          </Notice>
          <Button label="Back to Sign In" onPress={() => router.replace('/sign-in')} />
        </>
      ) : (
        <>
          {formError ? <Notice tone="danger" title="Could not send link">{formError}</Notice> : null}
          <TextField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(undefined);
            }}
            error={error}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <Button label="Send Reset Link" onPress={submit} loading={busy} />
        </>
      )}
    </AuthScreen>
  );
}
