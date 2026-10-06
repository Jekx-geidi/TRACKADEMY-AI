// Browser build of services/camera: a file input. On phones, `capture` opens the camera
// directly; without it, the user picks from their photos (or files on a computer).
export type PhotoSource = 'camera' | 'library';

export interface Photo {
  uri: string;
  width: number;
  height: number;
}

export class CameraPermissionError extends Error {
  constructor() {
    super('Camera permission is needed to take a photo. You can upload a photo instead.');
    this.name = 'CameraPermissionError';
  }
}

function pickFile(source: PhotoSource): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.capture = 'environment';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

function size(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('That file is not a photo this browser can open.'));
    img.src = uri;
  });
}

/** Takes or picks one photo. Resolves null when the user cancels. */
export async function getPhoto(source: PhotoSource): Promise<Photo | null> {
  const file = await pickFile(source);
  if (!file) return null;
  const uri = URL.createObjectURL(file);
  return { uri, ...(await size(uri)) };
}
