// Foto-Utilities — speichern in App-Storage + Galerie-Album „Finanzflow-Belege"
// Variante B+: lokale Kopie für App + Galerie-Sync für iCloud/Google Photos Backup

import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

export const ALBUM_BELEGE = 'Finanzflow-Belege';
export const ALBUM_STEUER = 'Finanzflow-Steuer';
const BELEGE_DIR = (FileSystem.documentDirectory ?? '') + 'belege/';

async function ensureBelegeDir() {
  const info = await FileSystem.getInfoAsync(BELEGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BELEGE_DIR, { intermediates: true });
  }
}

// Kopiert eine Foto-URI in den App-Storage und gibt den neuen Pfad zurück
async function copyToAppStorage(srcUri: string, id: string): Promise<string> {
  await ensureBelegeDir();
  const ext = srcUri.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext) ? ext : 'jpg';
  const dest = `${BELEGE_DIR}${id}.${cleanExt}`;
  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return dest;
}

// Speichert das Foto zusätzlich im Galerie-Album (für iCloud/Google Photos Backup)
async function saveToGalleryAlbum(uri: string, albumName: string): Promise<void> {
  try {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) return; // optional, scheitert leise
    const asset = await MediaLibrary.createAssetAsync(uri);
    let album = await MediaLibrary.getAlbumAsync(albumName);
    if (!album) {
      await MediaLibrary.createAlbumAsync(albumName, asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
  } catch (e) {
    console.warn('Galerie-Backup fehlgeschlagen:', e);
  }
}

// Foto aus Galerie wählen, in App-Storage kopieren + Galerie-Album backup
export async function pickFromGallery(id: string, albumName: string = ALBUM_BELEGE): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Berechtigung', 'Bitte Foto-Zugriff in den Einstellungen erlauben.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const src = result.assets[0].uri;
  const appPath = await copyToAppStorage(src, id);
  await saveToGalleryAlbum(appPath, albumName);
  return appPath;
}

// Mit Kamera fotografieren
export async function takePhoto(id: string, albumName: string = ALBUM_BELEGE): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Berechtigung', 'Bitte Kamera-Zugriff in den Einstellungen erlauben.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const src = result.assets[0].uri;
  const appPath = await copyToAppStorage(src, id);
  await saveToGalleryAlbum(appPath, albumName);
  return appPath;
}

// Foto aus App-Storage löschen (Galerie bleibt — User behält Backup)
export async function deleteAppFoto(uri: string): Promise<void> {
  try {
    if (uri.startsWith(BELEGE_DIR)) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    console.warn('Foto konnte nicht gelöscht werden:', e);
  }
}

// Datei als Base64 lesen (für PDF-Einbettung)
export async function readAsBase64(uri: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    return null;
  }
}
