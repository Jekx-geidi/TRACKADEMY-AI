import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { authErrorMessage, signIn, signInWithGoogle } from '@/features/auth/api';
import { fieldErrors, signInSchema, type SignInInput } from '@/features/auth/schema';

import { AuthScreen, GoogleButton, OrDivider, SwitchPrompt } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { InstallAppCard } from '../../ui/InstallAppCard';
import { Notice } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import './auth.css';

type Field = keyof SignInInput;

export default function SignInScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignInInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);

  const set = (field: Field) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    setErrors({});
    setBusy('email');
    try {
      // The app routes send the signed-in user onward.
      await signIn(parsed.data);
    } catch (e) {
      setFormError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setFormError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
    } catch (e) {
      setFormError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;
  // Carry the typed email over to the reset screen.
  const forgotSearch = form.email ? `?${new URLSearchParams({ email: form.email }).toString()}` : '';

  return (
    <AuthScreen logo title="Welcome Back" subtitle="Sign in to continue to Trackademic">
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) void submit();
        }}
      >
        {formError ? <Notice tone="danger" title="Could not sign in">{formError}</Notice> : null}
        <TextField
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          editable={!disabled}
        />
        <TextField
          label="Password"
          icon="lock-closed-outline"
          placeholder="Your password"
          secret
          autoComplete="current-password"
          autoCapitalize="none"
          enterKeyHint="go"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          editable={!disabled}
        />
        <Link className="link-btn forgot-link" to={{ pathname: '/forgot-password', search: forgotSearch }}>
          Forgot Password?
        </Link>
        <Button label="Sign In" type="submit" loading={busy === 'email'} disabled={disabled} />
      </form>
      <OrDivider />
      <GoogleButton onPress={() => void google()} loading={busy === 'google'} disabled={disabled} />
      <SwitchPrompt question="Don't have an account?" action="Sign Up" onPress={() => navigate('/sign-up', { replace: true })} />
      <InstallAppCard />
    </AuthScreen>
  );
}
