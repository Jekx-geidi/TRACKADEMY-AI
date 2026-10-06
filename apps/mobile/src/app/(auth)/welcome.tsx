import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors, fonts, spacing } from '@/components/theme';
import { useAuth } from '@/features/auth/AuthProvider';

/** The welcome artwork's indigo (from the design), deeper than the app's midnight. */
const INDIGO = '#282389';
const FADE_MS = 350;
const MAX_WIDTH = 520;
const BADGE_SIZE = 64;

const WORDMARK_RATIO = 900 / 115;
const ILLUSTRATION_RATIO = 900 / 788;

/**
 * Landing screen whenever the app opens signed out: brand, one line about the app, then Continue.
 * Continue goes to onboarding the first time, and straight to sign in after that.
 */
export default function WelcomeScreen() {
  const { onboardingDone } = useAuth();
  // Read once so the destination doesn't change mid-fade.
  const [seenBefore] = useState(onboardingDone);
  const [leaving, setLeaving] = useState(false);
  // Height left for the illustration once the text is laid out, so it never overlaps the text.
  const [artSpace, setArtSpace] = useState(0);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Math.min(windowWidth, MAX_WIDTH);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
  }, [opacity]);

  const next = () => {
    if (leaving) return;
    setLeaving(true);
    const to = seenBefore ? '/sign-in' : '/onboarding';
    Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => router.replace(to));
  };

  const dome = width * 1.7;
  const domeVisible = Math.max(120, height * 0.17);
  const logoSize = Math.min(124, width * 0.28);
  const wordmarkWidth = width * 0.7;
  const bottomCircle = width * 0.62;
  // The bottom-left circle is centred on the document badge, which sits beside Continue.
  const footerBottom = insets.bottom + spacing.lg;
  const circleBottom = footerBottom + BADGE_SIZE / 2 - bottomCircle / 2;
  const illustrationWidth = Math.min(width * 0.9, height * 0.4 * ILLUSTRATION_RATIO, artSpace * ILLUSTRATION_RATIO);

  return (
    <View style={styles.page}>
      <Animated.View style={[styles.frame, { width, opacity }]}>
        {/* Background shapes */}
        <View style={[styles.dome, { width: dome, height: dome, borderRadius: dome / 2, top: domeVisible - dome, left: (width - dome) / 2 }]} />
        <View
          style={[
            styles.circle,
            { width: bottomCircle, height: bottomCircle, borderRadius: bottomCircle / 2, left: -bottomCircle * 0.38, bottom: circleBottom },
          ]}
        />
        <View style={[styles.wave, { width: width * 1.5, height: width * 0.6, borderRadius: width, right: -width * 0.5, bottom: -width * 0.3 }]} />
        <LinearGradient
          colors={['#FFFFFF', '#D9D6FB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.glow, { width: width * 0.95, height: width * 0.38, borderRadius: width, left: width * 0.05, bottom: -width * 0.22 }]}
        />
        {/* Content */}
        <View style={[styles.content, { paddingTop: domeVisible - logoSize * 0.35 }]}>
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: logoSize, height: logoSize }}
            accessibilityIgnoresInvertColors
            accessible={false}
          />
          <Image
            source={require('../../../assets/welcome/wordmark.png')}
            style={{ width: wordmarkWidth, height: wordmarkWidth / WORDMARK_RATIO, marginTop: spacing.lg }}
            accessibilityRole="header"
            accessibilityLabel="Trackademic"
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.tagline}>
            Trackademic is a role-based academic evidence tracking platform that connects Students, Parents/Guardians, and Teachers around the
            same schoolwork records.
          </Text>
          <View style={styles.illustrationWrap} onLayout={(e) => setArtSpace(e.nativeEvent.layout.height)}>
            <Image
              source={require('../../../assets/welcome/learning.png')}
              style={{ width: illustrationWidth, height: illustrationWidth / ILLUSTRATION_RATIO }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible={false}
            />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: footerBottom }]}>
          <DocBadge />
          <View style={styles.footerButton}>
            <Button label="Continue" variant="accent" onPress={next} disabled={leaving} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/** White document with an arrow, from the design's bottom-left circle. Decorative only. */
function DocBadge() {
  return (
    <View style={styles.docBadge} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.doc}>
        <View style={[styles.docLine, { width: '70%' }]} />
        <View style={[styles.docLine, { width: '70%' }]} />
        <View style={[styles.docLine, { width: '45%' }]} />
      </View>
      <View style={styles.docArrow}>
        <Ionicons name="arrow-up" size={14} color={INDIGO} style={styles.arrowIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.surface },
  frame: { flex: 1, overflow: 'hidden', backgroundColor: colors.surface },
  dome: { position: 'absolute', backgroundColor: INDIGO },
  circle: { position: 'absolute', backgroundColor: INDIGO },
  wave: { position: 'absolute', backgroundColor: INDIGO },
  glow: { position: 'absolute' },
  docBadge: { width: BADGE_SIZE - 8, height: BADGE_SIZE },
  doc: { width: 46, height: 56, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 8, gap: 6, justifyContent: 'flex-start' },
  docLine: { height: 4, borderRadius: 2, backgroundColor: INDIGO },
  docArrow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: INDIGO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: { transform: [{ rotate: '45deg' }] },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.lg },
  tagline: {
    marginTop: spacing.md,
    maxWidth: 340,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  // Anchored low so the illustration rests on the bottom shapes, as in the design.
  illustrationWrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.md },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  footerButton: { flex: 1 },
});
