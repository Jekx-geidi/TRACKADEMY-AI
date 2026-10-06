import { useState } from 'react';

import { listNotifications, markNotificationsRead } from '@/features/teacher/api';
import { STUDENT_NOTIFICATION_TYPES, type StudentNotificationFilter } from '@/features/student/work';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { NotificationItem, RowAction } from '../../ui/NotificationList';
import { Screen } from '../../ui/Screen';
import { Segmented } from '../../ui/Segmented';

const TABS: readonly { value: StudentNotificationFilter; label: string }[] = [
  { value: 'ALL', label: 'All' }, { value: 'TEACHER', label: 'Teacher' }, { value: 'VERIFIED', label: 'Verified' }, { value: 'MISSING', label: 'Missing' }, { value: 'CLASS', label: 'Class' },
];

/** Student's focused updates. The five filters match the Student UX PRD. */
export default function StudentNotifications() {
  const [filter, setFilter] = useState<StudentNotificationFilter>('ALL');
  const query = filter === 'MISSING' ? null : { types: filter === 'ALL' ? undefined : STUDENT_NOTIFICATION_TYPES[filter] };
  const { data, error, loading, reload } = useLoad(() => query ? listNotifications(query) : Promise.resolve(null), filter);
  return <Screen tabs>
    <PageHeader title="Notifications" subtitle="Teacher updates, verification, and class activity." />
    <Segmented value={filter} onChange={setFilter} options={TABS} />
    <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
      {filter === 'MISSING' ? <EmptyCard icon="alert-circle-outline" title="See missing work" body="Missing and overdue work is shown in My Work so you can upload it right away." /> : null}
      {data?.rows.length === 0 ? <EmptyCard icon="notifications-outline" title="No notifications" body="You're all caught up." /> : null}
      {data?.rows.length ? <Card className="list-card">{data.rows.map((n, index) => <NotificationItem key={n.id} notification={n} divider={index > 0}><RowAction label={n.read_at ? 'Read' : 'Mark Read'} icon="checkmark" disabled={n.read_at !== null} onPress={() => void markNotificationsRead([n.id]).then(reload)} /></NotificationItem>)}</Card> : null}
    </LoadGate>
  </Screen>;
}
