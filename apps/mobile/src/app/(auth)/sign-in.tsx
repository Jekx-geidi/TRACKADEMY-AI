import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthScreen, GoogleButton, OrDivider, SwitchPrompt } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { InstallAppCard } from '@/components/InstallAppCard';
import { Notice } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts } from '@/components/theme';
import { authErrorMessage, signIn, signInWithGoogle } from '@/features/auth/api';
import { fieldErrors, signInSchema, type SignInInput } from '@/features/auth/schema';

type Field = keyof SignInInput;

export default function SignInScreen() {
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
      // The root layout routes the signed-in user onward.
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

  return (
    <AuthScreen logo title="Welcome Back" subtitle="Sign in to continue to Trackademic">
      {formError ? <Notice tone="danger" title="Could not sign in">{formError}</Notice> : null}
      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
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
        textContentType="password"
        autoCapitalize="none"
        value={form.password}
        onChangeText={set('password')}
        error={errors.password}
        editable={!disabled}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable
        accessibilityRole="link"
        hitSlop={10}
        style={styles.forgot}
        onPress={() => router.push({ pathname: '/forgot-password', params: form.email ? { email: form.email } : {} })}
      >
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </Pressable>
      <Button label="Sign In" onPress={submit} loading={busy === 'email'} disabled={disabled} />
      <OrDivider />
      <GoogleButton onPress={google} loading={busy === 'google'} disabled={disabled} />
      <SwitchPrompt question="Don't have an account?" action="Sign Up" onPress={() => router.replace('/sign-up')} />
      <InstallAppCard />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 15, fontFamily: fonts.bold, color: colors.accent },
});
