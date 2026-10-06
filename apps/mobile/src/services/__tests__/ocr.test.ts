import type { OcrEngine } from '@/features/scanner/ocr/types';

import { createMockOcrService, fromEngine } from '../ocr';

const engine = (text: string, confidence: number | null = 0.8): OcrEngine => ({
  name: 'fake',
  isAvailable: () => true,
  recognize: async () => ({ text, confidence, engine: 'fake' }),
});

describe('OCRService', () => {
  it('returns the first 5-digit candidate with the raw text', async () => {
    const result = await fromEngine(engine('Score 18/20\nCode: 55922')).detectAssessmentCode('paper.jpg');
    expect(result).toEqual({ code: '55922', confidence: 0.8, rawText: 'Score 18/20\nCode: 55922' });
  });

  it('returns no code when none is found, and omits unknown confidence', async () => {
    const result = await fromEngine(engine('no digits here', null)).detectAssessmentCode('paper.jpg');
    expect(result.code).toBeUndefined();
    expect(result.confidence).toBeUndefined();
  });

  it('mock service returns its configured code', async () => {
    await expect(createMockOcrService('12345').detectAssessmentCode('x')).resolves.toMatchObject({ code: '12345' });
    await expect(createMockOcrService().detectAssessmentCode('x')).resolves.not.toHaveProperty('code');
  });
});
