import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { Skeleton } from '@/components/skeleton';
import {
  clearActiveFocus,
  enrollGrammarReview,
  getActiveFocus,
  getGrammarLibrary,
  GrammarLibRow,
  isGrammarSaved,
  removeSavedByFront,
  setActiveFocus,
} from '@/lib/db';
import { ProgressRing } from '@/components/progress-ring';
import { getGrammarLesson } from '@/lib/grammarLessons';
import { getPoster } from '@/lib/posters';

// Gramer konu DETAY ekrani: kalibin ogrenme YOL HARITASI (6 adim).
// Sadece 2 adimda gercek veri var (ornek cumleler + video kesitleri/pratik);
// digerleri icerik/ozellik gelene kadar durustce "Yakinda" olarak kilitli.

type Step = {
  n: number;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  locked: boolean;
  meta: (r: GrammarLibRow) => string;
  route?: (r: GrammarLibRow, title: string) => void;
};

function openLesson(r: GrammarLibRow, title: string) {
  router.push(`/grammar-lesson?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

function openExamples(r: GrammarLibRow, title: string) {
  router.push(`/grammar-examples?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

function openVideo(r: GrammarLibRow, title: string) {
  router.push(`/grammar-video?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

function openReading(r: GrammarLibRow, title: string) {
  router.push(`/grammar-reading?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

function openRecord(r: GrammarLibRow, title: string) {
  router.push(`/grammar-record?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

function openExam(r: GrammarLibRow, title: string) {
  router.push(`/grammar-exam?key=${encodeURIComponent(r.norm_pattern)}&title=${encodeURIComponent(title)}`);
}

// Adim 1 sadece o kalibin OGRETIM icerigi yazilmissa acilir (yoksa kilitli).
const STEPS: Step[] = [
  {
    n: 1,
    title: 'Konu Öğretimi & Kural Mantığı',
    icon: 'book-outline',
    locked: true, // dinamik: icerik varsa render'da acilir
    meta: (r) => (getGrammarLesson(r.norm_pattern) ? 'Kural mantığı · formül · quiz' : 'Yakında'),
    route: (r, t) => openLesson(r, t),
  },
  {
    n: 2,
    title: 'Örnek Cümleler & Kalıplar',
    icon: 'chatbubbles-outline',
    locked: true, // dinamik: kuratorlu ornek icerigi varsa acilir
    meta: (r) => (getGrammarLesson(r.norm_pattern)?.examples ? 'Olumlu · olumsuz · soru' : 'Yakında'),
    route: (r, t) => openExamples(r, t),
  },
  {
    n: 3,
    title: 'Video Kesitleri & Pratik',
    icon: 'play-circle-outline',
    locked: false, // dinamik: video kesiti (video_count>0) olan konularda acik
    meta: (r) => `${r.video_count} video kesiti · Pratik`,
    route: (r, t) => openVideo(r, t),
  },
  {
    n: 4,
    title: 'Uzun Okuma & Bağlam',
    icon: 'document-text-outline',
    locked: true, // dinamik: kuratorlu okuma parcasi varsa acilir
    meta: (r) => (getGrammarLesson(r.norm_pattern)?.reading ? 'Hikaye · bağlam · anlama' : 'Yakında'),
    route: (r, t) => openReading(r, t),
  },
  {
    n: 5,
    title: 'Cümle Cümle Ses Kaydı',
    icon: 'mic-outline',
    locked: true, // dinamik: hedef cumleler yazilmissa acilir
    meta: (r) => (getGrammarLesson(r.norm_pattern)?.recording ? 'Kayıt · telaffuz puanı' : 'Yakında'),
    route: (r, t) => openRecord(r, t),
  },
  {
    n: 6,
    title: 'Ders Sonu Özeti & Sınav',
    icon: 'trophy-outline',
    locked: true, // dinamik: sinav sorulari yazilmissa acilir
    meta: (r) => (getGrammarLesson(r.norm_pattern)?.exam ? 'Sınav · Tekrar havuzu' : 'Yakında'),
    route: (r, t) => openExam(r, t),
  },
];

// SRS/FSRS durumundan GERCEK ogrenme etiketi (uydurma yuzde yok).
function statusOf(r: GrammarLibRow): { label: string; tone: string } {
  if (!r.saved) return { label: 'Henüz başlanmadı', tone: colors.muted };
  if (r.srs_state === 2) {
    const days = r.srs_stability != null ? Math.round(r.srs_stability) : null;
    return { label: days ? `Öğrenildi · ~${days} gün` : 'Öğrenildi', tone: colors.success };
  }
  return { label: 'Öğreniliyor', tone: colors.warning };
}

// Ilk yukleme iskeleti: hero karti + 6 adim satiri taklidi.
function TopicSkeleton() {
  return (
    <>
      <View style={styles.hero}>
        <Skeleton width={56} height={56} radius={radius.sm} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Skeleton width="80%" height={16} />
          <Skeleton width="55%" height={12} />
          <Skeleton width="40%" height={11} />
        </View>
        <Skeleton width={56} height={56} radius={radius.pill} />
      </View>
      <View style={styles.steps}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.step}>
            <Skeleton width={46} height={46} radius={radius.sm} />
            <View style={{ flex: 1, gap: space.xs }}>
              <Skeleton width="35%" height={10} />
              <Skeleton width="75%" height={14} />
              <Skeleton width="55%" height={11} />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

export default function GrammarTopicScreen() {
  const p = useLocalSearchParams<{ key?: string; title?: string }>();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<GrammarLibRow[]>([]);
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti

  useFocusEffect(
    useCallback(() => {
      setRows(getGrammarLibrary()); // her donuste tazele: SRS ilerlemesi guncellensin.
      setLoading(false);
    }, []),
  );

  const row = useMemo(() => rows.find((r) => r.norm_pattern === p.key) ?? null, [rows, p.key]);
  const title = row?.label_tr ?? p.title ?? '';

  // Konuyu Tekrar'a elle kaydet/kaldir (otomatik ekleme yok).
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setSaved(row ? isGrammarSaved(row.norm_pattern) : false);
  }, [row?.norm_pattern]);
  function toggleSave() {
    if (!row) return;
    if (saved) {
      removeSavedByFront('grammar', row.norm_pattern);
      setSaved(false);
    } else {
      enrollGrammarReview(row.norm_pattern, row.label_tr);
      setSaved(true);
    }
  }
  // Bu konu aktif ODAK mi? (tum sekmelerde sabitlenen konu)
  const [isFocus, setIsFocus] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsFocus(row ? getActiveFocus()?.key === row.norm_pattern : false);
    }, [row?.norm_pattern]),
  );
  function toggleFocus() {
    if (!row) return;
    if (isFocus) {
      clearActiveFocus();
      setIsFocus(false);
    } else {
      setActiveFocus({ key: row.norm_pattern, label: row.label_tr });
      setIsFocus(true);
    }
  }

  const poster = row ? getPoster(row.poster_media) : null;
  const status = row ? statusOf(row) : null;

  // Adim kilitleri dinamik:
  // 1) ogretim icerigi yazilmissa, 2) kuratorlu ornekler varsa, 3) video kesiti varsa.
  const steps = useMemo(() => {
    // Tum adimlar acik: kullanici yol haritasinin tamamini gezebilsin. Icerigi
    // henuz yazilmamis adimlar acilan ekranda durustce "Yakinda" gosterir.
    return STEPS.map((s) => ({ ...s, locked: false }));
  }, [row]);

  // Ilk kilitsiz adim = "devam edilecek" adim (alt CTA + vurgu icin).
  const activeStep = steps.find((s) => !s.locked);

  // Hero halkasi: 6 adimdan kaci ACIK (modul hazirligi). Adim-tamamlama tutmadigimiz
  // icin "tamamlandi %" degil, "hazir adim %" gosteririz (uydurma yok).
  const openSteps = steps.filter((s) => !s.locked).length;
  const openPct = Math.round((openSteps / steps.length) * 100);

  return (
    <View style={styles.root}>
      {/* Ust bar */}
      <View style={[styles.topbar, { paddingTop: insets.top + space.sm }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {title}
          </Text>
          {row?.cefr ? (
            <View style={styles.cefrPill}>
              <Text style={styles.cefrPillText}>{row.cefr}</Text>
            </View>
          ) : null}
        </View>
        <Pressable style={styles.iconBtn} onPress={toggleSave} hitSlop={8} disabled={!row}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={saved ? colors.accent : colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 92 }]}
        showsVerticalScrollIndicator={false}>
        {loading ? <TopicSkeleton /> : null}

        {/* Odak dugmesi: bu konuyu tum sekmelerde sabitle (odak rozeti). */}
        {!loading && row ? (
          <Pressable style={[styles.focusToggle, isFocus && styles.focusToggleOn]} onPress={toggleFocus}>
            <Ionicons name={isFocus ? 'locate' : 'locate-outline'} size={18} color={isFocus ? '#fff' : colors.accent} />
            <Text style={[styles.focusToggleText, isFocus && styles.focusToggleTextOn]}>
              {isFocus ? 'Bu konu odağın · çıkarmak için dokun' : 'Bu konuyu odağın yap'}
            </Text>
          </Pressable>
        ) : null}

        {/* HERO: poster + baslik + formul + gercek durum/sayilar */}
        {!loading && row ? (
          <View style={styles.hero}>
            <View style={styles.heroThumb}>
              {poster ? (
                <Image source={poster} style={styles.heroThumbImg} resizeMode="cover" />
              ) : (
                <Ionicons name="git-branch" size={26} color={colors.teal} />
              )}
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {title}
              </Text>
              {row.formula ? (
                <Text style={styles.formula} numberOfLines={1}>
                  {row.formula}
                </Text>
              ) : null}
              <View style={styles.heroMetaRow}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.muted} />
                <Text style={styles.heroMeta}>{row.cnt} cümle</Text>
                <Text style={styles.heroDot}>·</Text>
                <Ionicons name="play" size={12} color={colors.muted} />
                <Text style={styles.heroMeta}>{row.video_count} video</Text>
              </View>
              {status ? (
                <Text style={[styles.heroStatus, { color: status.tone }]}>{status.label}</Text>
              ) : null}
            </View>

            {/* Ilerleme halkasi: acik adim / 6 */}
            <View style={styles.heroRingWrap}>
              <ProgressRing size={56} strokeWidth={6} progress={openSteps / steps.length} color={colors.accent} trackColor={colors.line}>
                <Text style={styles.heroRingPct}>%{openPct}</Text>
              </ProgressRing>
              <Text style={styles.heroRingLabel}>
                {openSteps}/{steps.length} adım
              </Text>
            </View>
          </View>
        ) : null}

        {/* YOL HARITASI: adim listesi */}
        {!loading ? (
        <View style={styles.steps}>
          {steps.map((s) => {
            const active = !s.locked && s === activeStep;
            const metaText = row ? s.meta(row) : '';
            return (
              <Pressable
                key={s.n}
                disabled={s.locked || !row}
                onPress={() => row && s.route?.(row, title)}
                style={[styles.step, active && styles.stepActive, s.locked && styles.stepLocked]}>
                {/* Sol: adim ikonu + durum kabarcigi */}
                <View style={[styles.stepIcon, active && styles.stepIconActive]}>
                  <Ionicons
                    name={s.icon}
                    size={22}
                    color={s.locked ? colors.muted : active ? '#fff' : colors.teal}
                  />
                  <View style={styles.stepBadge}>
                    <Ionicons
                      name={s.locked ? 'lock-closed' : 'play'}
                      size={9}
                      color="#fff"
                    />
                  </View>
                </View>

                {/* Orta: adim no + durum + baslik + meta */}
                <View style={styles.stepBody}>
                  <View style={styles.stepTop}>
                    <Text style={[styles.stepNo, active && styles.stepNoActive]}>
                      {String(s.n).padStart(2, '0')}. ADIM
                    </Text>
                    <View
                      style={[
                        styles.tag,
                        active ? styles.tagActive : s.locked ? styles.tagLocked : styles.tagOpen,
                      ]}>
                      <Text
                        style={[
                          styles.tagText,
                          active ? styles.tagTextActive : s.locked ? styles.tagTextLocked : styles.tagTextOpen,
                        ]}>
                        {active ? 'Şimdi çalış' : s.locked ? 'Kilitli' : 'Hazır'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.stepTitle, s.locked && styles.stepTitleLocked]} numberOfLines={2}>
                    {s.title}
                  </Text>
                  <Text style={styles.stepMeta} numberOfLines={1}>
                    {metaText}
                  </Text>
                </View>

                {!s.locked ? (
                  <Ionicons name="chevron-forward" size={20} color={active ? colors.accent : colors.muted} />
                ) : (
                  <Ionicons name="lock-closed" size={16} color={colors.line} />
                )}
              </Pressable>
            );
          })}
        </View>
        ) : null}
      </ScrollView>

      {/* Sabit alt CTA: ilk kilitsiz adima devam et */}
      {row && activeStep ? (
        <View style={[styles.dock, { paddingBottom: insets.bottom + space.sm }]}>
          <Pressable style={styles.cta} onPress={() => activeStep.route?.(row, title)}>
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.ctaText} numberOfLines={1}>
              Devam et: Adım {String(activeStep.n).padStart(2, '0')} ({activeStep.title.split(' ')[0]})
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: -0.3, flexShrink: 1 },
  cefrPill: { backgroundColor: colors.tealSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  cefrPillText: { fontSize: 11, fontWeight: '800', color: colors.teal, letterSpacing: 0.3 },

  scroll: { padding: space.lg, gap: space.lg },

  focusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  focusToggleOn: { backgroundColor: colors.accent },
  focusToggleText: { fontSize: 14, fontWeight: '800', color: colors.accent },
  focusToggleTextOn: { color: '#fff' },

  hero: {
    flexDirection: 'row',
    gap: space.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  heroThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroThumbImg: { width: '100%', height: '100%' },
  heroBody: { flex: 1, gap: 3 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  formula: {
    fontSize: 12,
    color: colors.teal,
    fontFamily: 'monospace',
    backgroundColor: colors.tealSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  heroMeta: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  heroDot: { color: colors.muted, fontSize: 12 },
  heroStatus: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  heroRingWrap: { alignItems: 'center', gap: 3 },
  heroRingPct: { fontSize: 13, fontWeight: '800', color: colors.accent, letterSpacing: -0.2 },
  heroRingLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },

  steps: { gap: space.sm },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.bg,
  },
  stepActive: { borderColor: colors.accent, borderWidth: 1.5, backgroundColor: colors.accentSoft },
  stepLocked: { opacity: 0.55 },

  stepIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconActive: { backgroundColor: colors.accent },
  stepBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },

  stepBody: { flex: 1, gap: 3 },
  stepTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNo: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  stepNoActive: { color: colors.accent },

  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagActive: { backgroundColor: colors.accent },
  tagOpen: { backgroundColor: colors.tealSoft },
  tagLocked: { backgroundColor: colors.surface },
  tagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  tagTextActive: { color: '#fff' },
  tagTextOpen: { color: colors.teal },
  tagTextLocked: { color: colors.muted },

  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 19 },
  stepTitleLocked: { fontWeight: '600' },
  stepMeta: { fontSize: 12, color: colors.muted, fontWeight: '500' },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    height: 50,
    paddingHorizontal: space.lg,
  },
  ctaText: { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
});
