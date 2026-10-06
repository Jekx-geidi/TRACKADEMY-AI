import { EmptyCard, PageHeader } from '../../ui/Dashboard';
import { Screen } from '../../ui/Screen';

export default function ParentInbox() {
  return (
    <Screen tabs>
      <PageHeader title="Inbox" subtitle="Teacher reports and reminders about your child." />
      <EmptyCard icon="mail-open-outline" title="No messages yet" body="When a teacher sends a report or reminder, it will appear here." />
    </Screen>
  );
}
