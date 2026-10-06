import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AuthScreen, BackButton, Dots } from '@/components/AuthScreen';
import { Button } from '@/components/Button';
import { colors, fonts, MIN_TOUCH, radius, spacing } from '@/components/theme';
import { useAuth } from '@/features/auth/AuthProvider';

const SLIDES = [
  {
    image: require('../../../assets/onboarding/organized.png'),
    title: 'Keep Schoolwork Organized',
    body: 'Save quizzes, assignments, projects, and checked papers in one place.',
  },
  {
    image: require('../../../assets/onboarding/progress.png'),
    title: 'Stay Updated on Progress',
    body: 'Students and parents can easily track scores, missing work, and academic evidence.',
  },
  {
    image: require('../../../assets/onboarding/connect.png'),
    title: 'Connect Students, Parents, and Teachers',
    body: 'Keep everyone aligned with clear academic records and verified schoolwork.',
  },
] as const;

export default function OnboardingScreen() {
  const { onboardingDone, finishOnboarding } = useAuth();
  // Read once: finishing onboarding below navigates away itself.
  const [seenBefore] = useState(onboardingDone);
  const [index, setIndex] = useState(0);
  const { height } = useWindowDimensions();

  if (seenBefore) return <Redirect href="/sign-in" />;

  const slide = SLIDES[index] ?? SLIDES[0];
  const last = index === SLIDES.length - 1;
  const imageSize = Math.min(340, Math.max(220, height * 0.4));

  const leave = (to: '/sign-in' | '/sign-up') => {
    router.replace(to);
    finishOnboarding();
  };

  return (
    <AuthScreen>
      <View style={styles.top}>
        {index > 0 ? <BackButton onPress={() => setIndex(index - 1)} /> : <View style={styles.topSpacer} />}
      </View>

      <View style={styles.body}>
        <Image source={slide.image} style={{ width: imageSize, height: imageSize }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Dots count={SLIDES.length} active={index} />
        <Text style={styles.title} accessibilityRole="header">
          {slide.title}
        </Text>
        <Text style={styles.text}>{slide.body}</Text>
      </View>

      {last ? (
        <Button label="Get Started" onPress={() => leave('/sign-up')} />
      ) : (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip"
            onPress={() => leave('/sign-in')}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            onPress={() => setIndex(index + 1)}
            style={({ pressed }) => [styles.next, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-forward" size={24} color={colors.primaryText} />
          </Pressable>
        </View>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  top: { height: 44 },
  topSpacer: { height: 44 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { fontSize: 26, fontFamily: fonts.extrabold, color: colors.heading, textAlign: 'center', marginTop: spacing.sm },
  text: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.lg + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  next: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
