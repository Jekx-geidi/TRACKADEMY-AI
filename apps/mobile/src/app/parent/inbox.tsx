import { EmptyCard, PageHeader } from '@/components/Dashboard';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen } from '@/components/Screen';

export default function ParentInbox() {
  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <PageHeader title="Inbox" subtitle="Teacher reports and reminders about your child." />
      <EmptyCard icon="mail-open-outline" title="No messages yet" body="When a teacher sends a report or reminder, it will appear here." />
    </Screen>
  );
}
