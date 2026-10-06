import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { usePickPaper } from '@/features/scanner/usePickPaper';
import { useScanSession, type ScanTarget } from '@/features/scanner/ScanSession';

import { Button } from './Button';
import { Card } from './Card';
import { PaperGuide } from './PaperGuide';
import { Notice } from './Screen';
import { colors, fonts, spacing } from './theme';
import { WorkflowSteps } from './WorkflowSteps';

/**
 * Start of the upload flow: photo → detect code → match → confirm score → save.
 * `target` is who the paper belongs to; nothing can be picked until it is known.
 */
export function UploadPanel({ target, header }: { target: ScanTarget | null; header?: ReactNode }) {
  const { setTarget } = useScanSession();
  const { pick, error, busy } = usePickPaper();

  const start = (source: 'camera' | 'library') => {
    if (!target) return;
    setTarget(target);
    void pick(source);
  };

  return (
    <>
      {header}
      <Card>
        <WorkflowSteps current={0} />
      </Card>
      <Card style={styles.guide}>
        <PaperGuide />
        <Text style={styles.guideTitle}>Show the code clearly</Text>
        <Text style={styles.guideText}>
          Make sure the 5-digit code in the upper-right box and the score can be seen. Lay the paper flat in good light.
        </Text>
      </Card>
      {target ? <Text style={styles.for}>Saving for: {target.displayName}</Text> : null}
      {error ? (
        <Notice tone="danger" title="Could not get the photo">
          {error}
        </Notice>
      ) : null}
      <View style={styles.actions}>
        <Button label="Take Photo" icon="camera" onPress={() => start('camera')} loading={busy} disabled={!target} />
        <Button label="Upload Photo" icon="images" variant="secondary" onPress={() => start('library')} disabled={busy || !target} />
      </View>
      <Text style={styles.note}>If the code can’t be read from the photo, you can type it in on the next screen.</Text>
    </>
  );
}

const styles = StyleSheet.create({
  guide: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  guideTitle: { fontSize: 18, fontFamily: fonts.extrabold, color: colors.heading },
  guideText: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  for: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading, textAlign: 'center' },
  actions: { gap: spacing.sm + 4 },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
