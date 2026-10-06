import { useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { authErrorMessage } from '@/features/auth/api';
import {
  archiveNotification,
  assessmentStudents,
  listNotifications,
  listSections,
  markNotificationsRead,
  needsAttention,
  NOTIFICATION_TYPES,
  notificationStatus,
  sectionSubjects,
  studentMemberships,
  verifyEvidence,
  type AppNotification,
  type AttentionItem,
  type NotificationFilter,
  type NotificationType,
  type Page,
} from '@/features/teacher/api';
import { PAGE_SIZE } from '@/features/teacher/progress';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Charts';
import { SendReminderDialog, SendReportDialog } from '../../ui/CommunicationDialogs';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { ArchivedSwitch, NotificationItem, RowAction } from '../../ui/NotificationList';
import { Notice, Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';

import { notificationsChanged } from './useTeacherBadge';
import './people.css';

type Tab = NotificationFilter | 'OVERDUE';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PASS', label: 'Pass' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const TYPE_LABELS: Record<NotificationType, string> = {
  SUBMISSION_CREATED: 'New submission',
  SUBMISSION_VERIFIED: 'Submission verified',
  SUBMISSION_REJECTED: 'Submission rejected',
  SCORE_UPDATED: 'Score updated',
  STUDENT_JOINED: 'Student joined',
  STUDENT_LEFT: 'Student left',
  TEACHER_REMINDER: 'Reminder',
  TEACHER_REPORT: 'Report',
  ASSESSMENT_CREATED: 'New assessment',
  CLASS_JOINED: 'Joined a class',
};
// Teachers never receive ASSESSMENT_CREATED or CLASS_JOINED.
const TYPE_OPTIONS = NOTIFICATION_TYPES.filter((t) => t !== 'ASSESSMENT_CREATED' && t !== 'CLASS_JOINED').map((t) => ({ value: t, label: TYPE_LABELS[t] }));

/** Types that are about one student's work or membership, so a reminder or report makes sense. */
const STUDENT_TYPES: readonly NotificationType[] = ['SUBMISSION_CREATED', 'SUBMISSION_VERIFIED', 'SUBMISSION_REJECTED', 'SCORE_UPDATED', 'STUDENT_JOINED', 'STUDENT_LEFT'];

type Loaded = { kind: 'notifications'; page: Page<AppNotification> } | { kind: 'overdue'; rows: AttentionItem[] };

/** What a dialog is open for. */
type Open =
  | { kind: 'reminder'; classId: string; label: string; studentProfileIds: string[]; assessmentId?: string; message?: string }
  | { kind: 'report'; classId: string; studentProfileId: string; studentName: string; subjectId?: string };

const shortDate = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/** Teacher Notifications (PRD v0.5 §17–§20): what happened, and what needs action. */
export default function TeacherNotifications() {
  const navigate = useNavigate();
  // The Dashboard's "Review Pending" opens this screen with ?filter=PENDING.
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const asked = params.get('filter');
    return asked === 'PASS' || asked === 'PENDING' || asked === 'OVERDUE' ? asked : 'ALL';
  });
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<NotificationType | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [open, setOpen] = useState<Open | null>(null);

  // The first 20 sections are enough for the filter; teachers rarely have more.
  const sections = useLoad(() => listSections({ page: 0 }), 'sections');
  const subjects = useLoad(async () => (classId ? sectionSubjects(classId) : []), `subjects:${classId}`);

  const key = JSON.stringify({ tab, search, classId, subjectId, type, from, to, archived, page });
  const { data, error, loading, reload } = useLoad<Loaded>(async () => {
    if (tab === 'OVERDUE') {
      const term = search.toLowerCase();
      const rows = (await needsAttention(50)).filter(
        (a) => a.overdue > 0 && (!classId || a.class_id === classId) && (!term || `${a.title} ${a.subject_name} ${a.class_name}`.toLowerCase().includes(term)),
      );
      return { kind: 'overdue', rows };
    }
    return { kind: 'notifications', page: await listNotifications({ filter: tab, classId, subjectId, type, search, from, to, archived, page }) };
  }, key);

  /** Every filter change starts again from the first page. */
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
      setDone(null);
    };

  const act = async (id: string, work: () => Promise<void>, message?: string) => {
    setActionError(null);
    setDone(null);
    setBusyId(id);
    try {
      await work();
      notificationsChanged();
      if (message) setDone(message);
      reload();
    } catch (e) {
      setActionError(authErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const view = (n: AppNotification) => {
    const path = n.assessment_id
      ? `/teacher/assessments/${n.assessment_id}`
      : n.student_profile_id
        ? `/teacher/students/${n.student_profile_id}`
        : n.class_id
          ? `/teacher/sections/${n.class_id}`
          : null;
    if (!path) return;
    // Opening a notification reads it; not worth an error if that fails.
    if (n.read_at === null) markNotificationsRead([n.id]).then(notificationsChanged, () => undefined);
    navigate(path);
  };

  /** Looks up the student's name so the dialog can address them. */
  const openForStudent = async (n: AppNotification, kind: 'reminder' | 'report') => {
    if (!n.student_profile_id || !n.class_id) return;
    const studentProfileId = n.student_profile_id;
    const classId = n.class_id;
    setBusyId(n.id);
    let name = 'this student';
    try {
      name = (await studentMemberships(studentProfileId))[0]?.display_name ?? name;
    } catch {
      // The dialog still works without the name.
    }
    setBusyId(null);
    setOpen(
      kind === 'reminder'
        ? { kind, classId, label: name, studentProfileIds: [studentProfileId], assessmentId: n.assessment_id ?? undefined }
        : { kind, classId, studentProfileId, studentName: name, subjectId: n.subject_id ?? undefined },
    );
  };

  /** Remind the students still missing an overdue assessment. */
  const remindOverdue = async (a: AttentionItem) => {
    setActionError(null);
    setDone(null);
    setBusyId(a.assessment_id);
    try {
      const ids: string[] = [];
      for (let p = 0; ; p++) {
        const result = await assessmentStudents({ assessmentId: a.assessment_id, status: 'MISSING', page: p });
        ids.push(...result.rows.map((r) => r.student_profile_id));
        if (result.rows.length < PAGE_SIZE || ids.length >= result.total) break;
      }
      if (ids.length === 0) {
        setDone('Everyone has submitted this one now.');
        reload();
        return;
      }
      setOpen({
        kind: 'reminder',
        classId: a.class_id,
        label: `${ids.length} missing ${ids.length === 1 ? 'student' : 'students'}`,
        studentProfileIds: ids,
        assessmentId: a.assessment_id,
        message: `${a.title} is overdue. Please submit it as soon as you can.`,
      });
    } catch (e) {
      setActionError(authErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const sectionOptions = (sections.data?.rows ?? []).map((s) => ({ value: s.id, label: s.name }));
  const subjectOptions = (subjects.data ?? []).map((s) => ({ value: s.subject_id, label: s.subject_name }));
  const overdue = tab === 'OVERDUE';
  const activeFilters = [classId, overdue ? '' : subjectId, overdue ? '' : type, overdue ? '' : from, overdue ? '' : to].filter(Boolean).length;

  const notes = data?.kind === 'notifications' ? data.page : null;
  const overdueRows = data?.kind === 'overdue' ? data.rows : null;
  const busy = busyId !== null;

  return (
    <Screen tabs>
      <PageHeader title="Notifications" subtitle="What happened, and what needs action." />

      <Segmented options={TABS} value={tab} onChange={change(setTab)} />

      <ListToolbar
        search={<SearchInput value={search} onChange={change(setSearch)} placeholder={overdue ? 'Search assessments' : 'Search notifications'} />}
        activeFilters={activeFilters}
        filters={
          <>
            <FilterSelect
              label="Section"
              value={classId}
              options={sectionOptions}
              allLabel="All sections"
              onChange={(value) => {
                change(setClassId)(value);
                setSubjectId('');
              }}
            />
            {classId && !overdue ? <FilterSelect label="Subject" value={subjectId} options={subjectOptions} allLabel="All subjects" onChange={change(setSubjectId)} /> : null}
            {!overdue ? (
              <>
                <FilterSelect label="Type" value={type} options={TYPE_OPTIONS} allLabel="All types" onChange={change(setType)} />
                <DateFilter label="From" value={from} max={to || undefined} onChange={change(setFrom)} />
                <DateFilter label="To" value={to} min={from || undefined} onChange={change(setTo)} />
              </>
            ) : null}
          </>
        }
      />

      {!overdue ? (
        <div className="list-bar">
          <ArchivedSwitch checked={archived} onChange={change(setArchived)} />
          {!archived && (notes?.total ?? 0) > 0 ? (
            <button type="button" className="link-btn" disabled={busy} onClick={() => act('all', () => markNotificationsRead(), 'All notifications marked read.')}>
              Mark all read
            </button>
          ) : null}
        </div>
      ) : null}

      {done ? (
        <Notice tone="success" title="Done">
          {done}
        </Notice>
      ) : null}
      {actionError ? (
        <Notice tone="danger" title="Could not do that">
          {actionError}
        </Notice>
      ) : null}

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {overdueRows ? (
          overdueRows.length === 0 ? (
            <EmptyCard icon="happy-outline" title="Nothing overdue." body="Assessments past their due date with missing work show here." />
          ) : (
            <>
              <Card className="list-card">
                {overdueRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((a) => (
                  <div key={a.assessment_id} className="list-item">
                    <div className="list-item-head">
                      <div className="person-text">
                        <span className="person-name">
                          {a.title} · {a.class_name}
                        </span>
                        <span className="person-meta">
                          {a.subject_name} · {a.overdue} overdue{a.due_date ? ` (due ${shortDate(a.due_date)})` : ''}
                        </span>
                      </div>
                      <StatusBadge label="Overdue" tone="danger" />
                    </div>
                    <div className="row-actions">
                      <RowAction label="View" icon="eye-outline" onPress={() => navigate(`/teacher/assessments/${a.assessment_id}`)} />
                      <RowAction
                        label={`Send Reminder to ${a.overdue}`}
                        icon="mail-outline"
                        tone="primary"
                        disabled={busy}
                        onPress={() => remindOverdue(a)}
                      />
                    </div>
                  </div>
                ))}
              </Card>
              <Pagination page={page} total={overdueRows.length} onPage={setPage} />
            </>
          )
        ) : notes ? (
          notes.rows.length === 0 ? (
            <EmptyCard icon="notifications-outline" title="No notifications." body="You're all caught up." />
          ) : (
            <>
              <Card className="list-card">
                {notes.rows.map((n, i) => {
                  const status = notificationStatus(n);
                  const student = n.student_profile_id !== null && n.class_id !== null && STUDENT_TYPES.includes(n.type);
                  const canView = n.assessment_id !== null || n.student_profile_id !== null || n.class_id !== null;
                  return (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      divider={i > 0}
                      badge={status ? <StatusBadge label={status === 'PASS' ? 'Pass' : 'Pending'} tone={status === 'PASS' ? 'success' : 'warning'} /> : null}
                    >
                      {canView ? <RowAction label="View" icon="eye-outline" onPress={() => view(n)} /> : null}
                      {status === 'PENDING' && n.evidence_id ? (
                        <RowAction
                          label="Verify"
                          icon="checkmark-circle"
                          tone="primary"
                          disabled={busy}
                          onPress={() => n.evidence_id && act(n.id, () => verifyEvidence(n.evidence_id as string), 'Submission verified.')}
                        />
                      ) : null}
                      {student ? <RowAction label="Send Reminder" icon="mail-outline" disabled={busy} onPress={() => openForStudent(n, 'reminder')} /> : null}
                      {student ? <RowAction label="Send Report" icon="document-text" disabled={busy} onPress={() => openForStudent(n, 'report')} /> : null}
                      {n.read_at === null ? <RowAction label="Mark Read" icon="checkmark" disabled={busy} onPress={() => act(n.id, () => markNotificationsRead([n.id]))} /> : null}
                      {n.archived_at === null ? (
                        <RowAction
                          label="Archive"
                          icon="archive-outline"
                          disabled={busy}
                          onPress={() => {
                            // Archiving the last row on a page steps back a page.
                            if (notes.rows.length === 1 && page > 0) setPage(page - 1);
                            act(n.id, () => archiveNotification(n.id));
                          }}
                        />
                      ) : null}
                    </NotificationItem>
                  );
                })}
              </Card>
              <Pagination page={page} total={notes.total} onPage={setPage} />
            </>
          )
        ) : null}
      </LoadGate>

      {open?.kind === 'reminder' ? (
        <SendReminderDialog
          classId={open.classId}
          recipientsLabel={open.label}
          studentProfileIds={open.studentProfileIds}
          assessmentId={open.assessmentId}
          defaultMessage={open.message}
          onClose={() => setOpen(null)}
          onSent={(recipients) => {
            setOpen(null);
            setDone(`Reminder sent to ${recipients} ${recipients === 1 ? 'student' : 'students'} and their parents.`);
          }}
        />
      ) : null}
      {open?.kind === 'report' ? (
        <SendReportDialog
          classId={open.classId}
          studentProfileId={open.studentProfileId}
          studentName={open.studentName}
          subjectId={open.subjectId}
          onClose={() => setOpen(null)}
          onSent={() => {
            setOpen(null);
            setDone(`Report sent to ${open.studentName}'s parents.`);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** Labelled date input styled like FilterSelect. '' means no limit. */
function DateFilter({ label, value, onChange, min, max }: { label: string; value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const id = useId();
  return (
    <span className="filter-select">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}
