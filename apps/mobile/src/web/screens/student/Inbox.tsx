import { NotificationInbox } from '../../ui/NotificationList';
import { Screen, TopBar } from '../../ui/Screen';

/** Not a tab: opened from the bell on Student Home (PRD v0.3 §23). */
export default function StudentInbox() {
  return (
    <>
      <TopBar title="Inbox" />
      <Screen tabs>
        <NotificationInbox />
      </Screen>
    </>
  );
}
