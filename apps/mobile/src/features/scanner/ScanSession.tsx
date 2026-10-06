import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import type { AssessmentMatch } from '@/features/assessments/schema';
import type { CodeSource, SavedEvidence } from '@/features/evidence/schema';

import type { OcrSummary, ScanAnalysis } from './analyzePaper';
import type { PreparedPaper } from './preprocess';

export interface PickedPhoto {
  uri: string;
  width: number;
}

/** What the user is about to confirm: an assessment validated by the server. */
export interface ScanSelection {
  match: AssessmentMatch;
  source: CodeSource;
  ocr: OcrSummary | null;
}

/** The student the paper belongs to: the student themself, or a parent's chosen child. */
export interface ScanTarget {
  studentProfileId: string;
  displayName: string;
}

interface ScanSessionValue {
  target: ScanTarget | null;
  setTarget: (target: ScanTarget | null) => void;
  photo: PickedPhoto | null;
  prepared: PreparedPaper | null;
  analysis: ScanAnalysis | null;
  selection: ScanSelection | null;
  saved: SavedEvidence | null;
  startScan: (photo: PickedPhoto) => void;
  setPrepared: (prepared: PreparedPaper) => void;
  setAnalysis: (analysis: ScanAnalysis) => void;
  setSelection: (selection: ScanSelection | null) => void;
  setSaved: (saved: SavedEvidence) => void;
  reset: () => void;
}

const ScanSessionContext = createContext<ScanSessionValue | null>(null);

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ScanTarget | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [prepared, setPrepared] = useState<PreparedPaper | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [selection, setSelection] = useState<ScanSelection | null>(null);
  const [saved, setSaved] = useState<SavedEvidence | null>(null);

  // A different account must never see or save into the previous account's scan.
  const userId = useAuth().session?.user.id ?? null;
  const [owner, setOwner] = useState(userId);
  if (owner !== userId) {
    setOwner(userId);
    setTarget(null);
    setPhoto(null);
    setPrepared(null);
    setAnalysis(null);
    setSelection(null);
    setSaved(null);
  }

  const value = useMemo<ScanSessionValue>(() => {
    // Clears the paper being scanned; the target student stays for the next paper.
    const reset = () => {
      setPhoto(null);
      setPrepared(null);
      setAnalysis(null);
      setSelection(null);
      setSaved(null);
    };
    return {
      target,
      setTarget,
      photo,
      prepared,
      analysis,
      selection,
      saved,
      startScan: (next) => {
        reset();
        setPhoto(next);
      },
      setPrepared,
      setAnalysis,
      setSelection,
      setSaved,
      reset,
    };
  }, [target, photo, prepared, analysis, selection, saved]);

  return <ScanSessionContext.Provider value={value}>{children}</ScanSessionContext.Provider>;
}

export function useScanSession(): ScanSessionValue {
  const ctx = useContext(ScanSessionContext);
  if (!ctx) throw new Error('useScanSession must be used inside ScanSessionProvider');
  return ctx;
}
