import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Appear } from '@/components/motion';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import {
  addSrsCard,
  CardFull,
  getAllCards,
  getChunksLibrary,
  getGrammarLibrary,
  reviewCard,
} from '@/lib/db';
import { previewIntervals, RATINGS, retrievability } from '@/lib/srs';

type Filter = 'all' | 'today' | 'chunk' | 'video' | 'mastered';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'today', label: 'Bugün Bekleyenler' },
  { key: 'chunk', label: 'Chunking & Kalıplar' },
  { key: 'video', label: 'Video Alıntıları' },
  { key: 'mastered', label: 'Ustalaşılanlar' },
];

const DECKS: { type: string; label: string; tag: string }[] = [
  { type: 'vocab', label: 'Kelimeler', tag: 'i+1' },
  { type: 'chunk', label: 'Öbekler & Kalıplar', tag: 'Lexical Chunks' },
  { type: 'grammar', label: 'Gramer Kalıpları', tag: 'Yapı' },
  { type: 'sentence', label: 'Cümleler', tag: 'Video Alıntısı' },
];
const TYPE_LABEL: Record<string, string> = { vocab: 'Kelime', chunk: 'Öbek', grammar: 'Gramer', sentence: 'Cümle' };

export default function KartlarimHub() {
  const [cards, setCards] = useState<CardFull[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [studying, setStudying] = useState<CardFull[] | null>(null);
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti (bos-durum flash'ini onler)
  const scrollRef = useScrollTopOnBlur();

  const load = useCallback(() => setCards(getAllCards()), []);
  useFocusEffect(
    useCallback(() => {
      load();
      setLoading(false);
      return () => Speech.stop();
    }, [load]),
  );

  const now = Date.now();
  const due = useMemo(() => cards.filter((c) => c.due_ms != null && c.due_ms <= now), [cards, now]);
  const newLearn = due.filter((c) => c.state <= 1).length;
  const reviewDue = due.filter((c) => c.state === 2).length;
  const critical = due.filter((c) => c.state === 3).length;
  const avgR = cards.length
    ? Math.round((cards.reduce((a, c) => a + retrievability(c.card_json), 0) / cards.length) * 100)
    : 0;

  const preview = useMemo(() => filterCards(cards, filter, now).slice(0, 8), [cards, filter, now]);

  if (studying) return <StudySession queue={studying} onDone={() => { setStudying(null); load(); }} />;
  if (loading) return <ReviewLoading />;
  if (cards.length === 0) return <EmptyState onAdded={load} />;

  function startAll() {
    if (due.length) setStudying(due);
  }
  function startDeck(type: string) {
    const grp = cards.filter((c) => c.front_type === type);
    const grpDue = grp.filter((c) => c.due_ms != null && c.due_ms! <= now);
    if (grpDue.length) setStudying(grpDue);
    else if (grp.length) setStudying(grp);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bolum basligi (uygulama adi gecmez) */}
        <ScreenHeader title="Kartlarım" subtitle="Kartları tekrarla, kalıcı öğren" icon="albums" />

        {/* FSRS ozet karti */}
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.algoBadge}>
              <Ionicons name="flash" size={13} color={colors.teal} />
              <Text style={styles.algoText}>FSRS Algoritması</Text>
            </View>
            <View style={styles.syncRow}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Aktif</Text>
            </View>
          </View>

          <Text style={styles.dueTitle}>Bugün {due.length} Kart Bekliyor</Text>
          <Text style={styles.dueSub}>Uzun süreli hafıza için aralıklı tekrar seansı.</Text>

          <View style={styles.metrics}>
            <Metric value={newLearn} label={'Yeni /\nÖğrenim'} tint={colors.ink} />
            <Metric value={reviewDue} label={'Tekrar\nZamanı'} tint={colors.teal} />
            <Metric value={critical} label={'Kritik /\nZor'} tint={colors.accent} />
          </View>

          <View style={styles.rRow}>
            <View style={styles.rLabel}>
              <Ionicons name="pulse-outline" size={15} color={colors.teal} />
              <Text style={styles.rLabelText}>Tahmini Geri Çağırma (R)</Text>
            </View>
            <Text style={styles.rValue}>%{avgR} Hafıza Koruma</Text>
          </View>
          <View style={styles.rTrack}>
            <View style={[styles.rFill, { width: `${avgR}%` }]} />
          </View>

          <PressableScale style={[styles.cta, due.length === 0 && styles.ctaOff]} onPress={startAll} disabled={due.length === 0}>
            <Text style={styles.ctaText}>{due.length ? 'Hemen Tekrara Başla' : 'Bekleyen tekrar yok'}</Text>
            {due.length ? (
              <>
                <Text style={styles.ctaPill}>~{Math.max(1, Math.round(due.length * 0.3))} dk</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            ) : null}
          </PressableScale>
        </View>

        {/* Filtre cipleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {FILTERS.map((f) => {
            const on = f.key === filter;
            const n = filterCards(cards, f.key, now).length;
            return (
              <Pressable key={f.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(f.key)}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {f.label} ({n})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Akilli destelerim */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Akıllı Destelerim</Text>
          {DECKS.map((d) => {
            const grp = cards.filter((c) => c.front_type === d.type);
            if (grp.length === 0) return null;
            const dueN = grp.filter((c) => c.due_ms != null && c.due_ms! <= now).length;
            const mastery = Math.round((grp.reduce((a, c) => a + retrievability(c.card_json), 0) / grp.length) * 100);
            return (
              <View key={d.type} style={styles.deck}>
                <View style={styles.deckTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.deckTags}>
                      <Text style={styles.deckTag}>{d.tag}</Text>
                    </View>
                    <Text style={styles.deckTitle}>{d.label}</Text>
                    <Text style={styles.deckMeta}>
                      {grp.length} kart · <Text style={{ color: colors.accent, fontWeight: '800' }}>{dueN} bekleyen</Text>
                    </Text>
                  </View>
                  <Pressable style={styles.deckPlay} onPress={() => startDeck(d.type)}>
                    <Ionicons name="play" size={18} color={colors.ink} />
                  </Pressable>
                </View>
                <View style={styles.masteryRow}>
                  <Text style={styles.masteryLabel}>Ustalık</Text>
                  <Text style={styles.masteryValue}>%{mastery}</Text>
                </View>
                <View style={styles.masteryTrack}>
                  <View style={[styles.masteryFill, { width: `${mastery}%`, backgroundColor: masteryColor(mastery) }]} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Oncelikli kart onizlemesi */}
        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <Text style={styles.sectionTitle}>Öncelikli Kart Önizlemesi</Text>
            <Text style={styles.muted}>FSRS aralığına göre</Text>
          </View>
          {preview.length === 0 ? (
            <Text style={styles.muted}>Bu filtrede kart yok.</Text>
          ) : (
            preview.map((c) => <PreviewCard key={c.id} c={c} now={now} />)
          )}
        </View>

        {/* Araclar */}
        <Pressable style={styles.tool} onPress={() => router.navigate('/(tabs)/index')}>
          <Ionicons name="download-outline" size={18} color={colors.ink} />
          <Text style={styles.toolText}>Videolardan kart ekle</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// Ilk yukleme iskeleti: ozet kart + cip satiri + onizleme satirlari.
// Amac: veri gelmeden EmptyState/hub bir an gorunup zıplamasin.
function ReviewLoading() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Kartlarım" subtitle="Kartları tekrarla, kalıcı öğren" icon="albums" />
        <View style={styles.summary}>
          <Skeleton width={140} height={13} />
          <Skeleton width={200} height={22} />
          <Skeleton width={240} height={12} />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="30%" height={54} radius={radius.md} style={{ flex: 1 }} />
            ))}
          </View>
          <Skeleton width="100%" height={6} radius={radius.pill} />
          <Skeleton width="100%" height={48} radius={radius.md} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {[64, 90, 110].map((w, i) => (
            <Skeleton key={i} width={w} height={30} radius={radius.pill} />
          ))}
        </View>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={72} radius={radius.md} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Kart yokken: karsilama + "Nasil Calisir" + gercek korpustan hazir bolumler.
const GUIDE: { n: number; title: string; body: string }[] = [
  { n: 1, title: 'Videodan Seç', body: 'Transkripte dokunarak ilgini çeken kalıbı ve telaffuzunu yakala.' },
  { n: 2, title: 'Destene Kaydet', body: 'Tek dokunuşla akıllı hafıza planına ekle; ses ve örnekler hazır gelsin.' },
  { n: 3, title: 'Günde 5 Dakika Tekrarla', body: 'Kartlar tam unutmak üzereyken gelir; kelimeler kalıcı belleğe oturur.' },
];

function EmptyState({ onAdded }: { onAdded: () => void }) {
  const [chunks] = useState(() => getChunksLibrary());
  const [grammar] = useState(() => getGrammarLibrary());

  function addChunkPack() {
    chunks.slice(0, 20).forEach((c) => addSrsCard({ front_type: 'chunk', front_en: c.text_en, back_tr: c.text_tr }));
    onAdded();
  }
  function addGrammarPack() {
    grammar.forEach((g) => addSrsCard({ front_type: 'grammar', front_en: g.norm_pattern, back_tr: g.label_tr }));
    onAdded();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Kartlarım" subtitle="Kartları tekrarla, kalıcı öğren" icon="albums" />

        {/* Karsilama */}
        <View style={styles.welcome}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="albums" size={30} color={colors.accent} />
          </View>
          <Text style={styles.welcomeTitle}>Henüz bir kart eklemedin</Text>
          <Text style={styles.welcomeBody}>
            Videoları izlerken öğrendiğin cümle ve kalıpları tek dokunuşla kaydet. Unutma eğrine göre en doğru zamanda
            karşına çıkaralım.
          </Text>
          <PressableScale style={styles.welcomeCta} onPress={() => router.navigate('/(tabs)/index')}>
            <Text style={styles.welcomeCtaText}>Videoları Keşfet ve Kalıp Ekle</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </PressableScale>
        </View>

        {/* Nasil calisir */}
        <View style={styles.guide}>
          <View style={styles.guideHead}>
            <Ionicons name="book-outline" size={18} color={colors.teal} />
            <Text style={styles.guideTitle}>Nasıl Çalışır?</Text>
          </View>
          {GUIDE.map((g) => (
            <View key={g.n} style={styles.guideStep}>
              <View style={styles.guideNum}>
                <Text style={styles.guideNumText}>{g.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideStepTitle}>{g.title}</Text>
                <Text style={styles.guideStepBody}>{g.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Hazir paketler (gercek korpus) */}
        {chunks.length > 0 || grammar.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeadRow}>
              <Text style={styles.sectionTitle}>Hazır Bölümlerle Başla</Text>
              <Text style={styles.recommend}>Önerilen</Text>
            </View>
            {chunks.length > 0 ? (
              <Pack
                icon="chatbubbles-outline"
                title="Sık Kullanılan Öbekler & Kalıplar"
                tag="Lexical Chunks"
                count={Math.min(20, chunks.length)}
                preview={chunks.slice(0, 2).map((c) => `"${c.text_en}"`).join(', ')}
                onAdd={addChunkPack}
              />
            ) : null}
            {grammar.length > 0 ? (
              <Pack
                icon="git-branch-outline"
                title="Temel Gramer Kalıpları"
                tag="Yapı"
                count={grammar.length}
                preview={grammar.slice(0, 2).map((g) => g.label_tr).join(', ')}
                onAdd={addGrammarPack}
              />
            ) : null}
          </View>
        ) : null}

        {/* Ipucu */}
        <View style={styles.tip}>
          <Ionicons name="bulb-outline" size={22} color={colors.teal} />
          <Text style={styles.tipText}>
            <Text style={{ fontWeight: '800', color: colors.teal }}>Küçük ipucu: </Text>
            Günde 10 kart tekrar etmek, bir ayda yüzlerce aktif kelime ve ifade kazandırır.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pack({
  icon,
  title,
  tag,
  count,
  preview,
  onAdd,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  tag: string;
  count: number;
  preview: string;
  onAdd: () => void;
}) {
  const [added, setAdded] = useState(false);
  return (
    <View style={styles.pack}>
      <View style={styles.packTop}>
        <View style={styles.packIcon}>
          <Ionicons name={icon} size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.packTitle}>{title}</Text>
          <View style={styles.packMeta}>
            <Text style={styles.packTag}>{tag}</Text>
            <Text style={styles.packCount}>· {count} kart</Text>
          </View>
        </View>
      </View>
      <View style={styles.packBottom}>
        <Text style={styles.packPreview} numberOfLines={1}>
          {preview}
        </Text>
        <Pressable
          style={[styles.packAdd, added && styles.packAdded]}
          onPress={() => {
            setAdded(true);
            onAdd();
          }}
          disabled={added}>
          <Ionicons name={added ? 'checkmark' : 'add'} size={16} color={added ? colors.good : colors.accent} />
          <Text style={[styles.packAddText, added && { color: colors.good }]}>{added ? 'Eklendi' : 'Desteyi Ekle'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function filterCards(cards: CardFull[], f: Filter, now: number): CardFull[] {
  if (f === 'all') return cards;
  if (f === 'today') return cards.filter((c) => c.due_ms != null && c.due_ms <= now);
  if (f === 'chunk') return cards.filter((c) => c.front_type === 'chunk' || c.front_type === 'grammar');
  if (f === 'video') return cards.filter((c) => c.front_type === 'sentence' || c.media_id != null);
  return cards.filter((c) => retrievability(c.card_json) >= 0.9);
}

function Metric({ value, label, tint }: { value: number; label: string; tint: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: tint }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PreviewCard({ c, now }: { c: CardFull; now: number }) {
  const hl = c.front_type === 'chunk' || c.front_type === 'grammar';
  return (
    <View style={styles.pCard}>
      <View style={styles.pTop}>
        <View style={styles.pSource}>
          <Ionicons name="film-outline" size={14} color={colors.accent} />
          <Text style={styles.pSourceText} numberOfLines={1}>
            {c.media_title ?? TYPE_LABEL[c.front_type] ?? c.front_type}
          </Text>
        </View>
        <Text style={styles.pDue}>
          {dueLabel(c.due_ms, now)}
          {c.stability ? ` · S:${c.stability.toFixed(1)}` : ''}
        </Text>
      </View>
      {hl ? (
        <Text style={styles.pChunk}>{c.front_en}</Text>
      ) : (
        <Text style={styles.pSentence}>{c.front_en}</Text>
      )}
      <View style={styles.pBottom}>
        <Text style={styles.pTr} numberOfLines={1}>
          {c.back_tr}
        </Text>
        <Pressable hitSlop={8} onPress={() => Speech.speak(c.front_en, { language: 'en-US', rate: 0.95 })}>
          <Ionicons name="volume-high-outline" size={20} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

// --- Tekrar seansi (flashcard) ---
function StudySession({ queue: initial, onDone }: { queue: CardFull[]; onDone: () => void }) {
  const [queue, setQueue] = useState<CardFull[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const total = initial.length;

  const card = queue[0];
  const done = total - queue.length;

  function answer(grade: (typeof RATINGS)[number]['grade']) {
    if (!card) return;
    reviewCard(card.id, grade);
    setRevealed(false);
    setQueue((q) => q.slice(1));
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.finish}>
          <Ionicons name="checkmark-circle-outline" size={48} color={colors.good} />
          <Text style={styles.finishTitle}>Tekrar bitti</Text>
          <PressableScale style={styles.finishBtn} onPress={onDone}>
            <Text style={styles.finishBtnText}>Kartlarım'a dön</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const intervals = previewIntervals(card.card_json);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.sessionHead}>
        <Pressable onPress={onDone} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.sessionCount}>
          {done + 1} / {total}
        </Text>
      </View>
      <View style={styles.sessionTrack}>
        <View style={[styles.sessionFill, { width: `${(done / total) * 100}%` }]} />
      </View>

      <View style={styles.sessionBody}>
        <Appear key={card.id} offset={14}>
          <View style={styles.flash}>
            <Text style={styles.flashFront}>{card.front_en}</Text>
            {revealed && card.back_tr ? (
              <Appear offset={6}>
                <Text style={styles.flashBack}>{card.back_tr}</Text>
              </Appear>
            ) : null}
            <Pressable
              style={styles.flashAudio}
              onPress={() => Speech.speak(card.front_en, { language: 'en-US', rate: 0.9 })}>
              <Ionicons name="volume-high" size={18} color={colors.accent} />
            </Pressable>
          </View>
        </Appear>

        {!revealed ? (
          <PressableScale style={styles.showBtn} onPress={() => setRevealed(true)}>
            <Text style={styles.showText}>Cevabı Göster</Text>
          </PressableScale>
        ) : (
          <View style={styles.ratingRow}>
            {RATINGS.map((r, i) => (
              <PressableScale
                key={r.grade}
                style={[styles.rating, { borderColor: RATING_COLORS[i] }]}
                onPress={() => answer(r.grade)}>
                <Text style={[styles.ratingLabel, { color: RATING_COLORS[i] }]}>{r.label}</Text>
                <Text style={styles.ratingWhen}>{intervals[r.grade]}</Text>
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
const RATING_COLORS = [colors.again, colors.hard, colors.good, colors.easy];

function masteryColor(v: number) {
  if (v >= 80) return colors.teal;
  if (v >= 60) return colors.good;
  return colors.warning;
}
function dueLabel(due: number | null, now: number) {
  if (due == null) return 'Yeni';
  if (due <= now) return 'Bugün';
  const d = Math.round((due - now) / 86400000);
  return d <= 1 ? 'Yarın' : `${d}g`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  summary: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  algoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  algoText: { fontSize: 11, fontWeight: '700', color: colors.teal },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  syncDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.good },
  syncText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  dueTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  dueSub: { fontSize: 13, color: colors.muted, marginTop: -space.xs },

  metrics: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 10, color: colors.muted, textAlign: 'center', lineHeight: 13 },

  rRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rLabelText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  rValue: { fontSize: 12, color: colors.ink, fontWeight: '800' },
  rTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden', marginTop: -space.sm },
  rFill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.teal },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  ctaOff: { backgroundColor: colors.lineStrong },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ctaPill: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },

  chipsRow: { gap: space.sm, paddingRight: space.xl },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextOn: { color: '#fff' },

  section: { gap: space.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  muted: { fontSize: 12, color: colors.muted },

  deck: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.sm },
  deckTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  deckTags: { flexDirection: 'row' },
  deckTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  deckTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 4 },
  deckMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  deckPlay: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masteryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  masteryLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  masteryValue: { fontSize: 11, color: colors.ink, fontWeight: '800' },
  masteryTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden', marginTop: -2 },
  masteryFill: { height: 6, borderRadius: radius.pill },

  pCard: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.sm },
  pTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  pSource: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  pSourceText: { fontSize: 11, color: colors.muted, fontWeight: '600', flex: 1 },
  pDue: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  pChunk: {
    alignSelf: 'flex-start',
    fontSize: 17,
    fontWeight: '800',
    color: colors.accent,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  pSentence: { fontSize: 16, fontWeight: '700', color: colors.ink, lineHeight: 22 },
  pBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  pTr: { flex: 1, fontSize: 13, color: colors.muted },

  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  toolText: { fontSize: 14, fontWeight: '700', color: colors.ink },

  // Study session
  sessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md },
  sessionCount: { fontSize: 13, fontWeight: '800', color: colors.muted },
  sessionTrack: { height: 3, backgroundColor: colors.surface, marginTop: space.md },
  sessionFill: { height: 3, backgroundColor: colors.accent },
  sessionBody: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'space-between' },
  flash: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.xl, gap: space.md, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  flashFront: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4, textAlign: 'center' },
  flashBack: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  flashAudio: { position: 'absolute', top: space.md, right: space.md },
  showBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: space.lg, alignItems: 'center' },
  showText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ratingRow: { flexDirection: 'row', gap: space.sm },
  rating: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: space.md, alignItems: 'center', gap: 2 },
  ratingLabel: { fontSize: 14, fontWeight: '800' },
  ratingWhen: { fontSize: 11, color: colors.muted },

  finish: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  finishTitle: { fontSize: 20, fontWeight: '800', color: colors.ink },
  finishBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.xl, marginTop: space.sm },
  finishBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Bos durum
  welcome: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  welcomeTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.3 },
  welcomeBody: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  welcomeCta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  welcomeCtaText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  guide: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.md },
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  guideTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  guideNum: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideNumText: { fontSize: 13, fontWeight: '800', color: colors.ink },
  guideStepTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  guideStepBody: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 1 },

  recommend: { fontSize: 12, fontWeight: '800', color: colors.accent },
  pack: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.sm },
  packTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  packIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, lineHeight: 19 },
  packMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  packTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.teal,
    backgroundColor: colors.tealSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  packCount: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  packBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  packPreview: { flex: 1, fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  packAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  packAdded: { borderColor: colors.good },
  packAddText: { fontSize: 12, fontWeight: '800', color: colors.accent },

  tip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.tealSoft, borderRadius: radius.md, padding: space.md },
  tipText: { flex: 1, fontSize: 13, color: colors.ink, lineHeight: 19 },
});
