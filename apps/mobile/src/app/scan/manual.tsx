import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/IconTile';
import { Notice, Screen } from '@/components/Screen';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { findAssessmentsByCodes } from '@/features/assessments/api';
import { assessmentCodeSchema } from '@/features/assessments/schema';
import { useScanSession } from '@/features/scanner/ScanSession';

export default function ManualCodeScreen() {
  const { analysis, setSelection } = useScanSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit() {
    setError(null);
    const parsed = assessmentCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError({ title: 'Check the code', body: 'Assessment codes have exactly 5 digits.' });
      return;
    }
    setChecking(true);
    try {
      const [match] = await findAssessmentsByCodes([parsed.data]);
      if (!match) {
        setError({ title: 'Code not found', body: `No active assessment uses ${parsed.data}. Check the code with your teacher.` });
        return;
      }
      // Keep the OCR text (if any) with the record so manual corrections can be measured later.
      setSelection({ match, source: 'MANUAL', ocr: analysis && 'ocr' in analysis ? analysis.ocr : null });
      router.back();
    } catch (e) {
      setError({ title: 'Could not check the code', body: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setChecking(false);
    }
  }

  return (
    <Screen>
      <Card style={styles.card}>
        <IconCircle name="keypad" tint={colors.accentSoft} color={colors.accent} size={56} />
        <Text style={styles.label} nativeID="codeLabel">
          Enter 5-digit assessment code
        </Text>
        <Text style={styles.hint}>It’s the number your teacher gave, written in the upper-right corner of the paper.</Text>
        <TextInput
          accessibilityLabelledBy="codeLabel"
          style={styles.input}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 5))}
          keyboardType="number-pad"
          maxLength={5}
          placeholder="55922"
          placeholderTextColor={colors.textMuted}
          autoFocus
          onSubmitEditing={submit}
        />
      </Card>
      {error ? <Notice tone="danger" title={error.title}>{error.body}</Notice> : null}
      <Button label="Find Assessment" icon="search" onPress={submit} loading={checking} disabled={code.length !== 5} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.lg },
  label: { fontSize: 20, fontFamily: fonts.extrabold, color: colors.heading, textAlign: 'center' },
  hint: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 21, textAlign: 'center' },
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.inputFill,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    fontSize: 36,
    fontFamily: fonts.extrabold,
    letterSpacing: 10,
    textAlign: 'center',
    color: colors.heading,
  },
});
