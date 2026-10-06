/**
 * Reads a 5-digit assessment code from a photo. Assistive only: a returned code is a
 * candidate, never a match. Callers must validate it with findAssessmentsByCodes and always
 * offer manual code entry.
 */
export interface OCRService {
  readonly name: string;
  isAvailable(): boolean;
  detectAssessmentCode(imageUri: string): Promise<{ code?: string; confidence?: number; rawText?: string }>;
}
