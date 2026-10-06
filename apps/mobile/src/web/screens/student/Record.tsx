import { useState } from 'react';
import { useParams } from 'react-router';

import { ASSESSMENT_TYPE_LABELS, QUARTER_LABELS } from '@/features/assessments/constants';
import { evidenceHistory, getRecord, requestScoreCorrection } from '@/features/student/api';
import { WORK_STATUS_LABEL } from '@/features/student/work';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { StatusBadge } from '../../ui/Charts';
import { Screen } from '../../ui/Screen';
import { TextField } from '../../ui/TextField';

/** Student-safe record detail: their own score, teacher status and note only. */
export default function StudentRecord() {
  const { evidenceId = '' } = useParams();
  const { data, error, loading, reload } = useLoad(() => getRecord(evidenceId), evidenceId);
  const history = useLoad(() => evidenceHistory(evidenceId), evidenceId);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const send = async () => { if (!message.trim()) return; await requestScoreCorrection(evidenceId, message.trim()); setSent('Your teacher received your score review request.'); setRequesting(false); };
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
        <Button label="Request Correction" icon="pencil-outline" variant="secondary" onPress={() => setRequesting(true)} />
        {requesting ? <div className="stack"><TextField label="What needs reviewing?" value={message} onChangeText={setMessage} maxLength={500} /><Button label="Send Request" disabled={!message.trim()} onPress={() => void send()} /><Button label="Cancel" variant="ghost" onPress={() => setRequesting(false)} /></div> : null}
        {sent ? <p className="success-text" role="status">{sent}</p> : null}
        <h2 className="section-title">Academic proof timeline</h2>
        {history.data?.map((event) => <p key={`${event.event_type}-${event.created_at}`} className="sx-meta"><strong>{new Date(event.created_at).toLocaleString()}</strong> · {event.detail ?? event.event_type}{event.actor_name ? ` · ${event.actor_name}` : ''}</p>)}
      </Card>}
    </LoadGate>
  </Screen>;
}
