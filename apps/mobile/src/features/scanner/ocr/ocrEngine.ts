// Fallback for environments without a platform implementation (e.g. unit tests).
// Metro picks ocrEngine.web.ts or ocrEngine.native.ts at build time.
import { OcrUnavailableError, type OcrEngine } from './types';

export const ocrEngine: OcrEngine = {
  name: 'none',
  isAvailable: () => false,
  recognize: () => Promise.reject(new OcrUnavailableError()),
};
