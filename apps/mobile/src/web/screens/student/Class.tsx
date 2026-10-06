import { Link, useParams } from 'react-router';

import { getMyClass, listMySubjects, listWork } from '@/features/student/api';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Icon } from '../../ui/Icon';
import { Screen, SectionTitle } from '../../ui/Screen';
import { WorkRow } from '../../ui/WorkRow';

/** Class workspace: subjects, missing work and recent submissions (PRD v0.7 §13–17). */
export default function StudentClass() {
  const { classId = '' } = useParams();
  const overview = useLoad(() => getMyClass(classId), classId);
  const subjects = useLoad(() => listMySubjects(classId), classId);
  const work = useLoad(() => listWork({ classId, limit: 5 }), classId);
  const classInfo = overview.data;

  return (
    <Screen tabs>
      <PageHeader title={classInfo?.name ?? 'Class'} subtitle={[classInfo?.teacher_name, classInfo?.school_year].filter(Boolean).join(' · ') || 'Your class workspace'} />
      <LoadGate loading={overview.loading} error={overview.error} hasData={overview.data !== undefined} onRetry={overview.reload}>
        {classInfo === null ? <EmptyCard icon="school-outline" title="Class not found" body="It may no longer be available to your account." /> : null}
        {classInfo ? <>
          <div className="stat-row">
            <Link className="stat" to={`/student/work?class=${classId}&status=LACKING`}><span className="stat-value">{classInfo.lacking_count}</span><span className="stat-label">Missing</span></Link>
            <Link className="stat" to={`/student/work?class=${classId}&status=PENDING`}><span className="stat-value">{classInfo.pending_count}</span><span className="stat-label">Pending</span></Link>
          </div>
          <SectionTitle>Subjects</SectionTitle>
          <LoadGate loading={subjects.loading} error={subjects.error} hasData={subjects.data !== undefined} onRetry={subjects.reload}>
            {subjects.data?.length === 0 ? <EmptyCard icon="library-outline" title="No subjects yet" body="Your teacher's subjects will appear here." /> : null}
            {subjects.data?.length ? <Card className="list-card">{subjects.data.map((subject, index) => <Link key={subject.subject_id} className={`sx-row${index ? ' divider' : ''}`} to={`/student/subjects/${subject.subject_id}`}><span className="sx-main"><span className="sx-title">{subject.name}</span><span className="sx-meta">{subject.record_count} records · {subject.lacking_count ? `${subject.lacking_count} missing` : subject.pending_count ? `${subject.pending_count} pending` : 'Complete'}</span></span><Icon className="sx-chevron" name="chevron-forward" size={20} /></Link>)}</Card> : null}
          </LoadGate>
          <SectionTitle>Recent work</SectionTitle>
          <LoadGate loading={work.loading} error={work.error} hasData={work.data !== undefined} onRetry={work.reload}>
            {work.data?.rows.length === 0 ? <EmptyCard icon="document-text" title="No work yet" body="Assessments and your submissions will show here." /> : null}
            {work.data?.rows.length ? <Card className="list-card">{work.data.rows.map((item) => <WorkRow key={item.assessment_id} item={item} />)}</Card> : null}
            <Link className="link-btn" to={`/student/work?class=${classId}`}>View all work</Link>
          </LoadGate>
        </> : null}
      </LoadGate>
    </Screen>
  );
}
