import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';

import { createAssessment, listMyAssessments } from '@/services/api/assessments';
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPES,
  QUARTER_LABELS,
  QUARTERS,
  type AssessmentType,
  type Quarter,
} from '@/features/assessments/constants';
import { createAssessmentInputSchema, type AssessmentMatch } from '@/features/assessments/schema';

import { AssessmentCard } from '../../ui/AssessmentCard';
import { Button } from '../../ui/Button';
import { Card, HeroCard } from '../../ui/Card';
import { ChipSelect, PageHeader } from '../../ui/Dashboard';
import { IconCircle } from '../../ui/IconTile';
import { Notice, Screen, SectionTitle } from '../../ui/Screen';
import { colors } from '../../ui/theme';
import './create.css';

type FieldErrors = Partial<Record<'subject' | 'title' | 'assessmentType' | 'quarter' | 'totalScore', string>>;

const TYPE_OPTIONS = ASSESSMENT_TYPES.map((value) => ({ value, label: ASSESSMENT_TYPE_LABELS[value] }));
const QUARTER_OPTIONS = QUARTERS.map((value) => ({ value, label: QUARTER_LABELS[value] }));

export default function CreateAssessmentScreen() {
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('QUIZ');
  const [quarter, setQuarter] = useState<Quarter>('FIRST_QUARTER');
  const [totalScore, setTotalScore] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<AssessmentMatch | null>(null);
  const [mine, setMine] = useState<AssessmentMatch[]>([]);
  const ids = useId();

  const refreshMine = useCallback(() => {
    listMyAssessments().then(setMine, () => setMine([]));
  }, []);
  useEffect(refreshMine, [refreshMine]);

  // Show a newly created code, which renders at the top of the screen.
  useEffect(() => {
    if (created) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [created]);

  async function submit() {
    setError(null);
    const parsed = createAssessmentInputSchema.safeParse({ subject, title, assessmentType, quarter, totalScore });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      setCreated(await createAssessment(parsed.data));
      setSubject('');
      setTitle('');
      setTotalScore('');
      refreshMine();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the assessment.');
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    void submit();
  }

  return (
    <Screen tabs>
      <PageHeader title="Create Assessment" subtitle="Get a 5-digit code your students write on their paper." />

      {created ? (
        <>
          <HeroCard className="create-code-hero">
            <p className="create-code-label">Assessment code</p>
            <p className="create-code" aria-label={`Assessment code ${created.code.split('').join(' ')}`}>
              {created.code}
            </p>
            <p className="create-code-hint">
              Tell students: “Write {created.code} clearly in a box in the upper-right corner of your paper.”
            </p>
          </HeroCard>
          <AssessmentCard assessment={created} showCode={false} />
        </>
      ) : null}

      <Card>
        <form className="create-form" onSubmit={onSubmit} noValidate>
          <h2 className="create-form-title">{created ? 'Create another' : 'Assessment details'}</h2>
          <Field label="Subject" id={`${ids}-subject`} error={fieldErrors.subject}>
            <input
              id={`${ids}-subject`}
              className="plain-input create-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mathematics"
              maxLength={80}
              aria-invalid={fieldErrors.subject ? true : undefined}
              aria-describedby={fieldErrors.subject ? `${ids}-subject-error` : undefined}
            />
          </Field>
          <Field label="Assessment type" error={fieldErrors.assessmentType} id={`${ids}-type`} group>
            <ChipSelect options={TYPE_OPTIONS} value={assessmentType} onChange={setAssessmentType} label="Assessment type" />
          </Field>
          <Field label="Assessment title" id={`${ids}-title`} error={fieldErrors.title}>
            <input
              id={`${ids}-title`}
              className="plain-input create-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Fractions Quiz"
              maxLength={120}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? `${ids}-title-error` : undefined}
            />
          </Field>
          <Field label="Quarter" error={fieldErrors.quarter} id={`${ids}-quarter`} group>
            <ChipSelect options={QUARTER_OPTIONS} value={quarter} onChange={setQuarter} label="Quarter" />
          </Field>
          <Field label="Total score" id={`${ids}-total`} error={fieldErrors.totalScore}>
            <input
              id={`${ids}-total`}
              className="plain-input create-input"
              value={totalScore}
              onChange={(e) => setTotalScore(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="20"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={4}
              aria-invalid={fieldErrors.totalScore ? true : undefined}
              aria-describedby={fieldErrors.totalScore ? `${ids}-total-error` : undefined}
            />
          </Field>
          {error ? (
            <Notice tone="danger" title="Something went wrong">
              {error}
            </Notice>
          ) : null}
          <Button type="submit" label="Create Assessment & Get Code" icon="sparkles" loading={submitting} />
        </form>
      </Card>

      {mine.length > 0 ? (
        <>
          <SectionTitle>Your assessments</SectionTitle>
          <Card className="list-card">
            {mine.map((a, i) => (
              <div key={a.id} className={`record-row${i > 0 ? ' divider' : ''}`}>
                <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
                <div className="record-text">
                  <span className="record-title ellipsis">{a.title}</span>
                  <span className="record-meta ellipsis">
                    {a.subject} · {QUARTER_LABELS[a.quarter]}
                  </span>
                </div>
                <span className="pill code create-code-pill">{a.code}</span>
              </div>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/** Label, control and error. `group` labels a set of chips instead of a single input. */
function Field({ label, id, error, group = false, children }: { label: string; id: string; error?: string; group?: boolean; children: ReactNode }) {
  return (
    <div className="create-field">
      {group ? (
        <p className="create-label" id={`${id}-label`}>
          {label}
        </p>
      ) : (
        <label className="create-label" htmlFor={id}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="create-error" id={`${id}-error`} aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
