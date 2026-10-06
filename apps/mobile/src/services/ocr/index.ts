// The platform engine is chosen at build time by Metro:
//   iOS/Android → Google ML Kit (features/scanner/ocr/ocrEngine.native.ts; needs a dev build,
//                 unavailable in Expo Go → manual code entry)
//   web         → Tesseract.js (features/scanner/ocr/ocrEngine.web.ts; dev preview only)
// The scan flow itself uses analyzePaper(), which runs the code box and the full page and
// validates every candidate with the database.
import { ocrEngine } from '@/features/scanner/ocr/ocrEngine';

import { fromEngine } from './fromEngine';

export const ocrService = fromEngine(ocrEngine);
export { ocrEngine };
export { fromEngine } from './fromEngine';
export { createMockOcrService } from './mock';
export type { OCRService } from './types';
