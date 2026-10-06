export interface OcrOptions {
  /** Restrict recognition to digits where the engine supports it (used for the code box). */
  digitsOnly: boolean;
}

export interface OcrResult {
  text: string;
  /** 0..1, or null when the engine does not report confidence (e.g. ML Kit). */
  confidence: number | null;
  engine: string;
}

/**
 * OCR is assistive only. Engines return raw text; callers must extract candidates and
 * validate them against the database before using them for routing.
 */
export interface OcrEngine {
  readonly name: string;
  /** False when the engine cannot run in this environment (e.g. ML Kit inside Expo Go). */
  isAvailable(): boolean;
  recognize(imageUri: string, options: OcrOptions): Promise<OcrResult>;
}

export class OcrUnavailableError extends Error {
  constructor(message = 'Automatic code reading is not available on this device.') {
    super(message);
    this.name = 'OcrUnavailableError';
  }
}
