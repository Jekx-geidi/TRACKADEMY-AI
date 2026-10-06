import { router } from 'expo-router';
import { useState } from 'react';

import { CameraPermissionError, getPhoto, type PhotoSource } from '@/services/camera';

import { useScanSession } from './ScanSession';

export type PaperSource = PhotoSource;

/** Takes or picks a photo, starts a new scan session and opens the review screen. */
export function usePickPaper() {
  const { startScan } = useScanSession();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(source: PaperSource) {
    setError(null);
    setBusy(true);
    try {
      const photo = await getPhoto(source);
      if (!photo) return;
      startScan({ uri: photo.uri, width: photo.width });
      router.push('/scan/review');
    } catch (e) {
      setError(e instanceof CameraPermissionError ? e.message : 'Could not open the camera or photos. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return { pick, error, busy };
}
