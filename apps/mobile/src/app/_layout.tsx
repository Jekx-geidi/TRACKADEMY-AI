import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/components/theme';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { ScanSessionProvider } from '@/features/scanner/ScanSession';
import { registerServiceWorker } from '@/lib/pwa';

registerServiceWorker();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ScanSessionProvider>
          <StatusBar style="dark" />
          <RootStack />
        </ScanSessionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Signed out → onboarding / sign in; signed in → role and setup; set up → only that role's
 * tabs (/student, /parent or /teacher). A guard turning off sends the user to the first
 * screen still allowed, in the order listed here.
 */
function RootStack() {
  const { ready, session, profile } = useAuth();
  // On a font error, carry on with the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({ Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold });

  if (!ready || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loading}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel="Trackademic" />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const signedIn = session !== null;
  // Same rule as homeFor(): set up means setup finished and a role chosen.
  const role = signedIn && profile?.setupComplete ? (profile.role ?? null) : null;
  const setUp = role !== null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.heading,
        headerTitleStyle: { color: colors.heading, fontFamily: fonts.extrabold },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !setUp}>
        <Stack.Screen name="setup" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'STUDENT'}>
        <Stack.Screen name="student" options={{ headerShown: false, title: 'Home' }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'PARENT'}>
        <Stack.Screen name="parent" options={{ headerShown: false, title: 'Home' }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'TEACHER'}>
        <Stack.Screen name="teacher" options={{ headerShown: false, title: 'Home' }} />
      </Stack.Protected>
      {/* Students and parents save papers; teachers don't upload evidence. */}
      <Stack.Protected guard={role === 'STUDENT' || role === 'PARENT'}>
        <Stack.Screen name="scan/index" options={{ title: 'Scan School Paper' }} />
        <Stack.Screen name="scan/review" options={{ title: 'Check Paper' }} />
        <Stack.Screen name="scan/manual" options={{ title: 'Enter Code' }} />
        <Stack.Screen name="scan/saved" options={{ title: 'Saved', headerBackVisible: false, headerLeft: () => null, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.surface },
  logo: { width: 96, height: 96 },
});
