import { Tabs } from 'expo-router';

import { RoleTabBar, type TabSpec } from '@/components/RoleTabBar';
import { colors } from '@/components/theme';

const TABS: Record<string, TabSpec> = {
  index: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  subjects: { label: 'Subjects', icon: 'library', iconOutline: 'library-outline' },
  upload: { label: 'Upload', icon: 'camera', iconOutline: 'camera-outline', center: true },
  records: { label: 'Records', icon: 'folder-open', iconOutline: 'folder-open-outline' },
  profile: { label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
};

export default function StudentTabs() {
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} tabs={TABS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="subjects" options={{ title: 'Subjects' }} />
      <Tabs.Screen name="upload" options={{ title: 'Upload Score' }} />
      <Tabs.Screen name="records" options={{ title: 'Records' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
