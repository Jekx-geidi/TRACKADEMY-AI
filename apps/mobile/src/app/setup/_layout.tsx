import { Stack } from 'expo-router';

import { colors } from '@/components/theme';

export const unstable_settings = { initialRouteName: 'role' };

export default function SetupLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}
