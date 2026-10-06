import { useState } from 'react';
import { useNavigate } from 'react-router';

import { authErrorMessage, signInWithGoogle, signUp } from '@/features/auth/api';
import { fieldErrors, PASSWORD_RULE, signUpSchema, type SignUpInput } from '@/features/auth/schema';

import { AuthScreen, GoogleButton, OrDivider, SwitchPrompt } from '../../ui/AuthScreen';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import './auth.css';

type Field = keyof SignUpInput;

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignUpInput>({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'email' | 'google' | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  const set = (field: Field) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const submit = async () => {
    setFormError(null);
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors<Field>(parsed.error));
      return;
    }
    setErrors({});
    setBusy('email');
    try {
      // On success with a session, the app routes move on to role selection.
      const { needsConfirmation } = await signUp(parsed.data);
      if (needsConfirmation) setConfirmEmail(parsed.data.email);
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

  if (confirmEmail) {
    return (
      <AuthScreen logo title="Check your email" subtitle={`We sent a confirmation link to ${confirmEmail}. Open it, then sign in.`}>
        <Button label="Go to Sign In" onPress={() => navigate('/sign-in', { replace: true })} />
      </AuthScreen>
    );
  }

  const disabled = busy !== null;

  return (
    <AuthScreen back logo title="Create Account" subtitle="Create your Trackademic account">
      <form
        className="auth-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) void submit();
        }}
      >
        {formError ? <Notice tone="danger" title="Could not create account">{formError}</Notice> : null}
        <TextField
          label="Full Name"
          icon="person-outline"
          placeholder="Juan Dela Cruz"
          autoComplete="name"
          autoCapitalize="words"
          value={form.fullName}
          onChangeText={set('fullName')}
          error={errors.fullName}
          editable={!disabled}
        />
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
          placeholder="Create a password"
          secret
          autoComplete="new-password"
          autoCapitalize="none"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          hint={PASSWORD_RULE}
          editable={!disabled}
        />
        <TextField
          label="Confirm Password"
          icon="lock-closed-outline"
          placeholder="Type it again"
          secret
          autoComplete="new-password"
          autoCapitalize="none"
          enterKeyHint="go"
          value={form.confirmPassword}
          onChangeText={set('confirmPassword')}
          error={errors.confirmPassword}
          editable={!disabled}
        />
        <Button label="Sign Up" type="submit" loading={busy === 'email'} disabled={disabled} />
      </form>
      <OrDivider />
      <GoogleButton onPress={() => void google()} loading={busy === 'google'} disabled={disabled} />
      <SwitchPrompt question="Already have an account?" action="Sign In" onPress={() => navigate('/sign-in', { replace: true })} />
    </AuthScreen>
  );
}
