import type { AssessmentMatch } from '@/features/assessments/schema';

import { extractCodeCandidates, mergeCandidates } from './codeCandidates';
import type { OcrEngine, OcrResult } from './ocr/types';

export interface OcrSummary {
  /** Raw text from every OCR pass, labelled, for storage with the evidence. */
  text: string;
  confidence: number | null;
  engine: string;
  candidates: string[];
}

export type ScanAnalysis =
  | { kind: 'MATCHED'; match: AssessmentMatch; ocr: OcrSummary }
  | { kind: 'MULTIPLE'; matches: AssessmentMatch[]; ocr: OcrSummary }
  | { kind: 'INVALID_CODE'; ocr: OcrSummary }
  | { kind: 'NO_CODE'; ocr: OcrSummary }
  | { kind: 'OCR_UNAVAILABLE' }
  | { kind: 'OCR_FAILED'; message: string }
  | { kind: 'LOOKUP_FAILED'; message: string; ocr: OcrSummary };

export interface AnalyzeDeps {
  engine: OcrEngine;
  lookup: (codes: string[]) => Promise<AssessmentMatch[]>;
}

export interface AnalyzeImages {
  codeRegionUri: string;
  fullPageUri: string;
}

interface Pass {
  label: string;
  result: OcrResult;
  candidates: string[];
}

async function runPass(engine: OcrEngine, label: string, uri: string, digitsOnly: boolean): Promise<Pass | Error> {
  try {
    const result = await engine.recognize(uri, { digitsOnly });
    return { label, result, candidates: extractCodeCandidates(result.text) };
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function summarize(engine: OcrEngine, passes: Pass[], chosenCode?: string): OcrSummary {
  const source = passes.find((p) => chosenCode !== undefined && p.candidates.includes(chosenCode)) ?? passes[0];
  return {
    text: passes.map((p) => `[${p.label}]\n${p.result.text.trim()}`).join('\n\n'),
    confidence: source?.result.confidence ?? null,
    engine: source?.result.engine ?? engine.name,
    candidates: mergeCandidates(passes.map((p) => p.candidates)),
  };
}

async function resolve(deps: AnalyzeDeps, passes: Pass[]): Promise<ScanAnalysis | null> {
  const candidates = mergeCandidates(passes.map((p) => p.candidates));
  if (candidates.length === 0) return null;

  let matches: AssessmentMatch[];
  try {
    matches = await deps.lookup(candidates);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not check the code.';
    return { kind: 'LOOKUP_FAILED', message, ocr: summarize(deps.engine, passes) };
  }

  const [first] = matches;
  if (first && matches.length === 1) return { kind: 'MATCHED', match: first, ocr: summarize(deps.engine, passes, first.code) };
  if (matches.length > 1) return { kind: 'MULTIPLE', matches, ocr: summarize(deps.engine, passes) };
  return null;
}

/**
 * Code-box OCR first; full-page OCR only if the code box gives no single valid match.
 * Only codes confirmed by the database lookup count as matches.
 */
export async function analyzePaper(images: AnalyzeImages, deps: AnalyzeDeps): Promise<ScanAnalysis> {
  if (!deps.engine.isAvailable()) return { kind: 'OCR_UNAVAILABLE' };

  const passes: Pass[] = [];

  const region = await runPass(deps.engine, 'code box', images.codeRegionUri, true);
  if (!(region instanceof Error)) {
    passes.push(region);
    const early = await resolve(deps, passes);
    if (early) return early;
  }

  const full = await runPass(deps.engine, 'full page', images.fullPageUri, false);
  if (!(full instanceof Error)) passes.push(full);

  if (passes.length === 0) {
    const error = full instanceof Error ? full : region;
    return { kind: 'OCR_FAILED', message: error instanceof Error ? error.message : 'Could not read the photo.' };
  }

  const resolved = await resolve(deps, passes);
  if (resolved) return resolved;

  const ocr = summarize(deps.engine, passes);
  return ocr.candidates.length > 0 ? { kind: 'INVALID_CODE', ocr } : { kind: 'NO_CODE', ocr };
}
