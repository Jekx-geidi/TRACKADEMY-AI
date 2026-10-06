import { useRef, useState, type FormEvent, type ReactNode } from 'react';

import { ROLE_LABELS } from '@/features/auth/roles';
import { useAuth } from '@/features/auth/AuthProvider';
import { fieldErrors, PASSWORD_RULE } from '@/features/auth/schema';
import { emailChangeSchema, nameSchema, passwordChangeSchema, type PasswordChangeInput } from '@/features/profile/schema';
import { useLoad } from '@/lib/useLoad';
import { authErrorMessage, signOut } from '@/services/api/auth';
import { changeMyEmail, changeMyPassword, getMyPhotoUrl, preparePhoto, removeMyPhoto, setMyPhoto, updateMyName } from '@/services/api/profile';

import { Button } from './Button';
import { Card } from './Card';
import { Dialog } from './Dialog';
import { Icon, type IconName } from './Icon';
import { InstallAppCard } from './InstallAppCard';
import { DataSaverToggle } from './DataSaverToggle';
import { Notice, Screen } from './Screen';
import { Spinner } from './Spinner';
import { TextField } from './TextField';
import { initials } from './UserAvatar';

type Editing = 'photo' | 'name' | 'email' | 'password' | null;

/** Shared profile tab: who is signed in, editing their account, role-specific details, and Sign Out. */
export function ProfileView({ children }: { children?: ReactNode }) {
  const { profile, session } = useAuth();
  const photo = useLoad(getMyPhotoUrl, session?.user.id ?? null);
  const [editing, setEditing] = useState<Editing>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = profile?.fullName?.trim() || 'Trackademic user';
  const email = session?.user.email ?? '';
  // An email change waiting for its confirmation link.
  const pendingEmail = session?.user.new_email;

  const done = (message: string) => {
    setEditing(null);
    setSaved(message);
  };

  const leave = async () => {
    setError(null);
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen tabs>
      <Card className="profile-card">
        <div className="avatar-wrap">
          <div className="avatar">
            {photo.data ? <img src={photo.data} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
          </div>
          <button type="button" className="avatar-edit" aria-label="Change profile photo" onClick={() => setEditing('photo')}>
            <Icon name="camera" size={18} />
          </button>
        </div>
        <p className="profile-name">{name}</p>
        {email ? <p className="muted">{email}</p> : null}
        {profile?.role ? <span className="role-pill">{ROLE_LABELS[profile.role]}</span> : null}
      </Card>

      {saved ? (
        <Notice tone="success" title="Saved">
          {saved}
        </Notice>
      ) : null}
      {pendingEmail ? (
        <Notice tone="info" title="Confirm your new email">
          Open the link we sent to {pendingEmail}. Until then, keep signing in with {email}.
        </Notice>
      ) : null}

      <Card className="settings-list">
        <SettingsRow icon="person-outline" label="Name" value={name} onPress={() => setEditing('name')} />
        <SettingsRow icon="mail-outline" label="Email" value={email || 'Not set'} onPress={() => setEditing('email')} />
        <SettingsRow icon="key-outline" label="Password" value="Change your password" onPress={() => setEditing('password')} />
      </Card>
      <Card><DataSaverToggle /></Card>

      {children}
      <InstallAppCard />
      {error ? (
        <Notice tone="danger" title="Could not sign out">
          {error}
        </Notice>
      ) : null}
      <Button label="Sign Out" icon="log-out-outline" variant="secondary" onPress={leave} loading={busy} />

      {editing === 'photo' ? (
        <PhotoDialog
          hasPhoto={Boolean(photo.data)}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            photo.reload();
            done(message);
          }}
        />
      ) : null}
      {editing === 'name' ? <NameDialog current={profile?.fullName ?? ''} onClose={() => setEditing(null)} onDone={done} /> : null}
      {editing === 'email' ? <EmailDialog current={email} onClose={() => setEditing(null)} onDone={done} /> : null}
      {editing === 'password' ? <PasswordDialog onClose={() => setEditing(null)} onDone={done} /> : null}
    </Screen>
  );
}

function SettingsRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onPress}>
      <Icon name={icon} size={22} color="var(--accent)" />
      <span style={{ minWidth: 0 }}>
        <span className="label" style={{ display: 'block' }}>
          {label}
        </span>
        <span className="value ellipsis" style={{ display: 'block' }}>
          {value}
        </span>
      </span>
      <Icon name="chevron-forward" size={20} className="chevron" />
    </button>
  );
}

/** Runs a save with busy/error state; shows the error inside the dialog. */
function useSave() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (save: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await save();
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function DialogError({ error }: { error: string | null }) {
  return error ? (
    <Notice tone="danger" title="Not saved">
      {error}
    </Notice>
  ) : null;
}

function PhotoDialog({ hasPhoto, onClose, onDone }: { hasPhoto: boolean; onClose: () => void; onDone: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useSave();

  const upload = (file: File | undefined) => {
    if (!file) return;
    void run(async () => {
      await setMyPhoto(await preparePhoto(file));
      onDone('Your profile photo was updated.');
    });
  };

  return (
    <Dialog title="Profile photo" onClose={onClose} busy={busy}>
      <p className="dialog-text">Only you can see your photo. It is stored privately and never shared publicly.</p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <DialogError error={error} />
      {busy ? (
        <Spinner size="large" label="Saving photo" />
      ) : (
        <div className="stack">
          <Button label={hasPhoto ? 'Choose a New Photo' : 'Choose a Photo'} icon="images" onPress={() => input.current?.click()} />
          {hasPhoto ? (
            <Button
              label="Remove Photo"
              icon="trash-outline"
              variant="danger"
              onPress={() =>
                void run(async () => {
                  await removeMyPhoto();
                  onDone('Your profile photo was removed.');
                })
              }
            />
          ) : null}
          <Button label="Cancel" variant="ghost" onPress={onClose} />
        </div>
      )}
    </Dialog>
  );
}

function NameDialog({ current, onClose, onDone }: { current: string; onClose: () => void; onDone: (message: string) => void }) {
  const { refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(current);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const { busy, error, run } = useSave();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = nameSchema.safeParse({ fullName });
    if (!parsed.success) {
      setFieldError(fieldErrors<'fullName'>(parsed.error).fullName);
      return;
    }
    setFieldError(undefined);
    void run(async () => {
      await updateMyName(parsed.data.fullName);
      await refreshProfile();
      onDone('Your name was updated.');
    });
  };

  return (
    <Dialog title="Edit name" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="Full name" icon="person-outline" value={fullName} onChangeText={setFullName} error={fieldError} autoComplete="name" maxLength={120} />
        <DialogError error={error} />
        <Button type="submit" label="Save Name" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

function EmailDialog({ current, onClose, onDone }: { current: string; onClose: () => void; onDone: (message: string) => void }) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const { busy, error, run } = useSave();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = emailChangeSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(fieldErrors<'email'>(parsed.error).email);
      return;
    }
    if (parsed.data.email.toLowerCase() === current.toLowerCase()) {
      setFieldError('This is already your email.');
      return;
    }
    setFieldError(undefined);
    void run(async () => {
      await changeMyEmail(parsed.data.email);
      onDone(`We sent a confirmation link to ${parsed.data.email}. Your email changes after you open it.`);
    });
  };

  return (
    <Dialog title="Change email" onClose={onClose} busy={busy}>
      <p className="dialog-text">Current email: {current || 'not set'}. We will send a link to the new address to confirm it.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="New email" icon="mail-outline" type="email" value={email} onChangeText={setEmail} error={fieldError} autoComplete="email" placeholder="you@example.com" />
        <DialogError error={error} />
        <Button type="submit" label="Send Confirmation" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

function PasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: (message: string) => void }) {
  const [values, setValues] = useState<PasswordChangeInput>({ currentPassword: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordChangeInput, string>>>({});
  const { busy, error, run } = useSave();
  const set = (key: keyof PasswordChangeInput) => (text: string) => setValues((v) => ({ ...v, [key]: text }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = passwordChangeSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors<keyof PasswordChangeInput>(parsed.error));
      return;
    }
    setErrors({});
    void run(async () => {
      await changeMyPassword(parsed.data);
      onDone('Your password was changed.');
    });
  };

  return (
    <Dialog title="Change password" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="Current password" icon="lock-closed-outline" secret value={values.currentPassword} onChangeText={set('currentPassword')} error={errors.currentPassword} autoComplete="current-password" />
        <TextField label="New password" icon="lock-closed-outline" secret value={values.password} onChangeText={set('password')} error={errors.password} hint={PASSWORD_RULE} autoComplete="new-password" />
        <TextField label="Confirm new password" icon="lock-closed-outline" secret value={values.confirmPassword} onChangeText={set('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        <DialogError error={error} />
        <Button type="submit" label="Change Password" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}
