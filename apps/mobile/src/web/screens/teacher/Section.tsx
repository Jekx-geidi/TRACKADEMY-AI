import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import { authErrorMessage } from '@/features/auth/api';
import {
  createSubject,
  inviteLink,
  listNotifications,
  listStudents,
  MEMBER_STATUS_LABELS,
  MEMBER_STATUSES,
  sectionOverview,
  sectionSubjects,
  type MemberStatus,
  type SectionOverview,
} from '@/features/teacher/api';
import { completion, COMPLETION_LABEL, COMPLETION_TONE, PAGE_SIZE } from '@/features/teacher/progress';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Donut, ProgressBar, StatusBadge } from '../../ui/Charts';
import { SendReminderDialog } from '../../ui/CommunicationDialogs';
import { EmptyCard, LoadGate, StatRow, StatTile } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { Notice, Screen, SectionTitle, TopBar } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';
import { CopyField } from './sections/CopyField';
import { formatDateTime, friendly, MEMBER_TONE, plural } from './sections/util';
import './sections.css';

type Tab = 'overview' | 'subjects' | 'students';
const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'subjects', label: 'Subjects' },
  { value: 'students', label: 'Students' },
] as const satisfies readonly { value: Tab; label: string }[];

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.value === value);

/** Section Workspace (PRD v0.5 §9–§11): one section's overview, subjects and students. */
export default function TeacherSection() {
  const { sectionId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: Tab = isTab(tabParam) ? tabParam : 'overview';
  const overview = useLoad(() => friendly(sectionOverview(sectionId)), sectionId);
  const data = overview.data;

  return (
    <>
      <TopBar title="Section" />
      <Screen tabs>
        <LoadGate loading={overview.loading} error={overview.error} hasData={data !== undefined} onRetry={overview.reload}>
          {data ? (
            <>
              <div className="sx-head">
                <h2>{data.name}</h2>
                <p>
                  {plural(data.student_count, 'Student')} · {plural(data.subject_count, 'Subject')}
                </p>
              </div>
              <Segmented options={TABS} value={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />
              {tab === 'overview' ? <OverviewTab section={data} /> : null}
              {tab === 'subjects' ? <SubjectsTab classId={data.id} onChanged={overview.reload} /> : null}
              {tab === 'students' ? <StudentsTab classId={data.id} /> : null}
            </>
          ) : null}
        </LoadGate>
      </Screen>
    </>
  );
}

// ---------------------------------------------------------------------------
// Overview (§9)
// ---------------------------------------------------------------------------

function OverviewTab({ section }: { section: SectionOverview }) {
  const activity = useLoad(() => friendly(listNotifications({ classId: section.id })), section.id);
  const [reminding, setReminding] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const verified = completion(section.verified, section.expected);

  return (
    <>
      <StatRow>
        <StatTile icon="people-outline" value={section.student_count} label="Students" />
        <StatTile icon="book-outline" value={section.subject_count} label="Subjects" />
        <StatTile icon="document-text" value={section.active_assessments} label="Active assessments" />
      </StatRow>

      <SectionTitle>Submission health</SectionTitle>
      <Card>
        <div className="sx-donuts">
          <Donut
            percent={section.percent}
            tone={COMPLETION_TONE[section.status]}
            center={`${section.submitted}/${section.expected}`}
            caption={`Submitted · ${COMPLETION_LABEL[section.status]}`}
            label={`${section.name}: ${section.submitted} of ${section.expected} submitted, ${section.percent}%, ${COMPLETION_LABEL[section.status]}`}
          />
        </div>
        <div className="sx-metric">
          <div className="sx-metric-row">
            <span>
              {section.verified}/{section.expected} Verified
            </span>
            <span>{verified.percent}%</span>
          </div>
          <ProgressBar percent={verified.percent} tone={verified.tone} label={`${section.verified} of ${section.expected} verified`} />
        </div>
      </Card>
      <StatRow>
        <StatTile icon="alert-circle-outline" value={section.missing} label="Missing" tint={colors.dangerSoft} />
        <StatTile icon="time" value={section.pending} label="Pending review" tint={colors.warningSoft} />
        <StatTile icon="calendar-outline" value={section.overdue} label="Overdue" tint={colors.dangerSoft} />
      </StatRow>

      {sent ? (
        <Notice tone="success" title="Reminder sent">
          {sent}
        </Notice>
      ) : null}
      <Button label="Send Reminder" icon="megaphone-outline" variant="secondary" onPress={() => setReminding(true)} disabled={section.student_count === 0} />

      <SectionTitle>Recent activity</SectionTitle>
      <LoadGate loading={activity.loading} error={activity.error} hasData={activity.data !== undefined} onRetry={activity.reload}>
        {activity.data && activity.data.rows.length === 0 ? (
          <EmptyCard icon="notifications-outline" title="No activity yet." body="Joins, uploads and reviews for this section show here." />
        ) : null}
        {activity.data && activity.data.rows.length > 0 ? (
          <Card className="sx-list">
            {activity.data.rows.slice(0, 5).map((n) => (
              <div key={n.id} className="sx-row">
                <span className="sx-main">
                  <span className="sx-title">{n.title}</span>
                  {n.body ? <span className="sx-meta">{n.body}</span> : null}
                  <span className="sx-meta">{formatDateTime(n.created_at)}</span>
                </span>
              </div>
            ))}
          </Card>
        ) : null}
      </LoadGate>

      <SectionTitle>Invite students</SectionTitle>
      <Card>
        <CopyField label="Class Join Code" value={section.join_code} big />
        <CopyField label="Invite Link" value={inviteLink(section.join_code)} />
      </Card>

      {reminding ? (
        <SendReminderDialog
          classId={section.id}
          recipientsLabel={`Whole section (${plural(section.student_count, 'student')})`}
          onClose={() => setReminding(false)}
          onSent={(count) => {
            setReminding(false);
            setSent(`Sent to ${plural(count, 'student')}.`);
          }}
        />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Subjects (§10)
// ---------------------------------------------------------------------------

function SubjectsTab({ classId, onChanged }: { classId: string; onChanged: () => void }) {
  const subjects = useLoad(() => friendly(sectionSubjects(classId)), classId);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);

  const all = subjects.data ?? [];
  const term = search.toLowerCase();
  const matches = term ? all.filter((s) => s.subject_name.toLowerCase().includes(term)) : all;
  const shown = matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      <Button label="+ Add Subject" onPress={() => setAdding(true)} />
      <ListToolbar
        search={
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search subjects"
          />
        }
      />
      <LoadGate loading={subjects.loading} error={subjects.error} hasData={subjects.data !== undefined} onRetry={subjects.reload}>
        {all.length === 0 ? (
          <>
            <EmptyCard icon="book-outline" title="No subjects yet." body="Add the subjects you teach in this section." />
            <Button label="Add Subject" variant="secondary" icon="add" onPress={() => setAdding(true)} />
          </>
        ) : matches.length === 0 ? (
          <EmptyCard icon="search" title="No subjects match." body="Try another search." />
        ) : (
          <Card className="sx-list">
            {shown.map((s) => (
              <Link key={s.subject_id} to={`/teacher/subjects/${s.subject_id}`} className="sx-row">
                <span className="sx-main">
                  <span className="sx-title">{s.subject_name}</span>
                  <span className="sx-meta">
                    {plural(s.assessments, 'assessment')} · {s.submitted}/{s.expected} Submitted
                  </span>
                  <ProgressBar percent={s.percent} tone={COMPLETION_TONE[s.status]} label={`${s.subject_name}: ${s.percent}% submitted`} />
                </span>
                <span className="sx-side">
                  <span className="sx-big-number">{s.percent}%</span>
                  <StatusBadge label={COMPLETION_LABEL[s.status]} tone={COMPLETION_TONE[s.status]} />
                </span>
                <Icon name="chevron-forward" size={20} className="sx-chevron" />
              </Link>
            ))}
          </Card>
        )}
        <Pagination page={page} total={matches.length} onPage={setPage} />
      </LoadGate>

      {adding ? (
        <AddSubjectDialog
          classId={classId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            subjects.reload();
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function AddSubjectDialog({ classId, onClose, onAdded }: { classId: string; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Enter the subject name.');
      return;
    }
    setNameError(undefined);
    setError(null);
    setBusy(true);
    try {
      await createSubject(classId, { name: name.trim(), code: code.trim(), description: description.trim() });
      onAdded();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title="Add Subject" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField label="Subject Name" icon="book-outline" placeholder="Mathematics" value={name} onChangeText={setName} error={nameError} maxLength={80} />
        <TextField label="Subject Code (optional)" icon="key-outline" placeholder="MATH7" value={code} onChangeText={setCode} maxLength={20} />
        <div className="field">
          <label className="field-label" htmlFor="subject-description">
            Description (optional)
          </label>
          <textarea
            id="subject-description"
            className="plain-textarea"
            rows={3}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {error ? (
          <Notice tone="danger" title="Subject not added">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Add Subject" icon="add" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Students (§11)
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = MEMBER_STATUSES.map((s) => ({ value: s, label: MEMBER_STATUS_LABELS[s] }));

function StudentsTab({ classId }: { classId: string }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<MemberStatus | ''>('');
  const [page, setPage] = useState(0);
  const query = { classId, search, status, page };
  const { data, error, loading, reload } = useLoad(() => friendly(listStudents(query)), JSON.stringify(query));
  const hasFilters = Boolean(search || status);

  return (
    <>
      <ListToolbar
        search={
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(0);
            }}
            placeholder="Search students"
          />
        }
        activeFilters={status ? 1 : 0}
        filters={
          <FilterSelect
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            allLabel="All statuses"
            onChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
          />
        }
      />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {data && data.rows.length === 0 ? (
          hasFilters ? (
            <EmptyCard icon="search" title="No students match." body="Try another search or status." />
          ) : (
            <EmptyCard icon="people-outline" title="No students yet." body="Share the Class Join Code from the Overview tab." />
          )
        ) : null}
        {data && data.rows.length > 0 ? (
          <Card className="sx-list">
            {data.rows.map((s) => (
              <Link key={s.student_profile_id} to={`/teacher/students/${s.student_profile_id}`} className="sx-row">
                <span className="sx-main">
                  <span className="sx-title ellipsis">{s.display_name}</span>
                  <span className="sx-meta">{s.missing_count > 0 ? `${s.missing_count} missing` : 'Nothing missing'}</span>
                </span>
                <StatusBadge label={MEMBER_STATUS_LABELS[s.status]} tone={MEMBER_TONE[s.status]} />
                <Icon name="chevron-forward" size={20} className="sx-chevron" />
              </Link>
            ))}
          </Card>
        ) : null}
        {data ? <Pagination page={page} total={data.total} onPage={setPage} /> : null}
      </LoadGate>
    </>
  );
}
