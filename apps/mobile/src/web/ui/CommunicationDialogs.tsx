import { useState, type FormEvent } from 'react';

import { authErrorMessage } from '@/features/auth/api';
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, sendReminder, sendReport, type ReportCategory } from '@/features/teacher/api';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Screen';
import { SelectField } from './SelectField';

/**
 * Send a reminder to a whole section, or to the given students (PRD v0.5 §21).
 * Students and their parents are notified by the server.
 */
export function SendReminderDialog({
  classId,
  recipientsLabel,
  studentProfileIds,
  subjectId,
  assessmentId,
  defaultMessage = '',
  onClose,
  onSent,
}: {
  classId: string;
  /** e.g. "Whole section", "5 missing students", "Jake Engaña". */
  recipientsLabel: string;
  studentProfileIds?: string[];
  subjectId?: string;
  assessmentId?: string;
  defaultMessage?: string;
  onClose: () => void;
  onSent: (recipients: number) => void;
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Write the reminder first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      onSent(await sendReminder({ classId, message: message.trim(), studentProfileIds, subjectId, assessmentId, dueDate: dueDate || undefined }));
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title="Send reminder" onClose={onClose} busy={busy}>
      <p className="dialog-text">To: {recipientsLabel}. Their parents are notified too.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="reminder-message">
            Message
          </label>
          <textarea
            id="reminder-message"
            className="plain-textarea"
            rows={4}
            maxLength={500}
            value={message}
            placeholder="Math Project is due Friday."
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="reminder-due">
            Due date (optional)
          </label>
          <input id="reminder-due" className="plain-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {error ? (
          <Notice tone="danger" title="Not sent">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Send Reminder" icon="mail-outline" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}

const CATEGORY_OPTIONS = REPORT_CATEGORIES.map((c) => ({ value: c, label: REPORT_CATEGORY_LABELS[c] }));

/** A structured report about one student, for their parents (PRD v0.5 §22). */
export function SendReportDialog({
  classId,
  studentProfileId,
  studentName,
  subjectId,
  onClose,
  onSent,
}: {
  classId: string;
  studentProfileId: string;
  studentName: string;
  subjectId?: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [category, setCategory] = useState<ReportCategory>('GOOD_PROGRESS');
  const [message, setMessage] = useState('');
  const [shareWithStudent, setShareWithStudent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Write the report first.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await sendReport({ classId, studentProfileId, category, message: message.trim(), subjectId, visibleToStudent: shareWithStudent });
      onSent();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Report on ${studentName}`} onClose={onClose} busy={busy}>
      <p className="dialog-text">Their parents receive it. Share it with the student too if you like.</p>
      <form className="stack" onSubmit={submit} noValidate>
        <SelectField label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        <div className="field">
          <label className="field-label" htmlFor="report-message">
            Report
          </label>
          <textarea
            id="report-message"
            className="plain-textarea"
            rows={5}
            maxLength={2000}
            value={message}
            placeholder="Jake is improving in fractions but needs more practice with word problems."
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={shareWithStudent} onChange={(e) => setShareWithStudent(e.target.checked)} />
          <span>Also show this report to the student</span>
        </label>
        {error ? (
          <Notice tone="danger" title="Not sent">
            {error}
          </Notice>
        ) : null}
        <Button type="submit" label="Send Report" icon="document-text" loading={busy} />
        <Button label="Cancel" variant="ghost" onPress={onClose} disabled={busy} />
      </form>
    </Dialog>
  );
}
