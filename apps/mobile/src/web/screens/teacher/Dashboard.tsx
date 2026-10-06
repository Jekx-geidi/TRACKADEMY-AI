import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { authErrorMessage } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  assessmentStudents,
  dashboardSummary,
  listAssessmentProgress,
  listNotifications,
  listSections,
  needsAttention,
  sectionAnalytics,
  sectionSubjects,
  type AttentionItem,
  type SectionAnalytics,
  type SectionRow,
} from '@/features/teacher/api';
import { COMPLETION_LABEL, COMPLETION_TONE, completion, PAGE_SIZE, type Tone } from '@/features/teacher/progress';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Donut, ProgressBar, StatusBadge } from '../../ui/Charts';
import { SendReminderDialog } from '../../ui/CommunicationDialogs';
import { EmptyCard, greeting, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { IconTile } from '../../ui/IconTile';
import { Pagination } from '../../ui/ListControls';
import { Notice, Screen, SectionTitle } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';
import { SelectField } from '../../ui/SelectField';
import { colors } from '../../ui/theme';
import './dashboard.css';

type Mode = 'overview' | 'analytics';
type Basis = 'submitted' | 'verified';

const MODES = [
  { value: 'overview', label: 'Overview' },
  { value: 'analytics', label: 'Analytics' },
] as const satisfies readonly { value: Mode; label: string }[];

const BASES = [
  { value: 'submitted', label: 'Submission' },
  { value: 'verified', label: 'Verification' },
] as const satisfies readonly { value: Basis; label: string }[];

/** Who a reminder goes to; the server checks the teacher may message them. */
interface ReminderTarget {
  classId: string;
  recipientsLabel: string;
  studentProfileIds?: string[];
  assessmentId?: string;
  defaultMessage?: string;
}

const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Every page of a paged list, for pickers and reminders that need the whole set. */
async function allPages<T>(load: (page: number) => Promise<{ rows: T[]; total: number }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; ; page++) {
    const { rows, total } = await load(page);
    out.push(...rows);
    if (rows.length < PAGE_SIZE || out.length >= total) return out;
  }
}

const missingStudentIds = async (assessmentId: string) =>
  (await allPages((page) => assessmentStudents({ assessmentId, status: 'MISSING', page }))).map((r) => r.student_profile_id);

const allSections = () => allPages((page) => listSections({ sort: 'name', page }));

/**
 * Teacher Dashboard (PRD v0.5 §3–§5): "What needs my attention right now?" in Overview, and
 * "How are my sections performing?" in Analytics. The mode lives in the URL (?mode=analytics).
 */
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get('mode') === 'analytics' ? 'analytics' : 'overview';
  const summary = useLoad(dashboardSummary);
  const [reminder, setReminder] = useState<ReminderTarget | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const name = summary.data?.teacher_name?.trim() || profile?.fullName?.trim() || 'Teacher';
  const schoolYear = summary.data?.school_year;

  const setMode = (next: Mode) => {
    setParams(next === 'analytics' ? { mode: 'analytics' } : {}, { replace: true });
  };

  const remind = (target: ReminderTarget) => {
    setSent(null);
    setReminder(target);
  };

  return (
    <Screen tabs>
      <PageHeader eyebrow={today()} title={`${greeting()}, ${name}`} subtitle={schoolYear ? `School Year ${schoolYear}` : undefined} />

      {sent ? (
        <Notice tone="success" title="Reminder sent">
          {sent}
        </Notice>
      ) : null}

      <LoadGate loading={summary.loading} error={summary.error} hasData={summary.data !== undefined} onRetry={summary.reload}>
        {summary.data && summary.data.section_count === 0 ? (
          <>
            <EmptyCard icon="folder-outline" title="No sections yet." body="Create a section, then share its code so students can join." />
            <Button label="Create Section" icon="add-circle-outline" onPress={() => navigate('/teacher/sections')} />
          </>
        ) : summary.data ? (
          <>
            <Segmented options={MODES} value={mode} onChange={setMode} />
            {mode === 'overview' ? (
              <Overview
                activeSections={summary.data.section_count}
                students={summary.data.student_count}
                missing={summary.data.missing}
                pending={summary.data.pending}
                onRemind={remind}
              />
            ) : (
              <Analytics onRemind={remind} />
            )}
          </>
        ) : null}
      </LoadGate>

      {reminder ? (
        <SendReminderDialog
          classId={reminder.classId}
          recipientsLabel={reminder.recipientsLabel}
          studentProfileIds={reminder.studentProfileIds}
          assessmentId={reminder.assessmentId}
          defaultMessage={reminder.defaultMessage}
          onClose={() => setReminder(null)}
          onSent={(n) => {
            setReminder(null);
            setSent(`${plural(n, 'student')} and their parents will be notified.`);
            summary.reload();
          }}
        />
      ) : null}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

const loadOverview = async () => {
  const [attention, updates] = await Promise.all([needsAttention(10), listNotifications({ filter: 'ALL', page: 0 })]);
  return { attention, updates: updates.rows.slice(0, 5) };
};

function Overview({
  activeSections,
  students,
  missing,
  pending,
  onRemind,
}: {
  activeSections: number;
  students: number;
  missing: number;
  pending: number;
  onRemind: (target: ReminderTarget) => void;
}) {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad(loadOverview);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  // Reminds only the students still missing this assessment.
  const remindMissing = async (item: AttentionItem) => {
    setActionError(null);
    setPreparing(item.assessment_id);
    try {
      const ids = await missingStudentIds(item.assessment_id);
      if (ids.length === 0) {
        setActionError(`Everyone in ${item.class_name} has submitted ${item.title} now.`);
        reload();
        return;
      }
      onRemind({
        classId: item.class_id,
        recipientsLabel: `${plural(ids.length, 'missing student')} in ${item.class_name}`,
        studentProfileIds: ids,
        assessmentId: item.assessment_id,
        defaultMessage: `Please submit ${item.title}.`,
      });
    } catch (e) {
      setActionError(authErrorMessage(e));
    } finally {
      setPreparing(null);
    }
  };

  return (
    <>
      <SectionTitle>Quick Status</SectionTitle>
      <div className="dash-stats">
        <QuickStat value={activeSections} label="Active Sections" />
        <QuickStat value={students} label="Total Students" />
        <QuickStat value={missing} label="Missing Submissions" tone="danger" badge="Needs action" />
        <QuickStat value={pending} label="Pending Verification" tone="warning" badge="To review" />
      </div>

      <SectionTitle>Needs Attention</SectionTitle>
      {actionError ? (
        <Notice tone="warning" title="Reminder not started">
          {actionError}
        </Notice>
      ) : null}
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {data && data.attention.length === 0 ? (
          <EmptyCard icon="checkmark-done-circle" title="All caught up" body="No missing or pending work right now." />
        ) : (
          <Card className="list-card">
            {data?.attention.map((item) => (
              <div key={item.assessment_id} className="dash-item">
                <div>
                  <p className="dash-item-title">
                    {item.title} · {item.class_name}
                  </p>
                  <p className="dash-item-meta">
                    {item.subject_name}
                    {item.due_date ? ` · Due ${shortDate(item.due_date)}` : ''}
                  </p>
                </div>
                <div className="dash-badges">
                  {item.missing > 0 ? <StatusBadge label={`${item.missing} Missing`} tone="danger" /> : null}
                  {item.pending > 0 ? <StatusBadge label={`${item.pending} Pending Verification`} tone="warning" /> : null}
                  {item.overdue > 0 ? <StatusBadge label="Overdue" tone="danger" /> : null}
                </div>
                <div className="dash-actions">
                  <Button
                    label={item.pending > 0 ? 'Review' : 'View'}
                    variant={item.pending > 0 ? 'primary' : 'secondary'}
                    icon={item.pending > 0 ? 'shield-checkmark-outline' : 'eye-outline'}
                    onPress={() => navigate(`/teacher/assessments/${item.assessment_id}`)}
                  />
                  {item.missing > 0 ? (
                    <Button
                      label="Send Reminder"
                      variant="secondary"
                      icon="megaphone-outline"
                      loading={preparing === item.assessment_id}
                      disabled={preparing !== null}
                      onPress={() => void remindMissing(item)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </Card>
        )}
      </LoadGate>

      <SectionTitle>Quick Access</SectionTitle>
      <div className="dash-tiles">
        <IconTile icon="add-circle-outline" tint={colors.accentSoft} color={colors.heading} label="Create Assessment" onPress={() => navigate('/teacher/sections')} />
        <IconTile icon="folder-open-outline" tint={colors.accentSoft} color={colors.heading} label="Open Section" onPress={() => navigate('/teacher/sections')} />
        <IconTile icon="megaphone-outline" tint={colors.dangerSoft} color={colors.danger} label="Send Reminder" onPress={() => setPicking(true)} />
        <IconTile
          icon="shield-checkmark-outline"
          tint={colors.warningSoft}
          color={colors.warning}
          label="Review Pending"
          onPress={() => navigate('/teacher/notifications?filter=PENDING')}
        />
      </div>

      <SectionTitle right={<Link className="dash-link" to="/teacher/notifications">See all</Link>}>Recent Updates</SectionTitle>
      {data && data.updates.length === 0 ? (
        <EmptyCard icon="notifications-outline" title="No updates yet" body="Submissions and students joining will show here." />
      ) : data ? (
        <Card className="list-card">
          {data.updates.map((n) => (
            <div key={n.id} className={`dash-update${n.read_at ? '' : ' unread'}`}>
              <p className="dash-item-title">
                {n.title}
                {n.read_at ? null : <span className="visually-hidden"> (unread)</span>}
              </p>
              {n.body ? <p className="dash-item-meta">{n.body}</p> : null}
              <p className="dash-item-meta">{new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
            </div>
          ))}
        </Card>
      ) : null}

      {picking ? (
        <PickSectionDialog
          onClose={() => setPicking(false)}
          onPick={(section) => {
            setPicking(false);
            onRemind({ classId: section.id, recipientsLabel: `Whole section: ${section.name}` });
          }}
        />
      ) : null}
    </>
  );
}

/** Compact status number; urgent ones (more than zero) get their tone and a word badge. */
function QuickStat({ value, label, tone, badge }: { value: number; label: string; tone?: Tone; badge?: string }) {
  const urgent = tone !== undefined && value > 0;
  return (
    <div className={`dash-stat${urgent ? ` urgent tone-${tone}` : ''}`} role="group" aria-label={`${label}: ${value}`}>
      <span className="dash-stat-value">{value}</span>
      <span className="dash-stat-label">{label}</span>
      {urgent && badge ? <StatusBadge label={badge} tone={tone} /> : null}
    </div>
  );
}

function PickSectionDialog({ onClose, onPick }: { onClose: () => void; onPick: (section: SectionRow) => void }) {
  const sections = useLoad(allSections);
  const [classId, setClassId] = useState<string | null>(null);
  const picked = sections.data?.find((s) => s.id === classId);

  return (
    <Dialog title="Send reminder" onClose={onClose}>
      <p className="dialog-text">Choose the section. Every student in it, and their parents, get the reminder.</p>
      <LoadGate loading={sections.loading} error={sections.error} hasData={sections.data !== undefined} onRetry={sections.reload}>
        <div className="stack">
          <SelectField
            label="Section"
            icon="folder-outline"
            placeholder="Choose a section"
            value={classId}
            options={(sections.data ?? []).map((s) => ({ value: s.id, label: `${s.name} (${plural(s.student_count, 'student')})` }))}
            onChange={setClassId}
          />
          <Button label="Continue" icon="arrow-forward" disabled={!picked} onPress={() => picked && onPick(picked)} />
        </div>
      </LoadGate>
      <Button label="Cancel" variant="ghost" onPress={onClose} />
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

/** Submitted or verified completion for one section; the two are never merged. */
function sectionCompletion(s: SectionAnalytics, basis: Basis) {
  if (basis === 'verified') return { done: s.verified, ...completion(s.verified, s.expected) };
  return { done: s.submitted, percent: s.percent, status: s.status, label: COMPLETION_LABEL[s.status], tone: COMPLETION_TONE[s.status] };
}

function Analytics({ onRemind }: { onRemind: (target: ReminderTarget) => void }) {
  const { data, error, loading, reload } = useLoad(sectionAnalytics);
  const [basis, setBasis] = useState<Basis>('submitted');
  const [drill, setDrill] = useState<SectionAnalytics | null>(null);

  return (
    <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
      {data ? (
        <>
          <SectionTitle>Section Completion</SectionTitle>
          <Segmented options={BASES} value={basis} onChange={setBasis} />
          <Card>
            <p className="dash-item-meta">
              {basis === 'submitted' ? 'Submitted out of expected.' : 'Verified by you out of expected.'} Tap a section to see its assessments.
            </p>
            <div className="dash-donuts">
              {data.map((s) => {
                const c = sectionCompletion(s, basis);
                return (
                  <Donut
                    key={s.class_id}
                    percent={c.percent}
                    tone={c.tone}
                    center={`${c.done}/${s.expected}`}
                    caption={`${s.class_name} · ${c.label}`}
                    label={`${s.class_name}: ${c.done} of ${s.expected} ${basis}, ${c.percent}%, ${c.label}. Open assessments.`}
                    onPress={() => setDrill(s)}
                  />
                );
              })}
            </div>
          </Card>

          <SectionTitle>Section Analytics</SectionTitle>
          {data.map((s) => (
            <SectionCard key={s.class_id} section={s} />
          ))}

          <SectionTitle>Subject Analytics</SectionTitle>
          {data.length > 0 ? <SubjectAnalytics sections={data} /> : null}
        </>
      ) : null}

      {drill ? (
        <DrillDialog
          section={drill}
          onClose={() => setDrill(null)}
          onRemind={() => {
            setDrill(null);
            onRemind({ classId: drill.class_id, recipientsLabel: `Whole section: ${drill.class_name}` });
          }}
        />
      ) : null}
    </LoadGate>
  );
}

function SectionCard({ section: s }: { section: SectionAnalytics }) {
  const verified = completion(s.verified, s.expected);
  return (
    <Card>
      <div className="dash-card-head">
        <p className="dash-item-title">{s.class_name}</p>
        <StatusBadge label={COMPLETION_LABEL[s.status]} tone={COMPLETION_TONE[s.status]} />
      </div>
      <Bar label="Submitted" done={s.submitted} total={s.expected} percent={s.percent} tone={COMPLETION_TONE[s.status]} />
      <Bar label="Verified" done={s.verified} total={s.expected} percent={verified.percent} tone={verified.tone} />
      <div className="dash-numbers">
        <Figure label="Expected" value={s.expected} />
        <Figure label="Submitted" value={s.submitted} />
        <Figure label="Verified" value={s.verified} />
        <Figure label="Missing" value={s.missing} tone="danger" />
        <Figure label="Pending" value={s.pending} tone="warning" />
        <Figure label="Overdue" value={s.overdue} tone="danger" />
      </div>
    </Card>
  );
}

function Bar({ label, done, total, percent, tone }: { label: string; done: number; total: number; percent: number; tone: Tone }) {
  return (
    <div className="dash-bar-row">
      <div className="dash-bar-label">
        <span>{label}</span>
        <span>
          {done}/{total} · {percent}%
        </span>
      </div>
      <ProgressBar percent={percent} tone={tone} label={`${label}: ${done} of ${total}, ${percent}%`} />
    </div>
  );
}

function Figure({ label, value, tone }: { label: string; value: number; tone?: Tone }) {
  const urgent = tone !== undefined && value > 0;
  return (
    <div className={`dash-number${urgent ? ` urgent tone-${tone}` : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function SubjectAnalytics({ sections }: { sections: SectionAnalytics[] }) {
  const [classId, setClassId] = useState(sections[0]?.class_id ?? '');
  const subjects = useLoad(() => sectionSubjects(classId), classId);

  return (
    <Card>
      <SelectField label="Section" icon="folder-outline" value={classId} options={sections.map((s) => ({ value: s.class_id, label: s.class_name }))} onChange={setClassId} />
      <LoadGate loading={subjects.loading} error={subjects.error} hasData={subjects.data !== undefined} onRetry={subjects.reload}>
        {subjects.data && subjects.data.length === 0 ? <p className="dash-item-meta">No subjects in this section yet.</p> : null}
        {subjects.data?.map((sub) => (
          <div key={sub.subject_id} className="dash-item">
            <div className="dash-card-head">
              <Link className="dash-item-title" to={`/teacher/subjects/${sub.subject_id}`}>
                {sub.subject_name}
              </Link>
              <StatusBadge label={COMPLETION_LABEL[sub.status]} tone={COMPLETION_TONE[sub.status]} />
            </div>
            <Bar label="Submitted" done={sub.submitted} total={sub.expected} percent={sub.percent} tone={COMPLETION_TONE[sub.status]} />
            <p className="dash-item-meta">
              {plural(sub.assessments, 'assessment')} · {sub.missing} missing · {sub.pending} pending · {sub.verified} verified
            </p>
          </div>
        ))}
      </LoadGate>
    </Card>
  );
}

/** One section's assessments, newest first, from a tapped donut (§40). */
function DrillDialog({ section, onClose, onRemind }: { section: SectionAnalytics; onClose: () => void; onRemind: () => void }) {
  const [page, setPage] = useState(0);
  const list = useLoad(() => listAssessmentProgress({ classId: section.class_id, page }), `${section.class_id}:${page}`);

  return (
    <Dialog title={section.class_name} onClose={onClose}>
      <LoadGate loading={list.loading} error={list.error} hasData={list.data !== undefined} onRetry={list.reload}>
        {list.data && list.data.rows.length === 0 ? <p className="dialog-text">No assessments in this section yet.</p> : null}
        <div>
          {list.data?.rows.map((a) => (
            <Link key={a.assessment_id} className="dash-drill-row" to={`/teacher/assessments/${a.assessment_id}`}>
              <span style={{ minWidth: 0 }}>
                <span className="dash-item-title ellipsis" style={{ display: 'block' }}>
                  {a.title}
                </span>
                <span className="dash-item-meta" style={{ display: 'block' }}>
                  {a.subject_name} · {a.submitted}/{a.required} Submitted, {a.missing} Missing
                </span>
              </span>
              <StatusBadge label={COMPLETION_LABEL[a.status]} tone={COMPLETION_TONE[a.status]} />
            </Link>
          ))}
        </div>
        {list.data ? <Pagination page={page} total={list.data.total} onPage={setPage} /> : null}
      </LoadGate>
      <div className="stack">
        <Button label="Send Reminder to section" icon="megaphone-outline" variant="secondary" onPress={onRemind} />
        <Button label="Close" variant="ghost" onPress={onClose} />
      </div>
    </Dialog>
  );
}
