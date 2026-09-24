// Klip kapagi: her kesitin BASLADIGI andaki video karesini uretir (ayni videonun
// farkli klipleri farkli kapak alir). expo-video'nun createVideoPlayer +
// generateThumbnailsAsync'i ile CIHAZDA uretilir; yeni native paket/build gerekmez.
//
// Maliyet dengesi: uzak videodan kare cekmek arama (seek) ister; bu yuzden
//  - sonuc (media+zaman) onbellege alinir,
//  - ayni anda en fazla MAX_CONCURRENT uretim calisir (agi bogmamak icin),
//  - media basina tek oynatici tutulur, en fazla MAX_PLAYERS; fazlasi serbest birakilir.
// Olcek buyurse dogru cozum ffmpeg ile ingest'te onceden uretmek; bu tembel yol
// altyapisiz calisir ve gorunen satir kadar is yapar.
import { createVideoPlayer, type VideoPlayer, type VideoThumbnail } from 'expo-video';
import { useEffect, useState } from 'react';

import { resolveVideoSource } from './videoSource';

const players = new Map<string, VideoPlayer>();
const playerOrder: string[] = [];
const MAX_PLAYERS = 4;

const thumbCache = new Map<string, VideoThumbnail>();
const inflight = new Map<string, Promise<VideoThumbnail | null>>();

const MAX_CONCURRENT = 3;
let active = 0;
const queue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}
function release() {
  active--;
  const next = queue.shift();
  if (next) {
    active++;
    next();
  }
}

// Kare cikarmadan ONCE kaynagin yuklenmesini bekle; aksi halde generateThumbnails
// bos doner (kart karanlik kalir). readyToPlay ya da hata/zaman asimina kadar bekler.
function waitReady(player: VideoPlayer, timeoutMs = 6000): Promise<boolean> {
  if (player.status === 'readyToPlay') return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      try {
        sub.remove();
      } catch {}
      clearTimeout(timer);
      resolve(ok);
    };
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') finish(true);
      else if (status === 'error') finish(false);
    });
    const timer = setTimeout(() => finish(player.status === 'readyToPlay'), timeoutMs);
  });
}

async function getPlayer(mediaId: string): Promise<VideoPlayer | null> {
  const existing = players.get(mediaId);
  if (existing) return existing;
  const source = await resolveVideoSource(mediaId, null);
  if (!source) return null;
  const player = createVideoPlayer(source);
  player.muted = true;
  players.set(mediaId, player);
  playerOrder.push(mediaId);
  // En eski oynaticilari serbest birak (native bellek). Kullanimdakini atma.
  while (playerOrder.length > MAX_PLAYERS) {
    const evict = playerOrder.shift();
    if (evict && evict !== mediaId) {
      const p = players.get(evict);
      if (p) {
        try {
          p.release();
        } catch {}
        players.delete(evict);
      }
    }
  }
  return player;
}

export async function getClipThumb(
  mediaId: string,
  timeMs: number,
  maxWidth = 240,
): Promise<VideoThumbnail | null> {
  const key = `${mediaId}:${timeMs}`;
  const cached = thumbCache.get(key);
  if (cached) return cached;
  const running = inflight.get(key);
  if (running) return running;

  const task = (async () => {
    await acquire();
    try {
      const player = await getPlayer(mediaId);
      if (!player) return null;
      const ready = await waitReady(player);
      if (!ready) return null;
      const secs = Math.max(0, timeMs / 1000);
      const thumbs = await player.generateThumbnailsAsync([secs], { maxWidth });
      const t = thumbs?.[0] ?? null;
      if (t) thumbCache.set(key, t);
      return t;
    } catch {
      return null;
    } finally {
      release();
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

// Satir basina tembel kapak: gorununce uretir, media+zaman ile onbelleklenir.
export function useClipThumb(mediaId: string, timeMs: number): VideoThumbnail | null {
  const [thumb, setThumb] = useState<VideoThumbnail | null>(null);
  useEffect(() => {
    let alive = true;
    getClipThumb(mediaId, timeMs).then((t) => {
      if (alive) setThumb(t);
    });
    return () => {
      alive = false;
    };
  }, [mediaId, timeMs]);
  return thumb;
}
