import { useParams } from 'react-router';

import { getSubject, listWork } from '@/features/student/api';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Screen } from '../../ui/Screen';
import { WorkRow } from '../../ui/WorkRow';

/** A student sees only their own assessments and submissions for this subject. */
export default function StudentSubject() {
  const { subjectId = '' } = useParams();
  const subject = useLoad(() => getSubject(subjectId), subjectId);
  const work = useLoad(() => listWork({ subjectId }), subjectId);
  return <Screen tabs>
    <PageHeader title={subject.data?.name ?? 'Subject'} subtitle="Your assessments, scores, and submissions." />
    <LoadGate loading={subject.loading || work.loading} error={subject.error ?? work.error} hasData={subject.data !== undefined && work.data !== undefined} onRetry={() => { subject.reload(); work.reload(); }}>
      {subject.data === null ? <EmptyCard icon="library-outline" title="Subject not found" /> : null}
      {work.data?.rows.length === 0 ? <EmptyCard icon="document-text" title="No work yet" body="Your teacher's assessments will show here." /> : null}
      {work.data?.rows.length ? <Card className="list-card">{work.data.rows.map((item) => <WorkRow key={item.assessment_id} item={item} />)}</Card> : null}
    </LoadGate>
  </Screen>;
}
