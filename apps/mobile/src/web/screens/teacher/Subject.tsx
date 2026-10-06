import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';

import { authErrorMessage } from '@/features/auth/api';
import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPES, MAX_TOTAL_SCORE, QUARTER_LABELS, QUARTERS, type AssessmentType, type Quarter } from '@/features/assessments/constants';
import { createAssessment, getSubject, listAssessmentProgress, sectionOverview, type AssessmentProgress, type AssessmentSort } from '@/features/teacher/api';
import { COMPLETION_LABEL, COMPLETION_TONE, type CompletionStatus } from '@/features/teacher/progress';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ProgressBar, StatusBadge } from '../../ui/Charts';
import { EmptyCard, LoadGate } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { Notice, Screen, TopBar } from '../../ui/Screen';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { formatDate, friendly, todayIso } from './sections/util';
import './sections.css';

// PRD v0.5 §12: assessments are grouped by these categories; the other types go under "Other".
const CATEGORIES = [
  { type: 'QUIZ', label: 'Quizzes' },
  { type: 'ASSIGNMENT', label: 'Assignments' },
  { type: 'ACTIVITY', label: 'Activities' },
  { type: 'PROJECT', label: 'Projects' },
  { type: 'EXAM', label: 'Exams' },
  { type: 'PERFORMANCE_TASK', label: 'Performance Tasks' },
  { type: 'OTHER', label: 'Other' },
] as const satisfies readonly { type: AssessmentType; label: string }[];

const categoryOf = (type: AssessmentType): AssessmentType => (CATEGORIES.some((c) => c.type === type) ? type : 'OTHER');

const QUARTER_OPTIONS = QUARTERS.map((q) => ({ value: q, label: QUARTER_LABELS[q] }));
const TYPE_OPTIONS = ASSESSMENT_TYPES.map((t) => ({ value: t, label: ASSESSMENT_TYPE_LABELS[t] }));
const STATUS_OPTIONS = (Object.keys(COMPLETION_LABEL) as CompletionStatus[]).map((s) => ({ value: s, label: COMPLETION_LABEL[s] }));
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'title', label: 'Title' },
  { value: 'due', label: 'Due date' },
  { value: 'completion', label: 'Completion' },
] as const satisfies readonly { value: AssessmentSort; label: string }[];

/** The subject plus its section's name for the header; a missing section name isn't fatal. */
async function loadSubject(subjectId: string) {
  const subject = await getSubject(subjectId);
  const sectionName = await sectionOverview(subject.class_id).then(
    (o) => o.name,
    () => null,
  );
  return { subject, sectionName };
}

/** Subject Workspace (PRD v0.5 §12–§13): the subject's assessments, grouped by category. */
export default function TeacherSubject() {
  const { subjectId = '' } = useParams();
  const header = useLoad(() => friendly(loadSubject(subjectId)), subjectId);

  const [search, setSearch] = useState('');
  const [quarter, setQuarter] = useState<Quarter | ''>('');
  const [type, setType] = useState<AssessmentType | ''>('');
  const [status, setStatus] = useState<CompletionStatus | ''>('');
  const [sort, setSort] = useState<AssessmentSort>('newest');
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const query = { subjectId, search, quarter, type, status, sort, page };
  const list = useLoad(() => friendly(listAssessmentProgress(query)), JSON.stringify(query));

  // Any filter change starts again from the first page.
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };
  const activeFilters = (quarter ? 1 : 0) + (type ? 1 : 0) + (status ? 1 : 0);
  const hasFilters = Boolean(search) || activeFilters > 0;
  const rows = list.data?.rows ?? [];
  const groups = CATEGORIES.map((c) => ({ ...c, rows: rows.filter((r) => categoryOf(r.assessment_type) === c.type) })).filter((g) => g.rows.length > 0);

  return (
    <>
      <TopBar title="Subject" />
      <Screen tabs>
        <LoadGate loading={header.loading} error={header.error} hasData={header.data !== undefined} onRetry={header.reload}>
          {header.data ? (
            <div className="sx-head">
              <h2>{header.data.subject.name}</h2>
              <p>{[header.data.sectionName, header.data.subject.subject_code].filter(Boolean).join(' · ')}</p>
            </div>
          ) : null}
        </LoadGate>

        <Button label="+ Create Assessment" onPress={() => setCreating(true)} />

        <ListToolbar
          search={<SearchInput value={search} onChange={filtered(setSearch)} placeholder="Search assessments" />}
          activeFilters={activeFilters}
          filters={
            <>
              <FilterSelect label="Quarter" value={quarter} options={QUARTER_OPTIONS} onChange={filtered(setQuarter)} allLabel="All quarters" />
              <FilterSelect label="Type" value={type} options={TYPE_OPTIONS} onChange={filtered(setType)} allLabel="All types" />
              <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} onChange={filtered(setStatus)} allLabel="All statuses" />
              <FilterSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={filtered((v: AssessmentSort | '') => setSort(v || 'newest'))} />
            </>
          }
        />

        <LoadGate loading={list.loading} error={list.error} hasData={list.data !== undefined} onRetry={list.reload}>
          {list.data && rows.length === 0 ? (
            hasFilters ? (
              <EmptyCard icon="search" title="No assessments match." body="Try another search or clear the filters." />
            ) : (
              <>
                <EmptyCard icon="document-text" title="No assessments yet." body="Create one to get its 5-digit filing code." />
                <Button label="Create Assessment" variant="secondary" icon="add" onPress={() => setCreating(true)} />
              </>
            )
          ) : null}
          {groups.map((g) => (
            <section key={g.type} className="stack">
              <h3 className="sx-group-title">{g.label}</h3>
              <Card className="sx-list">
                {g.rows.map((a) => (
                  <AssessmentRow key={a.assessment_id} row={a} />
                ))}
              </Card>
            </section>
          ))}
          {list.data ? <Pagination page={page} total={list.data.total} onPage={setPage} /> : null}
        </LoadGate>

        {creating ? <CreateAssessmentDialog subjectId={subjectId} onClose={() => setCreating(false)} onCreated={list.reload} /> : null}
      </Screen>
    </>
  );
}

function AssessmentRow({ row }: { row: AssessmentProgress }) {
  const tone = COMPLETION_TONE[row.status];
  return (
    <Link to={`/teacher/assessments/${row.assessment_id}`} className="sx-row">
      <span className="sx-main">
        <span className="sx-title">{row.title}</span>
        <span className="sx-meta">
          {row.submitted}/{row.required} Submitted · {ASSESSMENT_TYPE_LABELS[row.assessment_type]}
          {row.due_date ? ` · Due ${formatDate(row.due_date)}` : ''}
        </span>
        <ProgressBar percent={row.percent} tone={tone} label={`${row.title}: ${row.submitted} of ${row.required} submitted`} />
      </span>
      <span className="sx-side">
        <span className="sx-big-number">{row.percent}%</span>
        <StatusBadge label={COMPLETION_LABEL[row.status]} tone={tone} />
      </span>
      <Icon name="chevron-forward" size={20} className="sx-chevron" />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Create Assessment (§13)
// ---------------------------------------------------------------------------

type FormField = 'title' | 'totalScore' | 'assessmentDate' | 'dueDate';

function CreateAssessmentDialog({ subjectId, onClose, onCreated }: { subjectId: string; onClose: () => void; onCreated: () => void }) {
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('QUIZ');
  const [title, setTitle] = useState('');
  const [quarter, setQuarter] = useState<Quarter>('FIRST_QUARTER');
  const [totalScore, setTotalScore] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ title: string; code: string } | null>(null);

  const validate = (): Partial<Record<FormField, string>> => {
    const found: Partial<Record<FormField, string>> = {};
    const score = Number(totalScore);
    if (!title.trim()) found.title = 'Enter a title.';
    else if (title.trim().length > 120) found.title = 'Keep the title to 120 characters.';
    if (!totalScore.trim() || !Number.isInteger(score) || score < 1 || score > MAX_TOTAL_SCORE) found.totalScore = `Enter a whole number from 1 to ${MAX_TOTAL_SCORE}.`;
    if (!assessmentDate) found.assessmentDate = 'Choose the assessment date.';
    // ISO dates compare correctly as strings.
    if (dueDate && assessmentDate && dueDate < assessmentDate) found.dueDate = 'The due date cannot be before the assessment date.';
    return found;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError(null);
    setBusy(true);
    try {
      const result = await createAssessment(subjectId, {
        assessmentType,
        title: title.trim(),
        quarter,
        totalScore: Number(totalScore),
        assessmentDate,
        dueDate: dueDate || undefined,
        instructions: instructions.trim() || undefined,
      });
      setCreated({ title: title.trim(), code: result.code });
      onCreated();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // The filing code exists only once the assessment is saved (PRD v0.5 §13).
  if (created) {
    return (
      <Dialog title="Assessment created" onClose={onClose}>
        <p className="dialog-text">{created.title}</p>
        <div className="sx-code-box">
          <span className="sx-code-label">Filing code</span>
          <span className="sx-code" aria-label={`Filing code ${created.code.split('').join(' ')}`}>
            {created.code}
          </span>
        </div>
        <p className="dialog-text">Write this code on each checked paper:</p>
        <ol className="sx-steps">
          <li>Student completes work</li>
          <li>Teacher checks paper</li>
          <li>Teacher writes score and this code</li>
          <li>Student uploads</li>
        </ol>
        <Button label="Done" onPress={onClose} />
      </Dialog>
    );
  }

  return (
    <Dialog title="Create Assessment" onClose={onClose} busy={busy}>
      <form className="stack" onSubmit={submit} noValidate>
        <SelectField label="Assessment Type" icon="document-text" value={assessmentType} options={TYPE_OPTIONS} onChange={setAssessmentType} />
        <TextField label="Title" icon="create-outline" placeholder="Quiz 1: Fractions" value={title} onChangeText={setTitle} error={errors.title} maxLength={120} />
        <SelectField label="Quarter" icon="calendar-outline" value={quarter} options={QUARTER_OPTIONS} onChange={setQuarter} />
        <TextField
          label="Total Score"
          icon="trophy-outline"
          inputMode="numeric"
          placeholder="20"
          value={totalScore}
          onChangeText={(v) => setTotalScore(v.replace(/[^0-9]/g, ''))}
          error={errors.totalScore}
          maxLength={4}
        />
        <DateField id="assessment-date" label="Assessment Date" value={assessmentDate} onChange={setAssessmentDate} error={errors.assessmentDate} />
        <DateField id="due-date" label="Due Date (optional)" value={dueDate} min={assessmentDate || undefined} onChange={setDueDate} error={errors.dueDate} />
        <div className="field">
          <label className="field-label" htmlFor="assessment-instructions">
            Instructions (optional)
          </label>
          <textarea
            id="assessment-instructions"
            className="plain-textarea"
            rows={3}
            maxLength={2000}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        {error ? (
          <Notice tone="danger" title="Assessment not created">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Create Assessment" icon="add" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

function DateField({ id, label, value, onChange, min, error }: { id: string; label: string; value: string; onChange: (value: string) => void; min?: string; error?: string }) {
  return (
    <div className="field sx-date">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="plain-input"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="field-error" aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
