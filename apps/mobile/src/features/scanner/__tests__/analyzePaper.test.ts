import type { AssessmentMatch } from '@/features/assessments/schema';

import { analyzePaper, type AnalyzeDeps } from '../analyzePaper';
import type { OcrEngine } from '../ocr/types';

const images = { codeRegionUri: 'region.jpg', fullPageUri: 'page.jpg' };

function match(code: string): AssessmentMatch {
  return {
    id: `00000000-0000-4000-8000-0000000${code}`,
    code,
    subject: 'Mathematics',
    title: 'Fractions Quiz',
    assessmentType: 'QUIZ',
    quarter: 'FIRST_QUARTER',
    totalScore: 20,
  };
}

function engine(texts: { region?: string | Error; page?: string | Error }, available = true): OcrEngine & { calls: string[] } {
  const calls: string[] = [];
  return {
    name: 'fake',
    calls,
    isAvailable: () => available,
    recognize: async (uri) => {
      calls.push(uri);
      const value = uri === images.codeRegionUri ? texts.region : texts.page;
      if (value instanceof Error) throw value;
      return { text: value ?? '', confidence: 0.8, engine: 'fake' };
    },
  };
}

function deps(e: OcrEngine, active: string[]): AnalyzeDeps & { lookups: string[][] } {
  const lookups: string[][] = [];
  return {
    engine: e,
    lookups,
    lookup: async (codes) => {
      lookups.push(codes);
      return codes.filter((c) => active.includes(c)).map(match);
    },
  };
}

describe('analyzePaper', () => {
  it('matches from the code box without reading the full page', async () => {
    const e = engine({ region: '55922' });
    const result = await analyzePaper(images, deps(e, ['55922']));
    expect(result.kind).toBe('MATCHED');
    expect(e.calls).toEqual(['region.jpg']);
  });

  it('falls back to the full page when the code box has no valid code', async () => {
    const e = engine({ region: '', page: 'Name Jake\n55922\n18/20' });
    const result = await analyzePaper(images, deps(e, ['55922']));
    expect(result.kind).toBe('MATCHED');
    expect(e.calls).toEqual(['region.jpg', 'page.jpg']);
  });

  it('never treats an unvalidated number as a match', async () => {
    const result = await analyzePaper(images, deps(engine({ region: '12398', page: '12398' }), ['55922']));
    expect(result.kind).toBe('INVALID_CODE');
    if (result.kind === 'INVALID_CODE') expect(result.ocr.candidates).toEqual(['12398']);
  });

  it('reports multiple valid codes instead of guessing', async () => {
    const result = await analyzePaper(images, deps(engine({ region: '55922 48317' }), ['55922', '48317']));
    expect(result.kind).toBe('MULTIPLE');
  });

  it('reports no code when OCR finds no 5-digit number', async () => {
    const result = await analyzePaper(images, deps(engine({ region: '', page: 'Quiz 18/20' }), ['55922']));
    expect(result.kind).toBe('NO_CODE');
  });

  it('reports OCR failure when every pass fails', async () => {
    const result = await analyzePaper(images, deps(engine({ region: new Error('boom'), page: new Error('boom') }), []));
    expect(result.kind).toBe('OCR_FAILED');
  });

  it('still uses the full page if the code box pass fails', async () => {
    const result = await analyzePaper(images, deps(engine({ region: new Error('boom'), page: '55922' }), ['55922']));
    expect(result.kind).toBe('MATCHED');
  });

  it('reports OCR unavailable without calling the engine', async () => {
    const e = engine({ region: '55922' }, false);
    const result = await analyzePaper(images, deps(e, ['55922']));
    expect(result.kind).toBe('OCR_UNAVAILABLE');
    expect(e.calls).toEqual([]);
  });

  it('reports lookup failures separately from OCR failures', async () => {
    const d: AnalyzeDeps = {
      engine: engine({ region: '55922' }),
      lookup: () => Promise.reject(new Error('network down')),
    };
    const result = await analyzePaper(images, d);
    expect(result.kind).toBe('LOOKUP_FAILED');
  });

  it('keeps labelled OCR text from both passes', async () => {
    const result = await analyzePaper(images, deps(engine({ region: '', page: '55922' }), ['55922']));
    if (result.kind !== 'MATCHED') throw new Error(`unexpected ${result.kind}`);
    expect(result.ocr.text).toContain('[code box]');
    expect(result.ocr.text).toContain('[full page]');
    expect(result.ocr.confidence).toBe(0.8);
  });
});
