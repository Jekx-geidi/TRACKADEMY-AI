import { useState } from 'react';
import { Link } from 'react-router';

import { listMyClasses } from '@/features/student/api';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Icon } from '../../ui/Icon';
import { IconCircle } from '../../ui/IconTile';
import { JoinClassDialog } from '../../ui/JoinClassDialog';
import { Screen } from '../../ui/Screen';
import { colors } from '../../ui/theme';

/** Student class picker (PRD v0.7 §11): classes plus an explicit join action. */
export default function StudentClasses() {
  const { data, error, loading, reload } = useLoad(listMyClasses);
  const [joining, setJoining] = useState(false);

  return (
    <Screen tabs>
      <PageHeader title="My Classes" subtitle="Your subjects and schoolwork, all in one place." />
      <Button label="Join a Class" icon="enter-outline" onPress={() => setJoining(true)} />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {data?.length === 0 ? <EmptyCard icon="school-outline" title="No classes yet" body="Ask your teacher for a 6-digit class code, then join here." /> : null}
        {data?.map((item) => (
          <Card key={item.class_id}>
            <Link className="sx-card-link" to={`/student/classes/${item.class_id}`}>
              <IconCircle name="school" tint={colors.accentSoft} color={colors.heading} size={44} />
              <span className="sx-main">
                <span className="sx-title">{item.name}</span>
                <span className="sx-meta">{item.teacher_name ? item.teacher_name : 'Teacher not listed'}</span>
                <span className="sx-meta">{item.subject_count} {item.subject_count === 1 ? 'subject' : 'subjects'}</span>
              </span>
              <Icon name="chevron-forward" className="sx-chevron" size={20} />
            </Link>
          </Card>
        ))}
      </LoadGate>
      {joining ? <JoinClassDialog onClose={() => setJoining(false)} /> : null}
    </Screen>
  );
}
