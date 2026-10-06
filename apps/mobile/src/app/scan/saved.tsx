import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AssessmentCard } from '@/components/AssessmentCard';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/IconTile';
import { Notice, Screen } from '@/components/Screen';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';
import { EVIDENCE_STATUS_LABELS } from '@/features/evidence/constants';
import { useScanSession } from '@/features/scanner/ScanSession';

export default function SavedScreen() {
  const { saved, selection, reset } = useScanSession();
  const { profile } = useAuth();

  function scanAnother() {
    reset();
    router.replace('/scan');
  }

  function goHome() {
    reset();
    router.dismissAll();
    // Land on the dashboard tab, not the Upload / Scan tab the flow started from.
    router.navigate(homeFor(true, profile));
  }

  if (!saved || !selection) {
    return (
      <Screen>
        <Notice title="Nothing saved yet" />
        <Button label="Scan School Paper" icon="scan" onPress={scanAnother} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.success}>
        <IconCircle name="checkmark-circle" tint={colors.successSoft} color={colors.success} size={72} />
        <Text style={styles.title}>Paper saved</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{EVIDENCE_STATUS_LABELS[saved.status]}</Text>
        </View>
        {saved.score !== null ? (
          <Text style={styles.score}>
            Score: {saved.score}/{selection.match.totalScore}
          </Text>
        ) : null}
        <Text style={styles.meta}>Saved {new Date(saved.uploadedAt).toLocaleString()}</Text>
      </Card>
      <AssessmentCard assessment={selection.match} />
      <Button label="Scan Another Paper" icon="scan" onPress={scanAnother} />
      <Button label="Home" icon="home" variant="secondary" onPress={goHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  success: { alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.lg },
  title: { fontSize: 24, fontFamily: fonts.extrabold, color: colors.heading },
  statusPill: { backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  statusText: { fontSize: 14, fontFamily: fonts.bold, color: colors.heading, textAlign: 'center' },
  score: { fontSize: 20, fontFamily: fonts.extrabold, color: colors.heading },
  meta: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
