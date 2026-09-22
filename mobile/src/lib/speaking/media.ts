import * as FileSystem from 'expo-file-system/legacy';

// Konusma kayitlarinin KALICI yerel depolamasi. Gecici kayit (cache) dosyalarini
// documentDirectory/speaking/<focusId>/ altina kopyalar; boylece geri-dinleme
// mumkun olur ve OS cache temizligi kaydi silmez. Yalnizca yerel; buluta gitmez.
const ROOT = (FileSystem.documentDirectory ?? '') + 'speaking/';

async function ensureDir(dir: string) {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
}

// Gecici ses kaydini kalici yola kopyala; kalici uri'yi don.
export async function persistTakeAudio(focusId: string, takeId: number, tempUri: string): Promise<string> {
  const dir = `${ROOT}${focusId}/`;
  await ensureDir(dir);
  const dest = `${dir}${takeId}.wav`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

// Verilen uri'lerdeki dosyalari sil (kayit silinince cagrilir).
export async function deleteTakeFiles(uris: (string | null)[]) {
  for (const u of uris) {
    if (!u) continue;
    try {
      await FileSystem.deleteAsync(u, { idempotent: true });
    } catch {}
  }
}

// Verilen uri'lerin toplam boyutu (bytes) - depolama gostergesi icin.
export async function totalBytes(uris: (string | null)[]): Promise<number> {
  let sum = 0;
  for (const u of uris) {
    if (!u) continue;
    try {
      const info = await FileSystem.getInfoAsync(u);
      if (info.exists && !info.isDirectory) sum += info.size ?? 0;
    } catch {}
  }
  return sum;
}

// Insan-okur boyut ("1.2 MB").
export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
