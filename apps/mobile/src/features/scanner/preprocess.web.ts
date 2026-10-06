// Browser build of preprocess.ts, using a canvas instead of expo-image-manipulator.

/** Wide enough to keep teacher markings and scores readable, small enough to upload quickly. */
const UPLOAD_MAX_WIDTH = 1600;
const UPLOAD_JPEG_QUALITY = 0.8;

/**
 * Students are told to write the code in a box in the upper-right corner. We OCR that
 * region first, enlarged, before falling back to the whole page.
 */
const CODE_REGION = { left: 0.45, top: 0, width: 0.55, height: 0.3 } as const;
const CODE_REGION_WIDTH = 1200;

export interface PreparedPaper {
  /** Compressed JPEG that is uploaded as evidence and used for full-page OCR. */
  uploadUri: string;
  uploadBase64: string;
  width: number;
  height: number;
  /** Enlarged crop of the upper-right corner for code detection. */
  codeRegionUri: string;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not open the photo'));
    img.src = uri;
  });
}

function draw(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the photo for upload');
  ctx.imageSmoothingQuality = 'high';
  paint(ctx);
  return canvas;
}

/** `sourceWidth` is unused here: the browser reads the real size from the image itself. */
export async function preparePaperImage(sourceUri: string, _sourceWidth?: number): Promise<PreparedPaper> {
  const img = await loadImage(sourceUri);
  const scale = Math.min(1, UPLOAD_MAX_WIDTH / img.naturalWidth);
  const width = Math.round(img.naturalWidth * scale);
  const height = Math.round(img.naturalHeight * scale);
  const resized = draw(width, height, (ctx) => ctx.drawImage(img, 0, 0, width, height));
  const uploadUri = resized.toDataURL('image/jpeg', UPLOAD_JPEG_QUALITY);

  const crop = {
    x: Math.round(width * CODE_REGION.left),
    y: Math.round(height * CODE_REGION.top),
    width: Math.round(width * CODE_REGION.width),
    height: Math.round(height * CODE_REGION.height),
  };
  const regionHeight = Math.round((crop.height * CODE_REGION_WIDTH) / crop.width);
  const region = draw(CODE_REGION_WIDTH, regionHeight, (ctx) =>
    ctx.drawImage(resized, crop.x, crop.y, crop.width, crop.height, 0, 0, CODE_REGION_WIDTH, regionHeight),
  );

  return {
    uploadUri,
    uploadBase64: uploadUri.slice(uploadUri.indexOf(',') + 1),
    width,
    height,
    codeRegionUri: region.toDataURL('image/jpeg', 1),
  };
}
