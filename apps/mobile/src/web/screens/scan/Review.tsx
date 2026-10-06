import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { homeFor } from '@/features/auth/roles';
import { scoreSchema } from '@/features/evidence/schema';
import { analyzePaper, type ScanAnalysis } from '@/features/scanner/analyzePaper';
import { useScanSession } from '@/features/scanner/ScanSession';
import { findAssessmentsByCodes } from '@/services/api/assessments';
import { saveEvidence } from '@/services/api/evidence';
import { preparePaperImage } from '@/services/image';
import { ocrEngine } from '@/services/ocr';

import { AssessmentCard } from '../../ui/AssessmentCard';
import { Button } from '../../ui/Button';
import { Card, HeroCard } from '../../ui/Card';
import { IconCircle } from '../../ui/IconTile';
import { Notice, Screen, TopBar } from '../../ui/Screen';
import { Spinner } from '../../ui/Spinner';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';
import { WorkflowSteps } from '../../ui/WorkflowSteps';
import './scan.css';

/** Below this, we phrase the result as a question rather than a detection. */
const LOW_CONFIDENCE = 0.6;

export default function ReviewScreen() {
  const navigate = useNavigate();
  const { profile } = useAuth();
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

  // The Expo stack disabled going back from Saved; in a browser the Back button still works,
  // so a paper that is already saved is never shown here again (and can't be saved twice).
  if (session.saved) return <Navigate to="/scan/saved" replace />;

  if (!target) {
    return (
      <>
        <TopBar title="Check Paper" />
        <Screen>
          <Notice title="Who is this paper for?">Start from Upload Score (or Scan for your child) so we know whose paper this is.</Notice>
          <Button label="Go Home" onPress={() => navigate(homeFor(true, profile), { replace: true })} />
        </Screen>
      </>
    );
  }

  if (!photo) {
    return (
      <>
        <TopBar title="Check Paper" />
        <Screen>
          <Notice title="No photo yet">Take or upload a photo of the paper first.</Notice>
          <Button label="Scan School Paper" onPress={() => navigate('/scan', { replace: true })} />
        </Screen>
      </>
    );
  }

  const ocr = analysis && 'ocr' in analysis ? analysis.ocr : null;
  const retake = () => navigate('/scan', { replace: true });
  const enterCode = () => navigate('/scan/manual');

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
      navigate('/scan/saved', { replace: true });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save the paper. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Enter on the keyboard follows the same rules as the button (disabled while empty or saving).
    if (saving || !score.trim()) return;
    void confirm();
  }

  const step = selection ? 3 : analysis ? 2 : 1;

  const lowConfidence = selection?.ocr?.confidence != null && selection.ocr.confidence < LOW_CONFIDENCE;

  return (
    <>
      <TopBar title="Check Paper" />
      <Screen>
        <Card>
          <WorkflowSteps current={step} />
        </Card>

        <Card className="scan-photo-card">
          <img src={photo.uri} className="scan-photo" alt="Photo of the paper" />
          {stage ? (
            <div className="scan-loading">
              <Spinner size="small" label={stage === 'preparing' ? 'Preparing photo' : 'Looking for the code'} />
              <p className="scan-loading-text">{stage === 'preparing' ? 'Preparing photo…' : 'Looking for the 5-digit code…'}</p>
            </div>
          ) : null}
        </Card>

        {selection ? (
          <>
            <HeroCard className="scan-match-hero">
              <IconCircle name="checkmark" tint={colors.accent} color={colors.accentText} size={52} />
              <div className="scan-match-text">
                <p className="scan-match-label">
                  {selection.source === 'MANUAL' ? 'Code entered' : lowConfidence ? 'We found a possible code' : 'Code detected'}
                </p>
                <p className="scan-match-code">{selection.match.code}</p>
                {lowConfidence ? <p className="scan-match-label">Is this correct?</p> : null}
              </div>
            </HeroCard>
            <AssessmentCard assessment={selection.match} showCode={false} />
            <form className="scan-form" onSubmit={onSubmit}>
              <TextField
                label={`Score (out of ${selection.match.totalScore})`}
                icon="trophy-outline"
                placeholder={`e.g. ${Math.round(selection.match.totalScore * 0.9)}`}
                inputMode="decimal"
                autoComplete="off"
                maxLength={7}
                value={score}
                onChangeText={(t) => setScore(t.replace(/[^0-9.]/g, ''))}
                error={scoreError}
                hint="Type the score written on the paper. Your teacher checks it later."
                editable={!saving}
              />
              <p className="scan-meta">Saving for: {target.displayName}</p>
              {saveError ? (
                <Notice tone="danger" title="Not saved yet">
                  {saveError}
                </Notice>
              ) : null}
              <Button type="submit" label="Confirm & Save" icon="checkmark-circle" loading={saving} disabled={!score.trim()} />
              <Button label="Enter Different Code" icon="keypad" variant="secondary" onPress={enterCode} disabled={saving} />
              <Button label="Retake Photo" icon="camera-reverse" variant="ghost" onPress={retake} disabled={saving} />
            </form>
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
          <Card className="scan-raw-box">
            <p className="scan-raw-title">
              Text read from photo ({ocr.engine}
              {ocr.confidence != null ? `, ${Math.round(ocr.confidence * 100)}% confidence` : ''})
            </p>
            <p className="scan-raw">{ocr.text}</p>
          </Card>
        ) : null}
      </Screen>
    </>
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
          <Notice tone="warning" title="We found more than one code">
            Which assessment is this paper for?
          </Notice>
          {analysis.matches.map((m) => (
            <div key={m.id} className="scan-choice">
              <AssessmentCard assessment={m} />
              <Button label={`This one (${m.code})`} variant="secondary" onPress={() => onChoose(m)} />
            </div>
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
          <Notice tone="danger" title="Could not check the code">
            {analysis.message}
          </Notice>
          {actions}
        </>
      );
  }
}
