import { createWorker, PSM, type Worker } from 'tesseract.js';

import type { OcrEngine } from './types';

// Prototype engine for the browser build. Tesseract is tuned for print and is weak on
// handwriting; it exists so the full flow can be exercised without a native build.
// Language data is downloaded from the tesseract.js CDN on first use.

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker('eng').catch((error: unknown) => {
    workerPromise = null;
    throw error;
  });
  return workerPromise;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the image for reading'));
    img.src = uri;
  });
}

/**
 * Tesseract reads handwritten digits best when they are small (~30-60px tall), and results
 * vary with scale. For the code box we read several widths and pool the text; every
 * candidate is validated against the database afterwards, so extra guesses are cheap.
 */
const CODE_BOX_WIDTHS = [280, 340, 400, 460] as const;
/** Full pages read better slightly reduced than at upload resolution. */
const FULL_PAGE_WIDTH = 1000;

/** Halves the image until it is within 2x of the target; one big canvas downscale aliases thin strokes. */
function downscaleSource(img: HTMLImageElement, targetWidth: number): CanvasImageSource {
  let source: HTMLImageElement | HTMLCanvasElement = img;
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  while (width / 2 >= targetWidth) {
    width = Math.round(width / 2);
    height = Math.round(height / 2);
    const step = document.createElement('canvas');
    step.width = width;
    step.height = height;
    const ctx = step.getContext('2d');
    if (!ctx) break;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    source = step;
  }
  return source;
}

/** Scales to `width` (never enlarges), then grayscale + contrast stretch for faint pencil and uneven light. */
function enhance(img: HTMLImageElement, width: number): HTMLCanvasElement {
  const scale = Math.min(1, width / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(downscaleSource(img, canvas.width), 0, 0, canvas.width, canvas.height);

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  let min = 255;
  let max = 0;
  for (let i = 0; i < px.length; i += 4) {
    const gray = Math.round(0.299 * px[i]! + 0.587 * px[i + 1]! + 0.114 * px[i + 2]!);
    px[i] = px[i + 1] = px[i + 2] = gray;
    if (gray < min) min = gray;
    if (gray > max) max = gray;
  }
  const range = Math.max(1, max - min);
  for (let i = 0; i < px.length; i += 4) {
    const stretched = Math.round(((px[i]! - min) * 255) / range);
    px[i] = px[i + 1] = px[i + 2] = stretched;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function toConfidence(value: number): number | null {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value / 100)) : null;
}

export const ocrEngine: OcrEngine = {
  name: 'tesseract.js',
  isAvailable: () => typeof document !== 'undefined',
  async recognize(imageUri, { digitsOnly }) {
    const worker = await getWorker();
    const img = await loadImage(imageUri);

    if (!digitsOnly) {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO, tessedit_char_whitelist: '' });
      const { data } = await worker.recognize(enhance(img, FULL_PAGE_WIDTH));
      return { text: data.text, confidence: toConfidence(data.confidence), engine: 'tesseract.js' };
    }

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, tessedit_char_whitelist: '0123456789' });
    const lines: string[] = [];
    let best: number | null = null;
    for (const width of CODE_BOX_WIDTHS) {
      const { data } = await worker.recognize(enhance(img, width));
      const text = data.text.trim();
      if (!text) continue;
      lines.push(text);
      const confidence = toConfidence(data.confidence);
      if (confidence !== null && (best === null || confidence > best)) best = confidence;
    }
    return { text: lines.join('\n'), confidence: best, engine: 'tesseract.js' };
  },
};
