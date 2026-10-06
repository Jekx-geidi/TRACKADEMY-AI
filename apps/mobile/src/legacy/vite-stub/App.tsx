import type { Session } from '@supabase/supabase-js';
import { useEffect, useState, type FormEvent } from 'react';

import logoUrl from '../../assets/logo.png';
import { supabaseConfig } from './env';
import { supabase } from './supabase';

type Role = 'STUDENT' | 'PARENT' | 'TEACHER';
type Page = 'home' | 'subjects' | 'records' | 'scan' | 'profile';

interface Profile {
  full_name: string | null;
  role: Role | null;
  setup_completed_at: string | null;
}

const roles: Role[] = ['STUDENT', 'PARENT', 'TEACHER'];
const roleLabel: Record<Role, string> = { STUDENT: 'Student', PARENT: 'Parent', TEACHER: 'Teacher' };

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [page, setPage] = useState<Page>('home');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null);
      return;
    }
    void supabase
      .from('profiles')
      .select('full_name, role, setup_completed_at')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        setProfile(data as Profile | null);
      });
  }, [session]);

  if (loading) return <main className="centered"><div className="spinner" /><p>Loading Trackademic...</p></main>;
  if (!supabase || !supabaseConfig) return <ConfigNotice />;
  if (!session) return <AuthForm mode={mode} setMode={setMode} setMessage={setMessage} message={message} />;
  if (!profile?.role || !profile.setup_completed_at) return <Setup session={session} onDone={setProfile} setMessage={setMessage} message={message} />;
  return <Dashboard profile={profile} page={page} setPage={setPage} onSignOut={() => void supabase.auth.signOut()} />;
}

function ConfigNotice() {
  return <main className="centered"><section className="card"><h1>Trackademic needs configuration</h1><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart the web server.</p></section></main>;
}

function AuthForm({ mode, setMode, setMessage, message }: { mode: 'signin' | 'signup'; setMode: (mode: 'signin' | 'signup') => void; setMessage: (value: string | null) => void; message: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setMessage(null);
    setBusy(true);
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (signup && !result.data.session) setMessage('Check your email to confirm the new account.');
  }

  return <main className="auth-shell">
    <section className="brand"><img src={logoUrl} alt="Trackademic" /><p>Organize checked schoolwork, scores, and next steps.</p></section>
    <form className="card auth-card" onSubmit={submit}>
      <p className="eyebrow">{signup ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</p>
      <h1>{signup ? 'Start with Trackademic' : 'Sign in to continue'}</h1>
      {message ? <p className="notice">{message}</p> : null}
      {signup ? <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label> : null}
      <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} minLength={6} required /></label>
      <button disabled={busy}>{busy ? 'Please wait...' : signup ? 'Create account' : 'Sign in'}</button>
      <p className="switch">{signup ? 'Already have an account?' : 'New to Trackademic?'} <button type="button" className="link" onClick={() => { setMode(signup ? 'signin' : 'signup'); setMessage(null); }}>{signup ? 'Sign in' : 'Create one'}</button></p>
    </form>
  </main>;
}

function Setup({ session, onDone, setMessage, message }: { session: Session; onDone: (profile: Profile) => void; setMessage: (value: string | null) => void; message: string | null }) {
  const [role, setRole] = useState<Role>('STUDENT');
  const [busy, setBusy] = useState(false);
  async function complete() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const roleResult = await supabase.rpc('set_my_role', { p_role: role });
    const doneResult = roleResult.error ? null : await supabase.rpc('mark_setup_complete');
    setBusy(false);
    const error = roleResult.error?.message ?? doneResult?.error?.message;
    if (error) { setMessage(error); return; }
    onDone({ full_name: session.user.user_metadata.full_name ?? null, role, setup_completed_at: new Date().toISOString() });
  }
  return <main className="centered"><section className="card setup"><p className="eyebrow">ONE LAST STEP</p><h1>How will you use Trackademic?</h1><div className="role-grid">{roles.map((value) => <button key={value} className={role === value ? 'role selected' : 'role'} onClick={() => setRole(value)}>{roleLabel[value]}</button>)}</div>{message ? <p className="notice">{message}</p> : null}<button onClick={complete} disabled={busy}>{busy ? 'Saving...' : 'Continue'}</button></section></main>;
}

function Dashboard({ profile, page, setPage, onSignOut }: { profile: Profile; page: Page; setPage: (page: Page) => void; onSignOut: () => void }) {
  const content: Record<Page, { title: string; copy: string }> = {
    home: { title: `Hello${profile.full_name ? `, ${profile.full_name}` : ''}`, copy: `You are signed in as a ${profile.role ? roleLabel[profile.role] : 'member'}.` },
    subjects: { title: 'Subjects', copy: 'Your enrolled subjects will appear here.' },
    records: { title: 'Records', copy: 'Checked work and score records will appear here.' },
    scan: { title: 'Upload a paper', copy: 'Choose a paper image from your device to begin a web-based review.' },
    profile: { title: 'Profile', copy: 'Manage your Trackademic account.' },
  };
  return <main className="app-shell"><header><button className="wordmark" onClick={() => setPage('home')}>Trackademic</button><button className="signout" onClick={onSignOut}>Sign out</button></header><nav>{(Object.keys(content) as Page[]).map((item) => <button key={item} className={page === item ? 'active' : ''} onClick={() => setPage(item)}>{item}</button>)}</nav><section className="page card"><p className="eyebrow">{profile.role ? roleLabel[profile.role] : 'MEMBER'}</p><h1>{content[page].title}</h1><p>{content[page].copy}</p>{page === 'scan' ? <input type="file" accept="image/*" /> : null}</section></main>;
}
