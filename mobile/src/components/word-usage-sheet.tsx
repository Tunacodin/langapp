import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import type { VideoSource } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppSheet } from '@/components/app-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { scoreColor } from '@/components/speak-practice';
import { colors, radius, space } from '@/constants/appTheme';
import { getCrossVideoOccurrencesByLemma, getLexemeExamples, getMedia } from '@/lib/db';
import { useSpeechAssessment } from '@/lib/useSpeechAssessment';
import { resolveVideoSource } from '@/lib/videoSource';

const POS_TR: Record<string, string> = { NOUN: 'İsim', VERB: 'Fiil', ADJ: 'Sıfat', ADV: 'Zarf' };

// Birlesik cumle ogesi: (a) video kullanimi (kaynak sesi var) ya da (b) uretilmis
// ornek cumle (kaynak yok -> TTS). Ekran ikisini de ayni akista gosterir.
type Item = {
  text_en: string;
  text_tr: string | null;
  surface: string; // vurgulanacak kelime
  kind: 'video' | 'ornek';
  mediaId?: string;
  title?: string;
  sentStart?: number;
  sentEnd?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Dokunulan kelime (kok). */
  lemma: string | null;
  /** POS kodu (isim/fiil...). */
  pos?: string | null;
  /** Kisa anlam (ilk sense). */
  meaning?: string | null;
};

// Kok icin cumle havuzu: once GERCEK video kullanimlari, sonra uretilmis ornekler.
// text_en'e gore tekiller; en fazla 12 cumle.
function buildItems(lemma: string, pos?: string | null): Item[] {
  const items: Item[] = [];
  for (const o of getCrossVideoOccurrencesByLemma(lemma)) {
    items.push({
      text_en: o.text_en,
      text_tr: o.text_tr,
      surface: o.surface,
      kind: 'video',
      mediaId: o.media_id,
      title: o.title,
      sentStart: o.sent_start,
      sentEnd: o.sent_end,
    });
  }
  if (pos) {
    for (const e of getLexemeExamples(lemma, pos)) {
      items.push({ text_en: e.text_en, text_tr: e.text_tr, surface: lemma, kind: 'ornek' });
    }
  }
  const seen = new Set<string>();
  return items
    .filter((it) => {
      const k = it.text_en.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12);
}

// Kelime pratik sheet'i: kokun FARKLI cumlelerdeki GERCEK kullanimlari. Aktif
// cumleyi dinle (video sesi; yoksa TTS) + mikrofonla tekrar et (Azure skor).
// Video ekranina ATLAMAZ; her sey sheet icinde.
export function WordUsageSheet({ visible, onClose, lemma, pos, meaning }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const [source, setSource] = useState<VideoSource | null>(null);
  const srcCache = useRef<Map<string, VideoSource>>(new Map());

  // Acilista cumle havuzunu kur (video kullanimlari + uretilmis ornekler).
  useEffect(() => {
    if (!visible || !lemma) {
      setItems([]);
      setActive(0);
      return;
    }
    setItems(buildItems(lemma, pos));
    setActive(0);
  }, [visible, lemma, pos]);

  const cur = items[active] ?? null;

  // Aktif cumle bir videodansa kaynagini coz (ses klibi). Ornek cumlede kaynak yok -> TTS.
  useEffect(() => {
    if (!cur || cur.kind !== 'video' || !cur.mediaId) {
      setSource(null);
      return;
    }
    const m = getMedia().find((x) => x.id === cur.mediaId);
    if (!m) {
      setSource(null);
      return;
    }
    const cached = srcCache.current.get(m.id);
    if (cached) {
      setSource(cached);
      return;
    }
    let alive = true;
    resolveVideoSource(m.youtube_id, m.video_url).then((s) => {
      if (!alive) return;
      srcCache.current.set(m.id, s);
      setSource(s);
    });
    return () => {
      alive = false;
    };
  }, [cur]);

  const clip = useMemo(
    () => ({ source, start: cur?.sentStart ?? null, end: cur?.sentEnd ?? null }),
    [source, cur?.sentStart, cur?.sentEnd],
  );
  const { status, result, error, listen, toggleRecord, reset } = useSpeechAssessment(cur?.text_en ?? '', clip);

  // Cumle degisince skor/kayit sifirla.
  useEffect(() => {
    reset();
  }, [active, reset]);

  const speakWord = () => {
    if (lemma) Speech.speak(lemma, { language: 'en-US', rate: 0.9 });
  };

  return (
    <AppSheet visible={visible} onClose={onClose} height="auto" dragAnywhere>
      {/* Baslik: kelime + tur + anlam + okunus */}
      <View style={styles.headRow}>
        <View style={styles.headLeft}>
          <Text style={styles.word}>{lemma ?? '—'}</Text>
          {pos ? <Text style={styles.pos}>{POS_TR[pos] ?? pos.toLowerCase()}</Text> : null}
        </View>
        <Pressable style={styles.speakBtn} onPress={speakWord} hitSlop={8}>
          <Ionicons name="volume-high" size={20} color={colors.accent} />
        </Pressable>
      </View>
      {meaning ? <Text style={styles.meaning}>{meaning}</Text> : null}

      {items.length === 0 ? (
        <Text style={styles.empty}>Bu kelime için örnek cümle henüz yok.</Text>
      ) : (
        <>
          {/* Aktif cumle: pratik karti */}
          {cur ? (
            <View style={styles.practice}>
              <Text style={styles.practiceLabel}>ÇALIŞILAN CÜMLE</Text>
              <Text style={styles.sentence}>{highlight(cur.text_en, cur.surface, styles.hl)}</Text>
              {cur.text_tr ? <Text style={styles.sentenceTr}>{cur.text_tr}</Text> : null}
              <Text style={styles.sourceTitle} numberOfLines={1}>
                <Ionicons name={cur.kind === 'video' ? 'film-outline' : 'sparkles-outline'} size={12} color={colors.muted} />{' '}
                {cur.kind === 'video' ? cur.title : 'Örnek cümle'}
              </Text>

              {/* Dinle / Yavas / Mic */}
              <View style={styles.controls}>
                <Pressable style={styles.listenBtn} onPress={() => listen(0.95)}>
                  <Ionicons name="volume-high-outline" size={17} color={colors.accent} />
                  <Text style={styles.listenText}>Dinle</Text>
                </Pressable>
                <Pressable style={styles.listenBtn} onPress={() => listen(0.6)}>
                  <Ionicons name="hourglass-outline" size={16} color={colors.muted} />
                  <Text style={[styles.listenText, { color: colors.muted }]}>Yavaş</Text>
                </Pressable>
                <PressableScale
                  style={[styles.mic, status === 'recording' && styles.micOn]}
                  haptic="medium"
                  onPress={toggleRecord}
                  disabled={status === 'assessing'}>
                  <Ionicons name={status === 'recording' ? 'stop' : 'mic'} size={20} color="#fff" />
                </PressableScale>
              </View>

              {status === 'recording' ? (
                <Text style={styles.hint}>Dinliyorum... bitince mikrofona tekrar dokun.</Text>
              ) : null}
              {status === 'assessing' ? (
                <View style={styles.assessing}>
                  <ActivityIndicator color={colors.accent} />
                  <Text style={styles.hint}>Değerlendiriliyor...</Text>
                </View>
              ) : null}
              {error ? <Text style={styles.err}>{error}</Text> : null}
              {result ? (
                <View style={styles.score}>
                  <Ionicons name="checkmark-circle" size={18} color={scoreColor(result.pron)} />
                  <Text style={styles.scoreText}>
                    %{result.pron} doğruluk · Akıcılık %{result.fluency} · Eşleşme %{result.matchPct}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Cumleler arasi stepper (ileri/geri) - liste yerine tek tek */}
          {items.length > 1 ? (
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, active === 0 && styles.stepBtnOff]}
                disabled={active === 0}
                onPress={() => setActive((a) => Math.max(0, a - 1))}>
                <Ionicons name="chevron-back" size={18} color={active === 0 ? colors.muted : colors.ink} />
                <Text style={[styles.stepText, active === 0 && styles.stepTextOff]}>Geri</Text>
              </Pressable>
              <Text style={styles.stepCount}>
                {active + 1} / {items.length}
              </Text>
              <Pressable
                style={[styles.stepBtn, active === items.length - 1 && styles.stepBtnOff]}
                disabled={active === items.length - 1}
                onPress={() => setActive((a) => Math.min(items.length - 1, a + 1))}>
                <Text style={[styles.stepText, active === items.length - 1 && styles.stepTextOff]}>İleri</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={active === items.length - 1 ? colors.muted : colors.ink}
                />
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </AppSheet>
  );
}

// text icindeki surface kelimesini (kelime siniri, buyuk/kucuk duyarsiz) vurgular.
function highlight(text: string, surface: string, hlStyle: object) {
  const s = (surface ?? '').trim();
  if (!s) return text;
  try {
    const re = new RegExp(`(\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'ig');
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) || p.toLowerCase() === s.toLowerCase() ? (
        <Text key={i} style={hlStyle}>
          {p}
        </Text>
      ) : (
        p
      ),
    );
  } catch {
    return text;
  }
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headLeft: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  word: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  pos: { fontSize: 13, color: colors.muted, fontStyle: 'italic' },
  speakBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaning: { fontSize: 15, color: colors.ink, marginTop: -space.xs },
  empty: { fontSize: 14, color: colors.muted, lineHeight: 20, paddingVertical: space.lg },

  practice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.sm,
  },
  practiceLabel: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  sentence: { fontSize: 19, fontWeight: '700', color: colors.ink, lineHeight: 27 },
  hl: { color: colors.accent },
  sentenceTr: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  sourceTitle: { fontSize: 12, color: colors.muted },

  controls: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.xs },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  listenText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  mic: {
    marginLeft: 'auto',
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOn: { backgroundColor: colors.ink },
  hint: { fontSize: 12, color: colors.muted },
  assessing: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  err: { fontSize: 12, color: colors.danger },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  scoreText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  stepBtnOff: { opacity: 0.4 },
  stepText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  stepTextOff: { color: colors.muted },
  stepCount: { fontSize: 13, fontWeight: '800', color: colors.muted },
});
