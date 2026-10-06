import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { AssessmentCard } from '@/components/AssessmentCard';
import { Button } from '@/components/Button';
import { Card, HeroCard } from '@/components/Card';
import { IconCircle } from '@/components/IconTile';
import { Notice, Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, fonts, radius, spacing } from '@/components/theme';
import { WorkflowSteps } from '@/components/WorkflowSteps';
import { scoreSchema } from '@/features/evidence/schema';
import { analyzePaper, type ScanAnalysis } from '@/features/scanner/analyzePaper';
import { useScanSession } from '@/features/scanner/ScanSession';
import { findAssessmentsByCodes } from '@/services/api/assessments';
import { saveEvidence } from '@/services/api/evidence';
import { preparePaperImage } from '@/services/image';
import { ocrEngine } from '@/services/ocr';

/** Below this, we phrase the result as a question rather than a detection. */
const LOW_CONFIDENCE = 0.6;

export default function ReviewScreen() {
  const session = useScanSession();
  const { target, photo, prepared, analysis, selection } = session;
  const startedFor = useRef<string | null>(null);
  const [stage, setStage] = useState<'preparing' | 'reading' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [score, setScore] = useState('');
  const [scoreError, setScoreError] = useState<string | undefined>();

  // Prepare and read the photo once per picked photo.
  useEffect(() => {
    if (!photo || analysis || startedFor.current === photo.uri) return;
    startedFor.current = photo.uri;
    let cancelled = false;

    (async () => {
      setStage('preparing');
      let result: ScanAnalysis;
      try {
        const paper = await preparePaperImage(photo.uri, photo.width);
        if (cancelled) return;
        session.setPrepared(paper);
        setStage('reading');
        result = await analyzePaper(
          { codeRegionUri: paper.codeRegionUri, fullPageUri: paper.uploadUri },
          { engine: ocrEngine, lookup: findAssessmentsByCodes },
        );
      } catch (e) {
        result = { kind: 'OCR_FAILED', message: e instanceof Error ? e.message : 'Could not process the photo.' };
      }
      if (cancelled) return;
      if (result.kind === 'OCR_FAILED') console.warn('[scanner] photo could not be read:', result.message);
      session.setAnalysis(result);
      if (result.kind === 'MATCHED') session.setSelection({ match: result.match, source: 'OCR', ocr: result.ocr });
      setStage(null);
    })();

    return () => {
      cancelled = true;
      startedFor.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per photo
  }, [photo, analysis]);

  if (!target) {
    return (
      <Screen>
        <Notice title="Who is this paper for?">Start from Upload Score (or Scan for your child) so we know whose paper this is.</Notice>
        <Button label="Go Home" onPress={() => router.dismissAll()} />
      </Screen>
    );
  }

  if (!photo) {
    return (
      <Screen>
        <Notice title="No photo yet">Take or upload a photo of the paper first.</Notice>
        <Button label="Scan School Paper" onPress={() => router.replace('/scan')} />
      </Screen>
    );
  }

  const ocr = analysis && 'ocr' in analysis ? analysis.ocr : null;
  const retake = () => router.replace('/scan');
  const enterCode = () => router.push('/scan/manual');

  async function confirm() {
    if (!selection || !target) return;
    const parsedScore = scoreSchema(selection.match.totalScore).safeParse(score);
    if (!parsedScore.success) {
      setScoreError(parsedScore.error.issues[0]?.message);
      return;
    }
    setScoreError(undefined);
    if (!prepared) {
      setSaveError('This photo could not be prepared for saving. Please retake the photo.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveEvidence({
        assessmentId: selection.match.id,
        studentProfileId: target.studentProfileId,
        confirmedCode: selection.match.code,
        codeSource: selection.source,
        score: parsedScore.data,
        ocrText: selection.ocr?.text ?? null,
        ocrConfidence: selection.ocr?.confidence ?? null,
        ocrEngine: selection.ocr?.engine ?? null,
        imageBase64: prepared.uploadBase64,
      });
      session.setSaved(saved);
      router.replace('/scan/saved');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the paper. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const step = selection ? 3 : analysis ? 2 : 1;

  const lowConfidence = selection?.ocr?.confidence != null && selection.ocr.confidence < LOW_CONFIDENCE;

  return (
    <Screen>
      <Card>
        <WorkflowSteps current={step} />
      </Card>

      <Card style={styles.photoCard}>
        <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" accessibilityLabel="Photo of the paper" />
        {stage ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>{stage === 'preparing' ? 'Preparing photo…' : 'Looking for the 5-digit code…'}</Text>
          </View>
        ) : null}
      </Card>

      {selection ? (
        <>
          <HeroCard style={styles.matchHero}>
            <IconCircle name="checkmark" tint={colors.accent} color={colors.accentText} size={52} />
            <View style={styles.matchText}>
              <Text style={styles.matchLabel}>
                {selection.source === 'MANUAL' ? 'Code entered' : lowConfidence ? 'We found a possible code' : 'Code detected'}
              </Text>
              <Text style={styles.matchCode}>{selection.match.code}</Text>
              {lowConfidence ? <Text style={styles.matchLabel}>Is this correct?</Text> : null}
            </View>
          </HeroCard>
          <AssessmentCard assessment={selection.match} showCode={false} />
          <TextField
            label={`Score (out of ${selection.match.totalScore})`}
            icon="trophy-outline"
            placeholder={`e.g. ${Math.round(selection.match.totalScore * 0.9)}`}
            keyboardType="decimal-pad"
            maxLength={7}
            value={score}
            onChangeText={(t) => setScore(t.replace(/[^0-9.]/g, ''))}
            error={scoreError}
            hint="Type the score written on the paper. Your teacher checks it later."
            editable={!saving}
          />
          <Text style={styles.meta}>Saving for: {target.displayName}</Text>
          {saveError ? <Notice tone="danger" title="Not saved yet">{saveError}</Notice> : null}
          <Button label="Confirm & Save" icon="checkmark-circle" onPress={confirm} loading={saving} disabled={!score.trim()} />
          <Button label="Enter Different Code" icon="keypad" variant="secondary" onPress={enterCode} disabled={saving} />
          <Button label="Retake Photo" icon="camera-reverse" variant="ghost" onPress={retake} disabled={saving} />
        </>
      ) : analysis ? (
        <AnalysisProblem
          analysis={analysis}
          onEnterCode={enterCode}
          onRetake={retake}
          onChoose={(match) => session.setSelection({ match, source: 'OCR', ocr })}
        />
      ) : null}

      {ocr?.text ? (
        <Card style={styles.rawBox}>
          <Text style={styles.rawTitle}>
            Text read from photo ({ocr.engine}
            {ocr.confidence != null ? `, ${Math.round(ocr.confidence * 100)}% confidence` : ''})
          </Text>
          <Text style={styles.raw} numberOfLines={12}>
            {ocr.text}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}

function AnalysisProblem({
  analysis,
  onEnterCode,
  onRetake,
  onChoose,
}: {
  analysis: ScanAnalysis;
  onEnterCode: () => void;
  onRetake: () => void;
  onChoose: (match: Extract<ScanAnalysis, { kind: 'MULTIPLE' }>['matches'][number]) => void;
}) {
  const actions = (
    <>
      <Button label="Enter 5-digit assessment code" icon="keypad" onPress={onEnterCode} />
      <Button label="Retake Photo" icon="camera-reverse" variant="secondary" onPress={onRetake} />
    </>
  );

  switch (analysis.kind) {
    case 'MATCHED':
      return null;
    case 'MULTIPLE':
      return (
        <>
          <Notice tone="warning" title="We found more than one code">Which assessment is this paper for?</Notice>
          {analysis.matches.map((m) => (
            <View key={m.id} style={styles.choice}>
              <AssessmentCard assessment={m} />
              <Button label={`This one (${m.code})`} variant="secondary" onPress={() => onChoose(m)} />
            </View>
          ))}
          {actions}
        </>
      );
    case 'INVALID_CODE':
      return (
        <>
          <Notice tone="warning" title="That code doesn’t match an assessment">
            We read {analysis.ocr.candidates.join(', ')}, but no active assessment uses {analysis.ocr.candidates.length > 1 ? 'these codes' : 'this code'}.
            Check the code on the paper and type it in.
          </Notice>
          {actions}
        </>
      );
    case 'NO_CODE':
      return (
        <>
          <Notice tone="warning" title="Could not identify the code">
            We couldn’t find a 5-digit code. Make sure it is in the upper-right box and the photo is clear, or type it in.
          </Notice>
          {actions}
        </>
      );
    case 'OCR_UNAVAILABLE':
      return (
        <>
          <Notice title="Type the code instead">
            Automatic code reading isn’t available in this version of the app. Please type the 5-digit code from the paper.
          </Notice>
          {actions}
        </>
      );
    case 'OCR_FAILED':
      return (
        <>
          <Notice tone="danger" title="Could not read the photo">
            Something went wrong while reading the photo. You can type the code or try another photo.
          </Notice>
          {actions}
        </>
      );
    case 'LOOKUP_FAILED':
      return (
        <>
          <Notice tone="danger" title="Could not check the code">{analysis.message}</Notice>
          {actions}
        </>
      );
  }
}

const styles = StyleSheet.create({
  photoCard: { padding: spacing.sm },
  photo: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.inputFill },
  loading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', padding: spacing.sm },
  loadingText: { fontFamily: fonts.regular, fontSize: 16, color: colors.textMuted },
  matchHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  matchText: { flex: 1 },
  matchLabel: { fontSize: 15, fontFamily: fonts.semibold, color: colors.heroMuted },
  matchCode: { fontSize: 36, fontFamily: fonts.extrabold, letterSpacing: 6, color: colors.primaryText, fontVariant: ['tabular-nums'] },
  meta: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  choice: { gap: spacing.sm },
  rawBox: { gap: spacing.xs },
  rawTitle: { fontSize: 13, fontFamily: fonts.semibold, color: colors.textMuted },
  raw: { fontSize: 13, color: colors.textMuted, fontFamily: 'monospace' },
});
