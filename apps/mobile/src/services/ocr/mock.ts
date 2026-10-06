import type { OCRService } from './types';

/** For tests and demos: always "reads" the given code (or nothing). */
export function createMockOcrService(code?: string, confidence = 0.9): OCRService {
  return {
    name: 'mock',
    isAvailable: () => true,
    detectAssessmentCode: async () => (code ? { code, confidence, rawText: `Score: 18/20\n${code}` } : { rawText: 'no code here' }),
  };
}
