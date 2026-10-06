import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router';

import { authErrorMessage } from '@/features/auth/api';
import { currentSchoolYear } from '@/features/classes/schema';
import { getTeacherInfo, listSections, updateTeacherInfo, type TeacherInfo } from '@/features/teacher/api';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { LoadGate } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { ProfileView } from '../../ui/ProfileView';
import { Notice } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';

/** Per-device convenience only (never synced, never an access rule). */
const SCHOOL_YEAR_KEY = 'trackademic.defaultSchoolYear';

function readSchoolYear(): string {
  try {
    return window.localStorage.getItem(SCHOOL_YEAR_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeSchoolYear(value: string): boolean {
  try {
    if (value) window.localStorage.setItem(SCHOOL_YEAR_KEY, value);
    else window.localStorage.removeItem(SCHOOL_YEAR_KEY);
    return true;
  } catch {
    return false;
  }
}

const isSchoolYear = (value: string) => {
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  return match !== null && Number(match[2]) === Number(match[1]) + 1;
};

/** "Math, Science , ,English" → ["Math", "Science", "English"]. */
const splitSubjects = (text: string) =>
  text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default function TeacherProfile() {
  return (
    <ProfileView>
      <TeacherInfoCard />
      <MySectionsCard />
      <PreferencesCard />
    </ProfileView>
  );
}

function TeacherInfoCard() {
  const info = useLoad(getTeacherInfo);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Card>
      <div style={styles.head}>
        <p style={styles.label}>Teacher Information</p>
        {info.data ? (
          <button type="button" className="link-btn" style={styles.edit} onClick={() => setEditing(true)}>
            Edit
          </button>
        ) : null}
      </div>
      <LoadGate loading={info.loading} error={info.error} hasData={info.data !== undefined} onRetry={info.reload}>
        {saved ? <Notice tone="success" title="Teacher information saved" /> : null}
        <InfoRow label="School" value={info.data?.school_name} />
        <InfoRow label="Department" value={info.data?.department} />
        <p style={styles.rowLabel}>Teaching Subjects</p>
        {info.data?.teaching_subjects.length ? (
          <div className="pills">
            {info.data.teaching_subjects.map((s) => (
              <span key={s} className="pill">
                {s}
              </span>
            ))}
          </div>
        ) : (
          <p style={styles.none}>Not set</p>
        )}
        <p style={styles.help}>Teaching subjects only help prefill forms. They don't give access to any section.</p>
      </LoadGate>

      {editing && info.data ? (
        <TeacherInfoDialog
          current={info.data}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setSaved(true);
            info.reload();
          }}
        />
      ) : null}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p style={styles.rowLabel}>{label}</p>
      <p style={value ? styles.value : styles.none}>{value || 'Not set'}</p>
    </div>
  );
}

function TeacherInfoDialog({ current, onClose, onSaved }: { current: TeacherInfo; onClose: () => void; onSaved: () => void }) {
  const [school, setSchool] = useState(current.school_name ?? '');
  const [department, setDepartment] = useState(current.department ?? '');
  const [subjects, setSubjects] = useState(current.teaching_subjects.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const list = splitSubjects(subjects);
    // Same limits as public.update_my_teacher_info, checked here for a quicker message.
    if (school.trim().length > 120) return setError('Keep the school name to 120 characters.');
    if (department.trim().length > 80) return setError('Keep the department to 80 characters.');
    if (list.length > 20) return setError('List up to 20 teaching subjects.');
    if (list.some((s) => s.length > 80)) return setError('Keep each subject to 80 characters.');
    setError(null);
    setBusy(true);
    try {
      await updateTeacherInfo({ schoolName: school.trim(), department: department.trim(), teachingSubjects: list });
      onSaved();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title="Teacher information" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="School" icon="school-outline" value={school} onChangeText={setSchool} maxLength={120} placeholder="Mabini National High School" />
        <TextField label="Department" icon="people-outline" value={department} onChangeText={setDepartment} maxLength={80} placeholder="Mathematics" />
        <TextField
          label="Teaching subjects"
          icon="library-outline"
          value={subjects}
          onChangeText={setSubjects}
          placeholder="Math, Science"
          hint="Separate subjects with commas. They only help prefill forms."
        />
        {error ? (
          <Notice tone="danger" title="Not saved">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Save" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

function MySectionsCard() {
  const sections = useLoad(() => listSections({ sort: 'name' }));
  const rows = sections.data?.rows ?? [];
  const more = (sections.data?.total ?? 0) - rows.length;

  return (
    <Card>
      <div style={styles.head}>
        <p style={styles.label}>My Sections</p>
        <Link className="link-btn" style={styles.edit} to="/teacher/sections">
          Manage
        </Link>
      </div>
      <LoadGate loading={sections.loading} error={sections.error} hasData={sections.data !== undefined} onRetry={sections.reload}>
        {rows.length === 0 ? <p style={styles.none}>No sections yet.</p> : null}
        {rows.map((s) => (
          <Link key={s.id} to={`/teacher/sections/${s.id}`} style={styles.row}>
            <span style={styles.name}>{s.name}</span>
            <span style={styles.pill}>
              <span style={styles.code} aria-label={`Class code ${s.join_code.split('').join(' ')}`}>
                {s.join_code}
              </span>
            </span>
          </Link>
        ))}
        {more > 0 ? (
          <Link className="link-btn" to="/teacher/sections">
            See all {sections.data?.total} sections
          </Link>
        ) : null}
        {rows.length > 0 ? <p style={styles.help}>Students join your sections with these codes.</p> : null}
      </LoadGate>
    </Card>
  );
}

function PreferencesCard() {
  const [schoolYear, setSchoolYear] = useState(readSchoolYear);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = schoolYear.trim();
    if (value && !isSchoolYear(value)) {
      setError('Use two consecutive years, like 2026-2027.');
      return;
    }
    if (!writeSchoolYear(value)) {
      setError('This browser does not allow saving preferences.');
      return;
    }
    setError(undefined);
    setSaved(true);
  };

  return (
    <Card>
      <p style={styles.label}>Preferences</p>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label="Default school year"
          icon="calendar-outline"
          value={schoolYear}
          placeholder={currentSchoolYear()}
          inputMode="numeric"
          maxLength={9}
          onChangeText={(v) => {
            setSchoolYear(v);
            setSaved(false);
            setError(undefined);
          }}
          error={error}
          hint="Saved on this device only."
        />
        {saved ? <Notice tone="success" title="Preference saved on this device" /> : null}
        <Button type="submit" label="Save Preference" variant="secondary" />
      </form>
    </Card>
  );
}

const styles = {
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  label: { fontSize: 14, fontWeight: 700, color: colors.textMuted },
  edit: { fontSize: 15, textDecoration: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center' },
  rowLabel: { fontSize: 13, fontWeight: 600, color: colors.textMuted, marginTop: 4 },
  value: { fontSize: 17, fontWeight: 700, color: colors.heading },
  none: { fontSize: 15, color: colors.textMuted },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 44, paddingTop: 4, paddingBottom: 4, textDecoration: 'none' },
  name: { flex: 1, minWidth: 0, fontSize: 17, fontWeight: 700, color: colors.heading },
  pill: { flex: 'none', background: colors.accentSoft, borderRadius: 999, padding: '6px 12px' },
  code: { fontSize: 15, fontWeight: 800, color: colors.heading, letterSpacing: 2 },
  help: { fontSize: 14, color: colors.textMuted, lineHeight: '20px' },
} satisfies Record<string, CSSProperties>;
