import { PageHeader } from '../../ui/Dashboard';
import { NotificationInbox } from '../../ui/NotificationList';
import { Screen } from '../../ui/Screen';

export default function ParentInbox() {
  return (
    <Screen tabs>
      <PageHeader title="Notifications" subtitle="Teacher reports, reminders and submissions about your child." />
      <NotificationInbox />
    </Screen>
  );
}
