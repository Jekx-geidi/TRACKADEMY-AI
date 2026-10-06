import { Tabs } from 'expo-router';

import { RoleTabBar, type TabSpec } from '@/components/RoleTabBar';
import { colors } from '@/components/theme';
import { SelectedChildProvider } from '@/features/dashboards/SelectedChild';

const TABS: Record<string, TabSpec> = {
  index: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  child: { label: 'Child', icon: 'happy', iconOutline: 'happy-outline' },
  scan: { label: 'Scan', icon: 'scan', iconOutline: 'scan-outline', center: true },
  inbox: { label: 'Inbox', icon: 'mail', iconOutline: 'mail-outline' },
  profile: { label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
};

export default function ParentTabs() {
  return (
    <SelectedChildProvider>
      <Tabs
        tabBar={(props) => <RoleTabBar {...props} tabs={TABS} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="child" options={{ title: 'Child' }} />
        <Tabs.Screen name="scan" options={{ title: 'Scan for Child' }} />
        <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </SelectedChildProvider>
  );
}
