import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { z } from 'zod';

import { authErrorMessage } from '@/features/auth/api';
import { EVIDENCE_STATUSES } from '@/features/evidence/constants';
import {
  listSections,
  MEMBER_STATUS_LABELS,
  moveStudent,
  REPORT_CATEGORY_LABELS,
  setMemberStatus,
  studentMemberships,
  studentMissingWork,
  studentReminders,
  studentReports,
  type MemberStatus,
  type StudentRow,
} from '@/features/teacher/api';
import { supabase } from '@/lib/supabase';
import { useLoad, type Loaded } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Charts';
import { SendReminderDialog, SendReportDialog } from '../../ui/CommunicationDialogs';
import { EmptyCard, LoadGate, StatusPill } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { RowAction } from '../../ui/NotificationList';
import { Notice, Screen, SectionTitle, TopBar } from '../../ui/Screen';
import { SelectField } from '../../ui/SelectField';
import { Spinner } from '../../ui/Spinner';

import './people.css';

const STATUS_TONE = { ACTIVE: 'success', INACTIVE: 'warning', REMOVED: 'neutral' } as const;

const submissionRow = z.object({
  id: z.uuid(),
  status: z.enum(EVIDENCE_STATUSES),
  score: z.union([z.null(), z.coerce.number()]),
  uploaded_at: z.string(),
  assessment: z.object({ id: z.uuid(), title: z.string(), total_score: z.coerce.number(), subject: z.string() }).nullable(),
});
type Submission = z.infer<typeof submissionRow>;

/** The student's latest papers; RLS returns only those in the caller's sections. */
async function studentSubmissions(studentProfileId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('evidence')
    .select('id, status, score, uploaded_at, assessment:assessments(id, title, total_score, subject)')
    .eq('student_profile_id', studentProfileId)
    .order('uploaded_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return z.array(submissionRow).parse(data ?? []);
}

const shortDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type Open =
  | { kind: 'move'; member: StudentRow }
  | { kind: 'remove'; member: StudentRow }
  | { kind: 'report'; member: StudentRow }
  | { kind: 'reminder'; member: StudentRow };

/** Teacher Student Detail (PRD v0.5 §27). Removing or moving never deletes history (§26). */
export default function TeacherStudent() {
  const { studentId = '' } = useParams();
  const [open, setOpen] = useState<Open | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const members = useLoad(() => studentMemberships(studentId), `members:${studentId}`);
  const missing = useLoad(() => studentMissingWork(studentId), `missing:${studentId}`);
  const submissions = useLoad(() => studentSubmissions(studentId), `submissions:${studentId}`);
  const reports = useLoad(() => studentReports(studentId), `reports:${studentId}`);
  const reminders = useLoad(() => studentReminders(studentId), `reminders:${studentId}`);

  const memberships = members.data ?? [];
  const name = memberships[0]?.display_name ?? 'Student';
  const current = memberships.filter((m) => m.status !== 'REMOVED');
  const sectionName = (classId: string) => memberships.find((m) => m.class_id === classId)?.class_name ?? 'Section';

  const changeStatus = async (m: StudentRow, status: MemberStatus) => {
    setActionError(null);
    setDone(null);
    setBusy(m.class_id);
    try {
      await setMemberStatus(m.class_id, studentId, status);
      setOpen(null);
      setDone(`${name} is now ${MEMBER_STATUS_LABELS[status].toLowerCase()} in ${m.class_name}.`);
      members.reload();
      missing.reload();
    } catch (e) {
      setActionError(authErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <TopBar title={members.data ? name : 'Student'} />
      <Screen tabs>
        <LoadGate loading={members.loading} error={members.error} hasData={members.data !== undefined} onRetry={members.reload}>
          {memberships.length === 0 ? (
            <EmptyCard icon="person-outline" title="Student not found." body="They may not be in any of your sections." />
          ) : (
            <>
              <Card>
                <p className="person-name" style={{ fontSize: 22, fontWeight: 800 }}>
                  {name}
                </p>
                <p className="muted">{current.length > 0 ? current.map((m) => m.class_name).join(' · ') : 'Not in any of your sections now'}</p>
              </Card>

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

              <SectionTitle>Sections</SectionTitle>
              <Card className="list-card">
                {memberships.map((m) => (
                  <div key={m.class_id} className="list-item">
                    <div className="list-item-head">
                      <div className="person-text">
                        <span className="person-name">{m.class_name}</span>
                        <span className="person-meta">
                          Joined {shortDate(m.joined_at)} · {m.subject_count} {m.subject_count === 1 ? 'Subject' : 'Subjects'}
                          {m.missing_count > 0 ? ` · ${m.missing_count} missing` : ''}
                        </span>
                      </div>
                      <StatusBadge label={MEMBER_STATUS_LABELS[m.status]} tone={STATUS_TONE[m.status]} />
                    </div>
                    <div className="row-actions">
                      {m.status === 'ACTIVE' ? (
                        <RowAction label="Send Reminder" icon="mail-outline" tone="primary" onPress={() => setOpen({ kind: 'reminder', member: m })} />
                      ) : null}
                      {m.status !== 'REMOVED' ? <RowAction label="Send Report" icon="document-text" onPress={() => setOpen({ kind: 'report', member: m })} /> : null}
                      {m.status !== 'REMOVED' ? <RowAction label="Move" icon="swap-horizontal" onPress={() => setOpen({ kind: 'move', member: m })} /> : null}
                      {m.status === 'ACTIVE' ? (
                        <RowAction label="Mark Inactive" icon="pause-circle-outline" disabled={busy !== null} onPress={() => changeStatus(m, 'INACTIVE')} />
                      ) : (
                        <RowAction label="Reactivate" icon="refresh" disabled={busy !== null} onPress={() => changeStatus(m, 'ACTIVE')} />
                      )}
                      {m.status !== 'REMOVED' ? (
                        <RowAction label="Remove from Section" icon="person-remove-outline" tone="danger" onPress={() => setOpen({ kind: 'remove', member: m })} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </Card>

              <SectionTitle>Missing work</SectionTitle>
              <Block loaded={missing} empty="No missing work.">
                {(rows) =>
                  rows.map((w) => (
                    <Link key={`${w.assessment_id}`} to={`/teacher/assessments/${w.assessment_id}`} className="person-row">
                      <div className="person-text">
                        <span className="person-name ellipsis">{w.title}</span>
                        <span className="person-meta">
                          {w.subject_name} · {w.class_name}
                          {w.due_date ? ` · Due ${shortDate(w.due_date)}` : ''}
                        </span>
                        {w.overdue ? <StatusBadge label="Overdue" tone="danger" /> : <StatusBadge label="Missing" tone="warning" />}
                      </div>
                      <Icon name="chevron-forward" size={20} className="chevron" />
                    </Link>
                  ))
                }
              </Block>

              <SectionTitle>Submissions</SectionTitle>
              <Block loaded={submissions} empty="No submissions yet.">
                {(rows) =>
                  rows.map((s) => {
                    const body = (
                      <>
                        <div className="person-text">
                          <span className="person-name ellipsis">{s.assessment?.title ?? 'Assessment'}</span>
                          <span className="person-meta">
                            {[s.assessment?.subject, shortDate(s.uploaded_at), s.score !== null && s.assessment ? `${s.score}/${s.assessment.total_score}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          <StatusPill status={s.status} />
                        </div>
                        <Icon name="chevron-forward" size={20} className="chevron" />
                      </>
                    );
                    return s.assessment ? (
                      <Link key={s.id} to={`/teacher/assessments/${s.assessment.id}`} className="person-row">
                        {body}
                      </Link>
                    ) : (
                      <div key={s.id} className="person-row">
                        {body}
                      </div>
                    );
                  })
                }
              </Block>

              <SectionTitle>Reports</SectionTitle>
              <Block loaded={reports} empty="No reports sent yet.">
                {(rows) =>
                  rows.map((r) => (
                    <div key={r.id} className="list-item">
                      <div className="list-item-head">
                        <span className="person-meta">
                          {sectionName(r.class_id)} · {shortDate(r.created_at)}
                          {r.visible_to_student ? ' · Shared with student' : ''}
                        </span>
                        <StatusBadge label={REPORT_CATEGORY_LABELS[r.category]} tone={r.category === 'GOOD_PROGRESS' ? 'success' : r.category === 'GENERAL_NOTE' || r.category === 'PARTICIPATION' ? 'neutral' : 'warning'} />
                      </div>
                      <p style={{ fontSize: 15, lineHeight: '21px', overflowWrap: 'anywhere' }}>{r.message}</p>
                    </div>
                  ))
                }
              </Block>

              <SectionTitle>Reminders sent</SectionTitle>
              <Block loaded={reminders} empty="No reminders sent yet.">
                {(rows) =>
                  rows.map((r) => (
                    <div key={r.id} className="list-item">
                      <span className="person-meta">
                        {sectionName(r.class_id)} · {shortDate(r.created_at)}
                        {r.due_date ? ` · Due ${shortDate(r.due_date)}` : ''}
                      </span>
                      <p style={{ fontSize: 15, lineHeight: '21px', overflowWrap: 'anywhere' }}>{r.message}</p>
                    </div>
                  ))
                }
              </Block>
            </>
          )}
        </LoadGate>
      </Screen>

      {open?.kind === 'reminder' ? (
        <SendReminderDialog
          classId={open.member.class_id}
          recipientsLabel={name}
          studentProfileIds={[studentId]}
          onClose={() => setOpen(null)}
          onSent={() => {
            setOpen(null);
            setDone(`Reminder sent to ${name}.`);
            reminders.reload();
          }}
        />
      ) : null}
      {open?.kind === 'report' ? (
        <SendReportDialog
          classId={open.member.class_id}
          studentProfileId={studentId}
          studentName={name}
          onClose={() => setOpen(null)}
          onSent={() => {
            setOpen(null);
            setDone(`Report sent to ${name}'s parents.`);
            reports.reload();
          }}
        />
      ) : null}
      {open?.kind === 'remove' ? (
        <Dialog title={`Remove from ${open.member.class_name}?`} onClose={() => setOpen(null)} busy={busy !== null}>
          <p className="dialog-text">
            {name} leaves this section&apos;s lists and won&apos;t get new work. Their submissions, scores, reports and reminders stay saved, and you can
            reactivate them later.
          </p>
          <Button label="Remove from Section" variant="danger" icon="person-remove-outline" loading={busy !== null} onPress={() => changeStatus(open.member, 'REMOVED')} />
          <Button label="Cancel" variant="ghost" onPress={() => setOpen(null)} disabled={busy !== null} />
        </Dialog>
      ) : null}
      {open?.kind === 'move' ? (
        <MoveDialog
          member={open.member}
          name={name}
          onClose={() => setOpen(null)}
          onMoved={(to) => {
            setOpen(null);
            setDone(`${name} moved to ${to}.`);
            members.reload();
            missing.reload();
          }}
        />
      ) : null}
    </>
  );
}

/** A card of rows for one part of the page, with its own loading, error and empty states. */
function Block<T>({ loaded, empty, children }: { loaded: Loaded<T[]>; empty: string; children: (rows: T[]) => ReactNode }) {
  if (loaded.data === undefined) {
    if (loaded.error) {
      return (
        <Notice tone="danger" title="Could not load">
          {loaded.error}
        </Notice>
      );
    }
    return <Spinner />;
  }
  if (loaded.data.length === 0) return <p className="muted">{empty}</p>;
  return <Card className="list-card">{children(loaded.data)}</Card>;
}

/** Moves the student to another of the teacher's sections; the old membership becomes Removed. */
function MoveDialog({ member, name, onClose, onMoved }: { member: StudentRow; name: string; onClose: () => void; onMoved: (sectionName: string) => void }) {
  // The first 20 sections; teachers rarely have more.
  const sections = useLoad(() => listSections({ page: 0 }), 'sections');
  const options = (sections.data?.rows ?? []).filter((s) => s.id !== member.class_id).map((s) => ({ value: s.id, label: s.name }));
  const [to, setTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const move = async () => {
    const target = options.find((o) => o.value === to);
    if (!target) {
      setError('Choose a section.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await moveStudent(member.student_profile_id, member.class_id, target.value);
      onMoved(target.label);
    } catch (e) {
      setError(authErrorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Move ${name}`} onClose={onClose} busy={busy}>
      <p className="dialog-text">From {member.class_name}. Their past work stays with {member.class_name}.</p>
      {sections.data === undefined ? (
        sections.error ? (
          <Notice tone="danger" title="Could not load your sections">
            {sections.error}
          </Notice>
        ) : (
          <Spinner />
        )
      ) : options.length === 0 ? (
        <Notice tone="info" title="No other section">
          Create another section first.
        </Notice>
      ) : (
        <SelectField label="Move to" icon="school-outline" value={to} options={options} placeholder="Choose a section" onChange={setTo} />
      )}
      {error ? (
        <Notice tone="danger" title="Not moved">
          {error}
        </Notice>
      ) : null}
      <Button label="Move Student" icon="swap-horizontal" loading={busy} disabled={options.length === 0} onPress={move} />
      <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
    </Dialog>
  );
}
