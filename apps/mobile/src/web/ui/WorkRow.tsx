import { useNavigate } from 'react-router';

import { ASSESSMENT_TYPE_LABELS } from '@/features/assessments/constants';
import type { WorkItem } from '@/features/student/api';
import { dueLabel, isLacking, WORK_STATUS_LABEL, WORK_STATUS_TONE } from '@/features/student/work';

import { StatusBadge } from './Charts';
import { RowAction } from './NotificationList';

const score = (w: Pick<WorkItem, 'score' | 'total_score'>) => (w.score === null ? null : `${w.score}/${w.total_score}`);

/**
 * One assessment from the student's point of view: what it is, its status in words,
 * the score once uploaded, and what to do next (PRD v0.7 §8, §9, §17, §32).
 * `showClass` adds the section name for lists that span several sections.
 */
export function WorkRow({ item, showClass = false }: { item: WorkItem; showClass?: boolean }) {
  const navigate = useNavigate();
  const lacking = isLacking(item.work_status);
  const due = item.work_status === 'MISSING' || item.work_status === 'OVERDUE' ? dueLabel(item.due_date) : '';
  const meta = [item.subject_name, ASSESSMENT_TYPE_LABELS[item.assessment_type], showClass ? item.class_name : null, due || null].filter(Boolean).join(' · ');
  const shown = score(item);

  const upload = () => navigate('/student/upload', { state: { code: item.assessment_code, title: item.title } });
  const details = () => (item.evidence_id ? navigate(`/student/records/${item.evidence_id}`) : navigate(`/student/subjects/${item.subject_id}`));

  return (
    <div className="list-item work-row">
      <div className="list-item-head">
        <div className="person-text">
          <span className="person-name">{item.title}</span>
          <span className="person-meta">{meta}</span>
        </div>
        {shown ? <span className="record-score">{shown}</span> : null}
      </div>
      <div className="badges">
        <StatusBadge label={WORK_STATUS_LABEL[item.work_status]} tone={WORK_STATUS_TONE[item.work_status]} />
        {item.work_status === 'NEEDS_RESUBMISSION' ? <span className="person-meta">Your teacher asked for a new upload.</span> : null}
      </div>
      <div className="row-actions">
        {lacking ? <RowAction label={item.work_status === 'NEEDS_RESUBMISSION' ? 'Upload Again' : 'Upload'} icon="camera" tone="primary" onPress={upload} /> : null}
        <RowAction label="View Details" icon="document-outline" onPress={details} />
      </div>
    </div>
  );
}
