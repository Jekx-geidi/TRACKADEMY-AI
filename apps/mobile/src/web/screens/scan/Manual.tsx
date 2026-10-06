import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';

import { findAssessmentsByCodes } from '@/features/assessments/api';
import { assessmentCodeSchema } from '@/features/assessments/schema';
import { useScanSession } from '@/features/scanner/ScanSession';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { IconCircle } from '../../ui/IconTile';
import { Notice, Screen, TopBar } from '../../ui/Screen';
import { colors } from '../../ui/theme';
import './scan.css';

export default function ManualCodeScreen() {
  const navigate = useNavigate();
  const { analysis, setSelection } = useScanSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState<{ title: string; body: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const labelId = useId();

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
      navigate(-1);
    } catch (e) {
      setError({ title: 'Could not check the code', body: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setChecking(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  // Enter with fewer than 5 digits still explains the rule (the Expo keyboard's submit did),
  // even though the disabled button blocks the browser's own Enter-to-submit.
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && code.length !== 5 && !checking) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <>
      <TopBar title="Enter Code" />
      <Screen>
        <form className="scan-form" onSubmit={onSubmit}>
          <Card className="scan-code-card">
            <IconCircle name="keypad" tint={colors.accentSoft} color={colors.accent} size={56} />
            <p className="scan-code-label" id={labelId}>
              Enter 5-digit assessment code
            </p>
            <p className="scan-code-hint">It’s the number your teacher gave, written in the upper-right corner of the paper.</p>
            <input
              aria-labelledby={labelId}
              className="plain-input scan-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              onKeyDown={onKeyDown}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={5}
              placeholder="55922"
              autoFocus
            />
          </Card>
          {error ? (
            <Notice tone="danger" title={error.title}>
              {error.body}
            </Notice>
          ) : null}
          <Button type="submit" label="Find Assessment" icon="search" loading={checking} disabled={code.length !== 5} />
        </form>
      </Screen>
    </>
  );
}
