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
  getSavedGrouped,
  removeSavedById,
  SavedGroup,
  SavedRow,
  SavedSource,
  reviewCard,
} from '@/lib/db';
import { previewIntervals, RATINGS } from '@/lib/srs';

// TEKRAR: kullanicinin 5 ana bolumden (Kelime / Gramer / Shadowing / Makale / Izle)
// ELLE kaydettigi ogeler, kaynagina gore GRUPLU. Otomatik/sessiz ekleme yok.
// Kelime = doner kart (En->Tr); digerleri kendi ozgun ekraninda acilir.

type FlipCard = Pick<SavedRow, 'id' | 'front_type' | 'front_en' | 'back_tr' | 'card_json'>;

const SOURCE_META: Record<SavedSource, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  vocab: { label: 'Kelimeler', icon: 'book-outline', color: colors.accent },
  grammar: { label: 'Gramer', icon: 'git-branch-outline', color: colors.teal },
  shadow: { label: 'Sesli Taklit', icon: 'mic-outline', color: colors.accent },
  article: { label: 'Makaleler', icon: 'document-text-outline', color: colors.ink },
  watch: { label: 'Dinleme', icon: 'headset-outline', color: colors.accent },
};

// Bir kaydin baslik + alt satiri (kaynagina gore).
function rowText(r: SavedRow): { title: string; sub: string | null } {
  switch (r.source) {
    case 'vocab':
      return { title: r.front_en, sub: r.back_tr || null };
    case 'grammar':
      return { title: r.back_tr || r.front_en, sub: 'Konuyu tekrar et' };
    case 'shadow':
      return { title: r.front_en, sub: r.media_title || (r.back_tr ?? null) };
    case 'article':
      return { title: r.back_tr || r.front_en, sub: 'Yeniden oku' };
    case 'watch':
      // Dinleme cumlesi: cumle + kaynak video; aksi halde butun video baglantisi.
      if (r.front_type === 'listen') return { title: r.front_en, sub: r.media_title || r.back_tr || null };
      return { title: r.back_tr || r.media_title || r.front_en, sub: 'Yeniden izle' };
    default:
      return { title: r.front_en, sub: null };
  }
}

// Bir kaydi kendi ozgun ekraninda ac (kelime disinda).
function openSaved(r: SavedRow) {
  switch (r.source) {
    case 'grammar':
      router.push(`/grammar-topic?key=${encodeURIComponent(r.front_en)}&title=${encodeURIComponent(r.back_tr ?? '')}`);
      break;
    case 'shadow': {
      const parts = [`text=${encodeURIComponent(r.front_en)}`];
      if (r.media_id) parts.push(`mediaId=${encodeURIComponent(r.media_id)}`);
      if (r.sentence_idx != null) parts.push(`idx=${r.sentence_idx}`);
      if (r.back_tr) parts.push(`hint=${encodeURIComponent(r.back_tr)}`);
      router.push(`/shadowing-studio?${parts.join('&')}`);
      break;
    }
    case 'article':
      router.push(`/reading?id=${encodeURIComponent(r.front_en)}`);
      break;
    case 'watch':
      if (r.front_type === 'listen') {
        if (!r.media_id) break;
        const start = r.start_ms != null ? `&start=${r.start_ms}` : '';
        router.push(`/player?id=${encodeURIComponent(r.media_id)}${start}`);
      } else {
        router.push(`/player?id=${encodeURIComponent(r.front_en)}`);
      }
      break;
  }
}

export default function TekrarHub() {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [studying, setStudying] = useState<FlipCard[] | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  const load = useCallback(() => setGroups(getSavedGrouped()), []);
  useFocusEffect(
    useCallback(() => {
      load();
      setLoading(false);
      return () => Speech.stop();
    }, [load]),
  );

  const total = useMemo(() => groups.reduce((a, g) => a + g.items.length, 0), [groups]);

  function remove(id: number) {
    removeSavedById(id);
    load();
  }

  if (studying) return <StudySession queue={studying} onDone={() => { setStudying(null); load(); }} />;
  if (loading) return <TekrarLoading />;
  if (groups.length === 0) return <EmptyState />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Tekrar" subtitle="Kaydettiklerini kaynağına göre tekrar et" icon="refresh" />

        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.algoBadge}>
              <Ionicons name="bookmark" size={13} color={colors.teal} />
              <Text style={styles.algoText}>Kaydedilenler</Text>
            </View>
            <Text style={styles.syncText}>{total} öğe · {groups.length} grup</Text>
          </View>
          <Text style={styles.dueTitle}>{total} kayıt seni bekliyor</Text>
          <Text style={styles.dueSub}>Her grup kendi çalışma biçiminde açılır. Kelimeler döner kartla.</Text>
        </View>

        {groups.map((g) => {
          const meta = SOURCE_META[g.source];
          const flips = g.items.filter((i) => i.card_json) as FlipCard[];
          return (
            <View key={g.source} style={styles.section}>
              <View style={styles.sectionHeadRow}>
                <View style={styles.sectionTitleWrap}>
                  <Ionicons name={meta.icon} size={18} color={meta.color} />
                  <Text style={styles.sectionTitle}>{meta.label}</Text>
                </View>
                <Text style={styles.muted}>{g.items.length}</Text>
              </View>

              {/* Kelime grubu: doner-kart tekrar baslat */}
              {g.source === 'vocab' && flips.length > 0 ? (
                <PressableScale style={styles.cta} onPress={() => setStudying(flips)}>
                  <Text style={styles.ctaText}>Kelime tekrarına başla</Text>
                  <Text style={styles.ctaPill}>{flips.length} kart</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </PressableScale>
              ) : null}

              {g.items.map((r) => {
                const t = rowText(r);
                const openable = r.source !== 'vocab';
                return (
                  <Pressable
                    key={r.id}
                    style={styles.row}
                    disabled={!openable}
                    onPress={() => openable && openSaved(r)}>
                    <View style={styles.rowIcon}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={r.source === 'shadow' || r.front_type === 'listen' ? 2 : 1}>{t.title}</Text>
                      {t.sub ? <Text style={styles.rowMeta} numberOfLines={1}>{t.sub}</Text> : null}
                    </View>
                    <Pressable hitSlop={10} onPress={() => remove(r.id)} style={styles.removeBtn}>
                      <Ionicons name="close" size={18} color={colors.muted} />
                    </Pressable>
                    {openable ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function TekrarLoading() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Tekrar" subtitle="Kaydettiklerini kaynağına göre tekrar et" icon="refresh" />
        <View style={styles.summary}>
          <Skeleton width={140} height={13} />
          <Skeleton width={220} height={22} />
          <Skeleton width={240} height={12} />
        </View>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={64} radius={radius.md} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Hic kayit yoksa: nereden kaydedilecegini durustce anlat.
const GUIDE: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'book-outline', title: 'Kelime kaydet', body: 'Kelime sayfasında bir kökü kaydet; burada döner kartla tekrar et.' },
  { icon: 'git-branch-outline', title: 'Gramer kaydet', body: 'Bir konuyu kaydet; doğru zamanda konuyu tekrar aç.' },
  { icon: 'mic-outline', title: 'Sesli taklit kaydet', body: 'Bir cümleyi kaydet; stüdyoda yeniden çalış.' },
];

function EmptyState() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Tekrar" subtitle="Kaydettiklerini kaynağına göre tekrar et" icon="refresh" />

        <View style={styles.welcome}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="bookmark-outline" size={30} color={colors.accent} />
          </View>
          <Text style={styles.welcomeTitle}>Henüz kaydettiğin bir şey yok</Text>
          <Text style={styles.welcomeBody}>
            Kelime, gramer, sesli taklit, makale ve videolarda “Kaydet” simgesine dokunduğun her şey burada kaynağına göre
            gruplanır ve tekrar edilir.
          </Text>
        </View>

        <View style={styles.guide}>
          <View style={styles.guideHead}>
            <Ionicons name="bulb-outline" size={18} color={colors.teal} />
            <Text style={styles.guideTitle}>Nasıl dolar?</Text>
          </View>
          {GUIDE.map((g) => (
            <View key={g.title} style={styles.guideStep}>
              <View style={styles.guideNum}>
                <Ionicons name={g.icon} size={18} color={colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guideStepTitle}>{g.title}</Text>
                <Text style={styles.guideStepBody}>{g.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Tekrar seansi (flashcard): kelime, En -> Tr ---
function StudySession({ queue: initial, onDone }: { queue: FlipCard[]; onDone: () => void }) {
  const [queue, setQueue] = useState<FlipCard[]>(initial);
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
            <Text style={styles.finishBtnText}>Geri dön</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  const intervals = card.card_json ? previewIntervals(card.card_json) : null;
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
            <Text style={styles.flashType}>Kelime</Text>
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
                {intervals ? <Text style={styles.ratingWhen}>{intervals[r.grade]}</Text> : null}
              </PressableScale>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
const RATING_COLORS = [colors.again, colors.hard, colors.good];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  summary: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
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
  syncText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  dueTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  dueSub: { fontSize: 13, color: colors.muted, marginTop: -space.xs },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
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

  section: { gap: space.sm },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '700' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  removeBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  // Study session
  sessionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md },
  sessionCount: { fontSize: 13, fontWeight: '800', color: colors.muted },
  sessionTrack: { height: 3, backgroundColor: colors.surface, marginTop: space.md },
  sessionFill: { height: 3, backgroundColor: colors.accent },
  sessionBody: { flex: 1, padding: space.xl, gap: space.lg, justifyContent: 'space-between' },
  flash: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.xl, gap: space.md, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  flashType: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5, position: 'absolute', top: space.md, left: space.md },
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

  guide: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.md },
  guideHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  guideTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  guideNum: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideStepTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  guideStepBody: { fontSize: 13, color: colors.muted, lineHeight: 18, marginTop: 1 },
});
