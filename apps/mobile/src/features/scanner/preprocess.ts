import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

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

export async function preparePaperImage(sourceUri: string, sourceWidth: number): Promise<PreparedPaper> {
  const resizeContext = ImageManipulator.manipulate(sourceUri);
  if (sourceWidth > UPLOAD_MAX_WIDTH) resizeContext.resize({ width: UPLOAD_MAX_WIDTH });
  const resized = await (await resizeContext.renderAsync()).saveAsync({
    format: SaveFormat.JPEG,
    compress: UPLOAD_JPEG_QUALITY,
    base64: true,
  });
  if (!resized.base64) throw new Error('Could not prepare the photo for upload');

  const crop = {
    originX: Math.round(resized.width * CODE_REGION.left),
    originY: Math.round(resized.height * CODE_REGION.top),
    width: Math.round(resized.width * CODE_REGION.width),
    height: Math.round(resized.height * CODE_REGION.height),
  };
  // Explicit size: the web implementation treats a null dimension as a number.
  const regionSize = { width: CODE_REGION_WIDTH, height: Math.round((crop.height * CODE_REGION_WIDTH) / crop.width) };
  const regionContext = ImageManipulator.manipulate(resized.uri).crop(crop).resize(regionSize);
  const region = await (await regionContext.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 1 });

  return {
    uploadUri: resized.uri,
    uploadBase64: resized.base64,
    width: resized.width,
    height: resized.height,
    codeRegionUri: region.uri,
  };
}
