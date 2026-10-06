import { Tabs } from 'expo-router';

import { BottomBar } from '@/components/BottomBar';
import { colors } from '@/components/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <BottomBar />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="teacher" options={{ title: 'Teacher' }} />
    </Tabs>
  );
}
