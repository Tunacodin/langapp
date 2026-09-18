import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WordSheet } from '@/components/word-sheet';
import { colors, radius, space } from '@/constants/appTheme';
import { addSrsCard, getChunksForSentence, LessonChunk, SentenceRow } from '@/lib/db';
import { Gloss, lookupWord } from '@/lib/glossary';
import { getSentenceWords, TWord } from '@/lib/words';

function cleanWord(s: string) {
  return s.toLowerCase().replace(/[^a-z']/g, '');
}

type Align = { status: 'ok' | 'wrong' | 'missing'; said?: string };

// Hedef kelimeler ile soylenen kelimeleri Levenshtein hizalamasi ile eslestir.
// Her hedef kelime icin: ok (eslesti) | wrong (baska sey soyledin) | missing (soylemedin).
function alignWords(target: string[], said: string[]): Align[] {
  const n = target.length;
  const m = said.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const cost = target[i - 1] === said[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j - 1] + cost, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  const res: Align[] = new Array(n);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = target[i - 1] === said[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + cost) {
        res[i - 1] = cost === 0 ? { status: 'ok' } : { status: 'wrong', said: said[j - 1] };
        i--;
        j--;
        continue;
      }
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      res[i - 1] = { status: 'missing' }; // hedefte var, soylenmedi
      i--;
      continue;
    }
    j--; // fazladan soylenen kelime; hedefte karsiligi yok, atla
  }
  return res;
}

type Props = {
  uri: string;
  sentences: SentenceRow[];
  mediaId: string;
};

export function StudyPlayer({ uri, sentences, mediaId }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 0.2;
  });
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [auto, setAuto] = useState(true); // sentence sonunda otomatik devam
  const autoRef = useRef(true);
  const [aspect, setAspect] = useState(4 / 3); // videonun gercek orani (sourceLoad ile)
  const [ms, setMs] = useState(0); // canli konum (karaoke vurgu icin)
  const [sel, setSel] = useState<{ word: string; gloss: Gloss | null; timing?: TWord } | null>(null);
  const previewEndRef = useRef<number | null>(null); // kelime/segment onizleme bitisi (ms)
  const insets = useSafeAreaInsets();

  // Kart ici canli konusma pratigi: mikrofona bas, KONUSTUKCA kelimeler anlik renklenir.
  // Cihazin kendi konusma tanimasi (on-device/Google) ara sonuclari akitir.
  const [recActive, setRecActive] = useState(false);
  const [heard, setHeard] = useState(''); // canli yaziya cevrilen metin
  const [recErr, setRecErr] = useState<string | null>(null);

  useSpeechRecognitionEvent('result', (e) => {
    setHeard(e.results?.[0]?.transcript ?? '');
  });
  useSpeechRecognitionEvent('end', () => setRecActive(false));
  useSpeechRecognitionEvent('error', (e: any) => {
    setRecErr(e?.message ?? 'Tanima hatasi.');
    setRecActive(false);
  });

  function setActiveIdx(i: number) {
    activeRef.current = i;
    setActive(i);
  }

  // Video yuklenince gercek en/boy oranini al.
  useEffect(() => {
    const sub = player.addListener('sourceLoad', ({ availableVideoTracks }) => {
      const s = availableVideoTracks?.[0]?.size;
      if (s && s.width > 0 && s.height > 0) setAspect(s.width / s.height);
    });
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime }) => {
      const t = currentTime * 1000;
      setMs(t);
      // Kelime/segment onizleme: bitince dur, diger mantigi atla.
      if (previewEndRef.current != null) {
        if (t >= previewEndRef.current) {
          player.pause();
          previewEndRef.current = null;
        }
        return;
      }
      const cur = sentences[activeRef.current];
      if (!autoRef.current && cur && t >= cur.end_ms) {
        player.pause();
        return;
      }
      let idx = -1;
      for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].start_ms <= t) idx = i;
        else break;
      }
      if (idx >= 0 && idx !== activeRef.current) setActiveIdx(idx);
    });
    return () => sub.remove();
  }, [player, sentences]);

  const current = sentences[active] ?? null;
  const chunks: LessonChunk[] = useMemo(
    () => (current ? getChunksForSentence(mediaId, current.idx) : []),
    [current, mediaId],
  );
  // O cumlenin kelimeleri (mutlak zamanli) - karaoke vurgu + kelime sesi icin.
  const words: TWord[] = useMemo(() => {
    if (!current) return [];
    const next = sentences[active + 1]?.start_ms ?? null;
    return getSentenceWords(current.start_ms, next);
  }, [current, active, sentences]);
  // Aktif kelime = start'i gecilen SON kelime. Boylece kelimeler arasi boslukta
  // vurgu kaybolmaz (flicker yok), bir sonraki kelime baslayana kadar oncekinde kalir.
  const activeWord = useMemo(() => {
    let awi = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].start_ms <= ms) awi = i;
      else break;
    }
    return awi;
  }, [words, ms]);

  function go(delta: number) {
    const ni = Math.max(0, Math.min(sentences.length - 1, active + delta));
    setActiveIdx(ni);
    player.currentTime = sentences[ni].start_ms / 1000;
    player.play();
  }
  function toggleAuto() {
    const n = !auto;
    setAuto(n);
    autoRef.current = n;
  }
  // Videonun kendi sesinden bir araligi cal (kelime ya da cumle) ve sonunda dur.
  function playRange(startMs: number, endMs: number) {
    previewEndRef.current = endMs;
    player.currentTime = startMs / 1000;
    player.play();
  }
  function openWord(token: string, timing?: TWord) {
    const r = lookupWord(token);
    const clean = token.toLowerCase().replace(/[^a-z']/g, '');
    setSel({ word: r?.word ?? clean, gloss: r?.gloss ?? null, timing });
  }
  function listenWord() {
    if (sel?.timing) playRange(sel.timing.start_ms, sel.timing.end_ms);
  }
  function addWordToSrs() {
    if (!sel) return;
    addSrsCard({
      front_type: 'vocab',
      front_en: sel.word,
      back_tr: sel.gloss ? sel.gloss.senses.join('; ') : '',
      media_id: mediaId,
      sentence_idx: current?.idx,
    });
    setSel(null);
  }

  // Cumle degisince canli tanimayi durdur ve duyulani temizle.
  useEffect(() => {
    ExpoSpeechRecognitionModule.abort();
    setRecActive(false);
    setHeard('');
    setRecErr(null);
  }, [active]);

  async function startRec() {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setRecErr('Mikrofon/konusma izni verilmedi.');
      return;
    }
    setHeard('');
    setRecErr(null);
    player.pause();
    setRecActive(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true, // konustukca ara sonuclar
      continuous: true, // duraklamada kapanmasin
    });
  }
  function stopRec() {
    ExpoSpeechRecognitionModule.stop();
    setRecActive(false);
  }
  function toggleMic() {
    if (recActive) stopRec();
    else startRec();
  }
  function saveSentence() {
    if (!current) return;
    addSrsCard({
      front_type: 'sentence',
      front_en: current.text_en,
      back_tr: current.text_tr,
      media_id: mediaId,
      sentence_idx: current.idx,
    });
  }

  // Canli duyulan metni hedef cumleyle hizala: her kelime icin ok/wrong/missing.
  // Kayit aktifken ya da duyulan metin varken renkler gosterilir; konustukca guncellenir.
  const showColors = recActive || heard.length > 0;
  const align = useMemo(() => {
    if (!showColors) return null;
    const said = heard.split(/\s+/).map(cleanWord).filter(Boolean);
    return alignWords(words.map((w) => cleanWord(w.w)), said);
  }, [showColors, heard, words]);

  return (
    <View style={{ gap: space.md }}>
      {/* Oynatici blogu: ust safe-area kadar siyah bosluk (kontrol ikonlari statusbar altina iner). */}
      <View style={[styles.playerBlock, { paddingTop: insets.top }]}>
        <View style={[styles.videoWrap, { aspectRatio: aspect }]}>
          <VideoView player={player} style={styles.video} contentFit="cover" nativeControls />
        </View>
        <View style={styles.bar}>
          <Pressable onPress={toggleAuto} hitSlop={8} style={styles.iconBtn}>
            <Ionicons
              name={auto ? 'play-forward' : 'play-forward-outline'}
              size={22}
              color={auto ? colors.accent : '#B9B9BE'}
            />
          </Pressable>
        </View>
      </View>

      {/* Alt: sabit boyutlu kart (metin + kelime + obek), sag altta ok gecisleri */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.counter}>
            {active + 1} / {sentences.length}
          </Text>
          <Pressable
            onPress={toggleMic}
            hitSlop={8}
            disabled={!current}
            style={[styles.mic, recActive && styles.micActive]}>
            <Ionicons
              name={recActive ? 'stop' : 'mic'}
              size={18}
              color={recActive ? '#fff' : colors.accent}
            />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          {current ? (
            <>
              <View style={styles.words}>
                {words.length > 0
                  ? words.map((wd, i) => {
                      const on = !showColors && i === activeWord; // karaoke (konusma modu disinda)
                      const a = align ? align[i] : null;
                      // yesil = dogru, kirmizi = yanlis, gri = hic soylenmedi
                      const pronColor = a
                        ? a.status === 'ok'
                          ? colors.success
                          : a.status === 'wrong'
                            ? colors.danger
                            : colors.muted
                        : undefined;
                      return (
                        <Pressable key={i} onPress={() => openWord(wd.w, wd)} hitSlop={4}>
                          <View>
                            {a?.status === 'wrong' && a.said ? (
                              <Text style={styles.saidBadge} numberOfLines={1}>
                                {a.said}
                              </Text>
                            ) : null}
                            <Text
                              style={[
                                styles.word,
                                on && styles.wordActive,
                                pronColor ? { color: pronColor } : null,
                              ]}>
                              {wd.w}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })
                  : current.text_en.split(/\s+/).map((tok, i) => (
                      <Pressable key={i} onPress={() => openWord(tok)} hitSlop={4}>
                        <Text style={styles.word}>{tok} </Text>
                      </Pressable>
                    ))}
              </View>
              <Text style={styles.tr}>{current.text_tr}</Text>
              {heard.length > 0 && (
                <View style={styles.pronRow}>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={saveSentence} hitSlop={8} style={styles.saveBtn}>
                    <Ionicons name="bookmark-outline" size={16} color={colors.accent} />
                    <Text style={styles.saveText}>Kaydet</Text>
                  </Pressable>
                </View>
              )}
              {recErr && <Text style={styles.pronErr}>{recErr}</Text>}
              {chunks.length > 0 && (
                <View style={styles.chunks}>
                  {chunks.map((c, i) => (
                    <Pressable
                      key={i}
                      style={styles.chunk}
                      onPress={() =>
                        addSrsCard({
                          front_type: 'chunk',
                          front_en: c.text_en,
                          back_tr: c.text_tr,
                          media_id: mediaId,
                          sentence_idx: current.idx,
                        })
                      }>
                      <Text style={styles.chunkText}>{c.text_en} +</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.tr}>Videoyu oynat.</Text>
          )}
        </View>

        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={() => go(-1)} disabled={active === 0} hitSlop={6}>
            <Ionicons name="chevron-back" size={22} color={active === 0 ? colors.line : colors.ink} />
          </Pressable>
          <Pressable
            style={styles.navBtn}
            onPress={() => go(1)}
            disabled={active >= sentences.length - 1}
            hitSlop={6}>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={active >= sentences.length - 1 ? colors.line : colors.ink}
            />
          </Pressable>
        </View>
      </View>

      <WordSheet
        visible={sel != null}
        onClose={() => setSel(null)}
        word={sel?.word ?? null}
        gloss={sel?.gloss ?? null}
        example={current?.text_en ?? ''}
        onAddSrs={addWordToSrs}
        onListen={listenWord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Ekranin padding'ini tasirarak videoyu tam kenara (edge-to-edge) getir.
  playerBlock: {
    marginTop: -space.xl,
    marginHorizontal: -space.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoWrap: { width: '100%', backgroundColor: '#000' },
  video: { flex: 1, backgroundColor: '#000' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#141414',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  iconBtn: { padding: 4 },
  card: {
    minHeight: 230,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.lg,
    padding: space.lg,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  mic: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  cardBody: { flex: 1, gap: space.sm, marginTop: space.sm },
  words: { flexDirection: 'row', flexWrap: 'wrap' },
  // Sabit padding + margin: aktif kutu soldan ~1 karakter bosluklu; aktiflik degisince
  // duzen kaymaz (flicker yok). Kelimeler arasi bosluk marginRight ile.
  word: {
    fontSize: 19,
    fontWeight: '600',
    color: colors.ink,
    lineHeight: 28,
    paddingHorizontal: 5,
    marginRight: 3,
    borderRadius: 4,
  },
  // Su an soylenen kelime: kirmizi zemin + beyaz yazi.
  wordActive: { color: '#fff', backgroundColor: colors.accent },
  tr: { fontSize: 14, color: colors.muted },
  pronRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  // Yanlis kelimenin sag ustunde kullanicinin gercekte soyledigi kelime.
  saidBadge: {
    position: 'absolute',
    top: -9,
    right: 0,
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
    zIndex: 1,
  },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  pronErr: { fontSize: 12, color: colors.danger },
  chunks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xs },
  chunk: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: space.sm,
  },
  chunkText: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  navRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm },
  navBtn: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: space.md,
  },
});
