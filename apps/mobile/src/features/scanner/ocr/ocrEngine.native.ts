import { NativeModules } from 'react-native';

import { OcrUnavailableError, type OcrEngine } from './types';

// Google ML Kit on-device text recognition. It needs a development build
// (`npx expo run:android` / EAS) — Expo Go does not include the native module, in which
// case isAvailable() is false and the scanner goes straight to manual code entry.
function isLinked(): boolean {
  return NativeModules.TextRecognition != null;
}

export const ocrEngine: OcrEngine = {
  name: 'mlkit',
  isAvailable: isLinked,
  async recognize(imageUri) {
    if (!isLinked()) throw new OcrUnavailableError();
    // Imported lazily so Expo Go never touches the unlinked module.
    const { default: TextRecognition } = await import('@react-native-ml-kit/text-recognition');
    const result = await TextRecognition.recognize(imageUri);
    // ML Kit's text API does not expose confidence scores.
    return { text: result.text, confidence: null, engine: 'mlkit' };
  },
};
