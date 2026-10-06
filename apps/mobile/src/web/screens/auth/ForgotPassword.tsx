import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { authErrorMessage, sendPasswordReset } from '@/features/auth/api';
import { emailOnlySchema, fieldErrors } from '@/features/auth/schema';

import { AuthScreen } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import './auth.css';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  // Sign in passes the email it already has as ?email=.
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
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
          <Button label="Back to Sign In" onPress={() => navigate('/sign-in', { replace: true })} />
        </>
      ) : (
        <form
          className="auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void submit();
          }}
        >
          {formError ? <Notice tone="danger" title="Could not send link">{formError}</Notice> : null}
          <TextField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            enterKeyHint="send"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(undefined);
            }}
            error={error}
            editable={!busy}
          />
          <Button label="Send Reset Link" type="submit" loading={busy} />
        </form>
      )}
    </AuthScreen>
  );
}
