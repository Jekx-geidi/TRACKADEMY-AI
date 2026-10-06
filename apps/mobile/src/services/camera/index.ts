import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

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

const OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1, allowsEditing: false };

/** Takes or picks one photo. Resolves null when the user cancels. */
export async function getPhoto(source: PhotoSource): Promise<Photo | null> {
  if (source === 'camera' && Platform.OS !== 'web') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new CameraPermissionError();
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(OPTIONS) : await ImagePicker.launchImageLibraryAsync(OPTIONS);
  const asset = result.assets?.[0];
  if (result.canceled || !asset) return null;
  return { uri: asset.uri, width: asset.width, height: asset.height };
}
