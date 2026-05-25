// Backup-Utilities: Export + Import der gesamten App-Daten als JSON
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { FinanzData } from './model';

const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'Finanzflow';
  backupVersion: number;
  exportedAt: string;          // ISO
  data: FinanzData;
}

// Exportiert die aktuellen Daten als JSON-Datei und öffnet das Share-Sheet
export async function exportBackup(data: FinanzData): Promise<void> {
  const payload: BackupFile = {
    app: 'Finanzflow',
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const filename = `finanzflow-backup-${stamp}.json`;
  const uri = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Teilen nicht verfügbar auf diesem Gerät.');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: 'Finanzflow-Backup teilen',
    UTI: 'public.json',
  });
}

// Wählt eine JSON-Datei aus und gibt die FinanzData zurück (oder null bei Abbruch)
export async function importBackup(): Promise<FinanzData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const uri = result.assets[0].uri;
  const txt = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
  let parsed: any;
  try {
    parsed = JSON.parse(txt);
  } catch {
    throw new Error('Datei ist kein gültiges JSON.');
  }
  // Akzeptiere entweder unser Backup-Format oder direkt eine FinanzData
  if (parsed?.app === 'Finanzflow' && parsed?.data) {
    return parsed.data as FinanzData;
  }
  if (parsed?.schemaVersion != null && parsed?.months) {
    return parsed as FinanzData;
  }
  throw new Error('Datei ist kein Finanzflow-Backup.');
}
