import { Stack } from 'expo-router';

import { colors } from '@/components/theme';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}
