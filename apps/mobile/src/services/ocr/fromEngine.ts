import { extractCodeCandidates } from '@/features/scanner/codeCandidates';
import type { OcrEngine } from '@/features/scanner/ocr/types';

import type { OCRService } from './types';

/** Adapts a raw text engine (ML Kit, Tesseract) to the OCRService interface. */
export function fromEngine(engine: OcrEngine): OCRService {
  return {
    name: engine.name,
    isAvailable: () => engine.isAvailable(),
    async detectAssessmentCode(imageUri) {
      const result = await engine.recognize(imageUri, { digitsOnly: false });
      const [code] = extractCodeCandidates(result.text);
      return { code, confidence: result.confidence ?? undefined, rawText: result.text };
    },
  };
}
