import { useParams } from 'react-router';

import { ASSESSMENT_TYPE_LABELS, QUARTER_LABELS } from '@/features/assessments/constants';
import { getRecord } from '@/features/student/api';
import { WORK_STATUS_LABEL } from '@/features/student/work';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { StatusBadge } from '../../ui/Charts';
import { Screen } from '../../ui/Screen';

/** Student-safe record detail: their own score, teacher status and note only. */
export default function StudentRecord() {
  const { evidenceId = '' } = useParams();
  const { data, error, loading, reload } = useLoad(() => getRecord(evidenceId), evidenceId);
  return <Screen tabs>
    <PageHeader title={data?.title ?? 'Record'} subtitle={data?.subject_name ?? 'Your submitted paper'} />
    <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
      {!data ? <EmptyCard icon="document-outline" title="Record not found" /> : <Card>
        <div className="sx-facts">
          <div className="sx-fact"><span>Score</span><span>{data.score === null ? 'Not scored yet' : `${data.score}/${data.total_score}`}</span></div>
          <div className="sx-fact"><span>Status</span><StatusBadge label={WORK_STATUS_LABEL[data.work_status]} tone={data.work_status === 'VERIFIED' ? 'success' : data.work_status === 'PENDING' ? 'warning' : 'danger'} /></div>
          <div className="sx-fact"><span>Type</span><span>{ASSESSMENT_TYPE_LABELS[data.assessment_type]}</span></div>
          <div className="sx-fact"><span>Quarter</span><span>{QUARTER_LABELS[data.quarter]}</span></div>
        </div>
        {data.teacher_note ? <p className="dialog-text">Teacher note: {data.teacher_note}</p> : null}
      </Card>}
    </LoadGate>
  </Screen>;
}
