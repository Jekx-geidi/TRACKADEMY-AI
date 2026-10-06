import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';

import { ASSESSMENT_TYPE_LABELS, QUARTER_LABELS } from '@/features/assessments/constants';
import { authErrorMessage } from '@/features/auth/api';
import {
  assessmentProgress,
  assessmentStudents,
  bulkVerifyEvidence,
  correctScore,
  evidencePhotoUrl,
  getAssessment,
  rejectEvidence,
  setExemption,
  verifyEvidence,
  type AssessmentDetail,
  type SubmissionRow,
  type SubmissionSort,
  type SubmissionStatus,
} from '@/features/teacher/api';
import { completion, PAGE_SIZE } from '@/features/teacher/progress';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Donut, StatusBadge } from '../../ui/Charts';
import { SendReminderDialog } from '../../ui/CommunicationDialogs';
import { EmptyCard, LoadGate, StatRow, StatTile } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { Icon, type IconName } from '../../ui/Icon';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { Notice, Screen, SectionTitle, TopBar } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';
import { formatDate, formatDateTime, friendly, plural, scoreText, SUBMISSION_LABEL, SUBMISSION_TONE } from './sections/util';
import './sections.css';

const STATUS_OPTIONS = (['VERIFIED', 'PENDING', 'REJECTED', 'MISSING', 'EXEMPT'] as const).map((s) => ({ value: s, label: SUBMISSION_LABEL[s] }));
const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'score', label: 'Score' },
  { value: 'newest', label: 'Newest' },
] as const satisfies readonly { value: SubmissionSort; label: string }[];

/** The assessment, then its counts. Counts are optional so the page still opens without them. */
async function loadDetail(assessmentId: string) {
  const assessment = await getAssessment(assessmentId);
  const progress = assessment.classId ? await assessmentProgress(assessmentId, assessment.classId).catch(() => null) : null;
  return { assessment, progress };
}

/** Every MISSING student's id, a page at a time. */
async function missingStudentIds(assessmentId: string): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 0; ; page++) {
    const { rows, total } = await assessmentStudents({ assessmentId, status: 'MISSING', page });
    ids.push(...rows.map((r) => r.student_profile_id));
    if (rows.length < PAGE_SIZE || ids.length >= total) return ids;
  }
}

type Action = { kind: 'evidence' | 'reject' | 'score' | 'remind'; row: SubmissionRow } | { kind: 'remind-missing'; ids: string[] };

/** Assessment Detail (PRD v0.5 §15–§16): progress and every student's submission. */
export default function TeacherAssessment() {
  const { assessmentId = '' } = useParams();
  const detail = useLoad(() => friendly(loadDetail(assessmentId)), assessmentId);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubmissionStatus | ''>('');
  const [sort, setSort] = useState<SubmissionSort>('name');
  const [page, setPage] = useState(0);
  const query = { assessmentId, search, status, sort, page };
  const list = useLoad(() => friendly(assessmentStudents(query)), JSON.stringify(query));

  const [action, setAction] = useState<Action | null>(null);
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [gatheringMissing, setGatheringMissing] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };

  const refresh = () => {
    list.reload();
    detail.reload();
  };

  /** Runs a one-tap action (Verify, Exempt) and reloads the list and counts. */
  const run = async (row: SubmissionRow, done: string, task: () => Promise<void>) => {
    setBusyRow(row.student_profile_id);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: 'success', text: done });
      refresh();
    } catch (err) {
      setMessage({ tone: 'danger', text: authErrorMessage(err) });
    } finally {
      setBusyRow(null);
    }
  };

  const finish = (text: string) => {
    setAction(null);
    setMessage({ tone: 'success', text });
    refresh();
  };

  const remindMissing = async () => {
    setGatheringMissing(true);
    setMessage(null);
    try {
      const ids = await missingStudentIds(assessmentId);
      if (ids.length === 0) setMessage({ tone: 'success', text: 'No students are missing this assessment.' });
      else setAction({ kind: 'remind-missing', ids });
    } catch (err) {
      setMessage({ tone: 'danger', text: authErrorMessage(err) });
    } finally {
      setGatheringMissing(false);
    }
  };

  const verifyPending = async () => {
    setBulkBusy(true); setMessage(null);
    try {
      const ids = (list.data?.rows ?? []).filter((row) => row.row_status === 'PENDING' && row.evidence_id).map((row) => row.evidence_id as string);
      if (!ids.length) setMessage({ tone: 'success', text: 'No pending submissions on this page.' });
      else { const count = await bulkVerifyEvidence(ids); setMessage({ tone: 'success', text: `${count} submissions verified.` }); refresh(); }
    } catch (err) { setMessage({ tone: 'danger', text: authErrorMessage(err) }); } finally { setBulkBusy(false); }
  };

  const a = detail.data?.assessment;
  const p = detail.data?.progress ?? null;
  const classId = a?.classId ?? null;

  return (
    <>
      <TopBar title="Assessment" />
      <Screen tabs>
        <LoadGate loading={detail.loading} error={detail.error} hasData={detail.data !== undefined} onRetry={detail.reload}>
          {a ? (
            <>
              <Header assessment={a} />
              {p ? (
                <>
                  <Card>
                    <div className="sx-donuts">
                      <Metric done={p.submitted} required={p.required} word="Submitted" />
                      <Metric done={p.verified} required={p.required} word="Verified" />
                    </div>
                  </Card>
                  <StatRow>
                    <StatTile icon="alert-circle-outline" value={p.missing} label="Missing" tint={colors.dangerSoft} />
                    <StatTile icon="time" value={p.pending} label="Pending Review" tint={colors.warningSoft} />
                  </StatRow>
                </>
              ) : (
                <Notice tone="info" title="Counts unavailable">
                  The progress counts for this assessment could not be loaded. The student list below is still up to date.
                </Notice>
              )}
              {classId ? (
                <Button
                  label={`Remind all missing${p ? ` (${p.missing})` : ''}`}
                  icon="megaphone-outline"
                  variant="secondary"
                  loading={gatheringMissing}
                  disabled={p !== null && p.missing === 0}
                  onPress={remindMissing}
                />
              ) : null}
            </>
          ) : null}
        </LoadGate>

        <SectionTitle>Student submissions</SectionTitle>
        {message ? (
          <Notice tone={message.tone} title={message.tone === 'success' ? 'Done' : 'Not done'}>
            {message.text}
          </Notice>
        ) : null}
        <ListToolbar
          search={<SearchInput value={search} onChange={filtered(setSearch)} placeholder="Search students" />}
          activeFilters={status ? 1 : 0}
          filters={
            <>
              <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={filtered(setStatus)} allLabel="All statuses" />
              <FilterSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={filtered((v: SubmissionSort | '') => setSort(v || 'name'))} />
            </>
          }
        />
        <Button label="Verify pending on this page" icon="checkmark-done" variant="secondary" loading={bulkBusy} onPress={() => void verifyPending()} />
        <LoadGate loading={list.loading} error={list.error} hasData={list.data !== undefined} onRetry={list.reload}>
          {list.data && list.data.rows.length === 0 ? (
            search || status ? (
              <EmptyCard icon="search" title="No students match." body="Try another search or status." />
            ) : (
              <EmptyCard icon="people-outline" title="No students yet." body="Students in this section will show here." />
            )
          ) : null}
          {list.data && list.data.rows.length > 0 ? (
            <Card className="sx-list">
              {list.data.rows.map((row) => (
                <SubmissionItem
                  key={row.student_profile_id}
                  row={row}
                  total={a?.total_score ?? 0}
                  busy={busyRow === row.student_profile_id}
                  canRemind={classId !== null}
                  onView={() => setAction({ kind: 'evidence', row })}
                  onVerify={() => row.evidence_id && run(row, `${row.display_name}'s paper is verified.`, () => verifyEvidence(row.evidence_id as string))}
                  onReject={() => setAction({ kind: 'reject', row })}
                  onScore={() => setAction({ kind: 'score', row })}
                  onExempt={(exempt) =>
                    run(row, exempt ? `${row.display_name} is exempt.` : `${row.display_name} is no longer exempt.`, () => setExemption(assessmentId, row.student_profile_id, exempt))
                  }
                  onRemind={() => setAction({ kind: 'remind', row })}
                />
              ))}
            </Card>
          ) : null}
          {list.data ? <Pagination page={page} total={list.data.total} onPage={setPage} /> : null}
        </LoadGate>

        {action?.kind === 'evidence' ? <EvidenceDialog row={action.row} total={a?.total_score ?? 0} onClose={() => setAction(null)} /> : null}
        {action?.kind === 'reject' && action.row.evidence_id ? (
          <RejectDialog
            evidenceId={action.row.evidence_id}
            studentName={action.row.display_name}
            onClose={() => setAction(null)}
            onDone={() => finish(`${action.row.display_name}'s paper was sent back.`)}
          />
        ) : null}
        {action?.kind === 'score' && action.row.evidence_id ? (
          <ScoreDialog
            evidenceId={action.row.evidence_id}
            studentName={action.row.display_name}
            current={action.row.score}
            total={a?.total_score ?? 0}
            onClose={() => setAction(null)}
            onDone={() => finish(`${action.row.display_name}'s score was updated.`)}
          />
        ) : null}
        {action?.kind === 'remind' && classId ? (
          <SendReminderDialog
            classId={classId}
            recipientsLabel={action.row.display_name}
            studentProfileIds={[action.row.student_profile_id]}
            subjectId={a?.subject_id ?? undefined}
            assessmentId={assessmentId}
            defaultMessage={a ? `Please submit ${a.title}.` : ''}
            onClose={() => setAction(null)}
            onSent={(n) => finish(`Reminder sent to ${plural(n, 'student')}.`)}
          />
        ) : null}
        {action?.kind === 'remind-missing' && classId ? (
          <SendReminderDialog
            classId={classId}
            recipientsLabel={plural(action.ids.length, 'missing student')}
            studentProfileIds={action.ids}
            subjectId={a?.subject_id ?? undefined}
            assessmentId={assessmentId}
            defaultMessage={a ? `Please submit ${a.title}.` : ''}
            onClose={() => setAction(null)}
            onSent={(n) => finish(`Reminder sent to ${plural(n, 'student')}.`)}
          />
        ) : null}
      </Screen>
    </>
  );
}

function Header({ assessment: a }: { assessment: AssessmentDetail }) {
  return (
    <>
      <div className="sx-head">
        <h2>{a.title}</h2>
        <p>{[a.subject, a.className].filter(Boolean).join(' · ')}</p>
      </div>
      <Card>
        <div className="sx-code-box">
          <span className="sx-code-label">Filing code</span>
          <span className="sx-code" aria-label={`Filing code ${a.assessment_code.split('').join(' ')}`}>
            {a.assessment_code}
          </span>
        </div>
        <div className="sx-facts">
          <Fact label="Total score" value={String(a.total_score)} />
          <Fact label="Due date" value={a.due_date ? formatDate(a.due_date) : 'No due date'} />
          <Fact label="Type" value={ASSESSMENT_TYPE_LABELS[a.assessment_type]} />
          <Fact label="Quarter" value={QUARTER_LABELS[a.quarter]} />
        </div>
        {a.instructions ? <p className="sx-meta">{a.instructions}</p> : null}
      </Card>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="sx-fact">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** One of the two separate metrics; submitted and verified are never merged (PRD v0.5 §15). */
function Metric({ done, required, word }: { done: number; required: number; word: string }) {
  const c = completion(done, required);
  return (
    <Donut
      percent={c.percent}
      tone={c.tone}
      center={`${done}/${required}`}
      caption={`${done}/${required} ${word}`}
      label={`${done} of ${required} ${word.toLowerCase()}, ${c.percent}%, ${c.label}`}
    />
  );
}

function SubmissionItem({
  row,
  total,
  busy,
  canRemind,
  onView,
  onVerify,
  onReject,
  onScore,
  onExempt,
  onRemind,
}: {
  row: SubmissionRow;
  total: number;
  busy: boolean;
  canRemind: boolean;
  onView: () => void;
  onVerify: () => void;
  onReject: () => void;
  onScore: () => void;
  onExempt: (exempt: boolean) => void;
  onRemind: () => void;
}) {
  const s = row.row_status;
  const hasEvidence = row.evidence_id !== null;
  // Only the actions that make sense for this row.
  const actions: { label: string; icon: IconName; onPress: () => void; style?: 'good' | 'bad' }[] = [];
  if (hasEvidence && row.image_path) actions.push({ label: 'View Evidence', icon: 'eye-outline', onPress: onView });
  if (hasEvidence && (s === 'PENDING' || s === 'REJECTED')) actions.push({ label: 'Verify', icon: 'checkmark-circle', onPress: onVerify, style: 'good' });
  if (hasEvidence && (s === 'PENDING' || s === 'VERIFIED')) actions.push({ label: 'Reject', icon: 'close-circle-outline', onPress: onReject, style: 'bad' });
  if (hasEvidence && s !== 'EXEMPT') actions.push({ label: 'Correct Score', icon: 'pencil-outline', onPress: onScore });
  if (row.exempt) actions.push({ label: 'Remove exemption', icon: 'remove-circle-outline', onPress: () => onExempt(false) });
  else if (s !== 'VERIFIED') actions.push({ label: 'Exempt', icon: 'remove-circle-outline', onPress: () => onExempt(true) });
  if (canRemind && (s === 'MISSING' || s === 'REJECTED')) actions.push({ label: 'Send Reminder', icon: 'mail-outline', onPress: onRemind });

  return (
    <div className="sx-item">
      <div className="sx-copy">
        <span className="sx-main">
          <span className="sx-title ellipsis">{row.display_name}</span>
          <StatusBadge label={SUBMISSION_LABEL[s]} tone={SUBMISSION_TONE[s]} />
        </span>
        {busy ? <Spinner size="small" label="Saving" /> : <span className="sx-big-number">{scoreText(row.score, total)}</span>}
      </div>
      {actions.length > 0 ? (
        <div className="sx-actions">
          {actions.map((act) => (
            <button key={act.label} type="button" className={`sx-action${act.style ? ` ${act.style}` : ''}`} onClick={act.onPress} disabled={busy}>
              <Icon name={act.icon} size={18} />
              <span>{act.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

function EvidenceDialog({ row, total, onClose }: { row: SubmissionRow; total: number; onClose: () => void }) {
  const photo = useLoad(() => (row.image_path ? friendly(evidencePhotoUrl(row.image_path)) : Promise.resolve(null)), row.image_path);
  return (
    <Dialog title={`${row.display_name}'s paper`} onClose={onClose}>
      {photo.loading && !photo.data ? <Spinner size="large" label="Loading photo" /> : null}
      {photo.error ? (
        <Notice tone="danger" title="Could not load the photo">
          {photo.error}
        </Notice>
      ) : null}
      {photo.data ? <img className="sx-evidence-img" src={photo.data} alt={`Paper uploaded by ${row.display_name}`} /> : null}
      <div className="sx-facts">
        <Fact label="Score" value={scoreText(row.score, total)} />
        <Fact label="Uploaded" value={formatDateTime(row.uploaded_at)} />
        <Fact label="Status" value={SUBMISSION_LABEL[row.row_status]} />
      </div>
      {row.rejection_reason ? (
        <Notice tone="warning" title="Rejection reason">
          {row.rejection_reason}
        </Notice>
      ) : null}
      <Button label="Close" variant="secondary" onPress={onClose} />
    </Dialog>
  );
}

function RejectDialog({ evidenceId, studentName, onClose, onDone }: { evidenceId: string; studentName: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Give a reason so the student knows what to fix.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await rejectEvidence(evidenceId, reason.trim());
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Reject ${studentName}'s paper`} onClose={onClose} busy={busy}>
      <p className="dialog-text">The student and their parents see this reason.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="reject-reason">
            Reason
          </label>
          <textarea
            id="reject-reason"
            className="plain-textarea"
            rows={3}
            maxLength={500}
            value={reason}
            placeholder="The photo is blurry. Please take it again."
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error ? (
          <Notice tone="danger" title="Not rejected">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Reject" variant="danger" icon="close-circle-outline" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

function ScoreDialog({
  evidenceId,
  studentName,
  current,
  total,
  onClose,
  onDone,
}: {
  evidenceId: string;
  studentName: string;
  current: number | null;
  total: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [score, setScore] = useState(current === null ? '' : String(current));
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(score);
    if (!score.trim() || !Number.isFinite(value) || value < 0 || value > total) {
      setFieldError(`Enter a score from 0 to ${total}.`);
      return;
    }
    setFieldError(undefined);
    setError(null);
    setBusy(true);
    try {
      await correctScore(evidenceId, value);
      onDone();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Correct ${studentName}'s score`} onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label={`Score (out of ${total})`}
          icon="trophy-outline"
          inputMode="decimal"
          value={score}
          onChangeText={(v) => setScore(v.replace(/[^0-9.]/g, ''))}
          error={fieldError}
          maxLength={7}
        />
        {error ? (
          <Notice tone="danger" title="Score not saved">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Save Score" icon="checkmark" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}
