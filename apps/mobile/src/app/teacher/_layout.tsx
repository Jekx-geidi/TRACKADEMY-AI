import { Tabs } from 'expo-router';

import { RoleTabBar, type TabSpec } from '@/components/RoleTabBar';
import { colors } from '@/components/theme';

const TABS: Record<string, TabSpec> = {
  index: { label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  subjects: { label: 'Subjects', icon: 'library', iconOutline: 'library-outline' },
  create: { label: 'Create', icon: 'add', iconOutline: 'add-outline', center: true },
  audit: { label: 'Audit', icon: 'shield-checkmark', iconOutline: 'shield-checkmark-outline' },
  profile: { label: 'Profile', icon: 'person', iconOutline: 'person-outline' },
};

export default function TeacherTabs() {
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} tabs={TABS} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="subjects" options={{ title: 'Subjects' }} />
      <Tabs.Screen name="create" options={{ title: 'Create Assessment' }} />
      <Tabs.Screen name="audit" options={{ title: 'Audit' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
