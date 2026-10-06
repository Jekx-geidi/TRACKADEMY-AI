import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PaperGuide } from '@/components/PaperGuide';
import { Notice, Screen } from '@/components/Screen';
import { colors, fonts, spacing } from '@/components/theme';
import { WorkflowSteps } from '@/components/WorkflowSteps';
import { useScanSession } from '@/features/scanner/ScanSession';
import { usePickPaper } from '@/features/scanner/usePickPaper';

export default function ScanScreen() {
  const { pick, error, busy } = usePickPaper();
  const { target } = useScanSession();

  return (
    <Screen>
      <Card>
        <WorkflowSteps current={0} />
      </Card>

      <Card style={styles.guide}>
        <PaperGuide />
        <Text style={styles.guideTitle}>Show the code clearly</Text>
        <Text style={styles.guideText}>
          Make sure the 5-digit code in the upper-right box can be seen. Lay the paper flat in good light.
        </Text>
      </Card>

      {target ? <Text style={styles.for}>Saving for: {target.displayName}</Text> : null}
      {error ? <Notice tone="danger" title="Could not get the photo">{error}</Notice> : null}

      <View style={styles.actions}>
        <Button label="Take Photo" icon="camera" onPress={() => pick('camera')} loading={busy} />
        <Button label="Upload Photo" icon="images" variant="secondary" onPress={() => pick('library')} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  guideTitle: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.heading },
  guideText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  for: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading, textAlign: 'center' },
  actions: { gap: spacing.sm + 4 },
});
