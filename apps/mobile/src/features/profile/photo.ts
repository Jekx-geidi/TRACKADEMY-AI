/** Profile photos are stored as small square JPEGs: enough for an avatar, quick to upload. */
const PHOTO_SIZE = 512;
const PHOTO_QUALITY = 0.85;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a photo this browser can open.'));
    };
    img.src = url;
  });
}

/** Centre-crops to a square and re-encodes as JPEG (which also drops EXIF data such as location). */
export async function preparePhoto(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const size = Math.min(PHOTO_SIZE, side);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot prepare photos.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY));
  if (!blob) throw new Error('Could not prepare the photo. Please try another one.');
  return blob;
}
