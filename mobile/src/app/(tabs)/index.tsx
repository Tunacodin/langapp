import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import {
  ArticleRow,
  CourseUnitOverview,
  getArticles,
  getCourseUnits,
  getGrammarClips,
  getNextStudyTask,
  getSetting,
  getShadowClips,
  getWatchClips,
  GrammarClip,
  NextTask,
  SentenceClip,
  ShadowClip,
  WatchClip,
} from '@/lib/db';
import { getPoster } from '@/lib/posters';

type Chip = { key: string; label: string; accent?: boolean };

// KESFET: cok alanli oturum kesfi. Kart birimi = calisma KESITI (tek cumle klibi),
// ham video degil. Bir videodan cikan izle/shadowing/gramer kesitleri + okuma
// makaleleri ayri raylarda listelenir; ustte "Siradaki Gorev" (kaldigin yerden).
// Tum metrikler GERCEK (klip suresi, obek say., shadow ilerlemesi, kelime/dk).
export default function KesfetScreen() {
  const [next, setNext] = useState<NextTask | null>(null);
  const [watch, setWatch] = useState<WatchClip[]>([]);
  const [shadow, setShadow] = useState<ShadowClip[]>([]);
  const [grammar, setGrammar] = useState<GrammarClip[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [units, setUnits] = useState<CourseUnitOverview[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cefr, setCefr] = useState('all'); // 'all' | 'i1' | CEFR kodu
  const [loading, setLoading] = useState(true); // ilk yukleme; sonraki focus'larda iskelet cikmaz
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setNext(getNextStudyTask());
      setWatch(getWatchClips(40));
      setShadow(getShadowClips(40));
      setGrammar(getGrammarClips(40));
      setArticles(getArticles());
      setUnits(getCourseUnits());
      setLevel(getSetting('level'));
      setLoading(false);
    }, []),
  );

  // CEFR cipleri: Tumu + i+1 (onboarding seviyesi) + veride gecen seviyeler.
  const chips = useMemo<Chip[]>(() => {
    const set = new Set<string>();
    for (const c of [...watch, ...shadow, ...grammar]) if (c.cefr) set.add(c.cefr);
    for (const a of articles) if (a.cefr) set.add(a.cefr);
    const cefrs = [...set].sort();
    return [
      { key: 'all', label: 'Tümü' },
      ...(level ? [{ key: 'i1', label: `i+1 Seviyem (${level})`, accent: true }] : []),
      ...cefrs.map((c) => ({ key: c, label: c })),
    ];
  }, [watch, shadow, grammar, articles, level]);

  const needle = q.trim().toLowerCase();
  const wantCefr = cefr === 'i1' ? level : cefr === 'all' ? null : cefr;

  function keepClip(c: SentenceClip): boolean {
    if (wantCefr && c.cefr !== wantCefr) return false;
    if (needle && !(`${c.text_en} ${c.text_tr ?? ''} ${c.title}`.toLowerCase().includes(needle))) return false;
    return true;
  }
  const fWatch = useMemo(() => watch.filter(keepClip), [watch, wantCefr, needle]);
  const fShadow = useMemo(() => shadow.filter(keepClip), [shadow, wantCefr, needle]);
  const fGrammar = useMemo(() => grammar.filter(keepClip), [grammar, wantCefr, needle]);
  const fArticles = useMemo(
    () =>
      articles.filter(
        (a) => (!wantCefr || a.cefr === wantCefr) && (!needle || a.title.toLowerCase().includes(needle)),
      ),
    [articles, wantCefr, needle],
  );

  const searching = needle.length > 0;
  const nothing = fWatch.length + fShadow.length + fGrammar.length + fArticles.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bolum basligi (uygulama adi gecmez) */}
        <ScreenHeader
          title="Keşfet"
          subtitle="Seviyene uygun içerikleri bul"
          icon="compass"
          right={
            <>
              <Pressable onPress={() => router.push('/vocabulary')} hitSlop={8}>
                <Ionicons name="book-outline" size={22} color={colors.muted} />
              </Pressable>
              <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
                <Ionicons name="notifications-outline" size={22} color={colors.muted} />
              </Pressable>
            </>
          }
        />

        {/* Arama + filtre sifirla */}
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Kesit, konuşmacı, kalıp veya metin ara"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            style={[styles.tuneBtn, (cefr !== 'all' || searching) && styles.tuneBtnOn]}
            onPress={() => {
              setCefr('all');
              setQ('');
            }}
            hitSlop={6}>
            <Ionicons name="options-outline" size={20} color={cefr !== 'all' || searching ? '#fff' : colors.ink} />
            {cefr !== 'all' || searching ? <View style={styles.tuneDot} /> : null}
          </Pressable>
        </View>

        {loading ? <KesfetSkeleton /> : null}

        {/* CEFR cipleri */}
        {!loading ? (
          <FlatList
            data={chips}
            horizontal
            keyExtractor={(c) => c.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsWrap}
            renderItem={({ item: c }) => {
              const on = c.key === cefr;
              return (
                <Pressable
                  style={[styles.chip, on && styles.chipOn, c.accent && !on && styles.chipAccent]}
                  onPress={() => setCefr(c.key)}>
                  {c.accent ? <Ionicons name="sparkles" size={13} color={on ? '#fff' : colors.accent} /> : null}
                  <Text style={[styles.chipText, on && styles.chipTextOn, c.accent && !on && { color: colors.accent }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : null}

        {/* Ders uniteleri (coursebook) - arama yokken */}
        {!loading && !searching ? <UnitsStrip units={units} /> : null}

        {/* Siradaki gorev (arama yokken) */}
        {!loading && !searching && next ? <NextTaskHero task={next} /> : null}

        {!loading && nothing ? <Text style={styles.empty}>Sonuç yok.</Text> : null}

        {/* İzle kesitleri */}
        {!loading ? (
          <>
        <Rail
          title="İzle Kesitleri"
          sub="Öbek bakımından en zengin cümleler"
          icon="play-circle"
          tint={colors.accent}
          data={fWatch}
          renderCard={(c) => (
            <ClipCard
              key={`w${c.media_id}${c.idx}`}
              poster={getPoster(c.youtube_id)}
              cefr={c.cefr}
              durationMs={c.end_ms - c.start_ms}
              icon="play"
              iconBg="rgba(255,255,255,0.92)"
              iconColor={colors.accent}
              text={c.text_en}
              footText={`${c.chunk_count} öbek`}
              footTint={colors.teal}
              onPress={() => router.push(`/player?id=${encodeURIComponent(c.media_id)}&start=${c.start_ms}`)}
            />
          )}
        />

        {/* Shadowing kesitleri */}
        <Rail
          title="Shadowing Kesitleri"
          sub="Telaffuz için kısa, yoğun cümleler"
          icon="mic"
          tint={colors.teal}
          data={fShadow}
          renderCard={(c) => (
            <ClipCard
              key={`s${c.media_id}${c.idx}`}
              poster={getPoster(c.youtube_id)}
              cefr={c.cefr}
              durationMs={c.end_ms - c.start_ms}
              icon="mic"
              iconBg={colors.accent}
              iconColor="#fff"
              text={c.text_en}
              footText={c.done ? 'Bitti ✓' : c.attempts > 0 ? `${c.attempts} deneme` : 'Yeni'}
              footTint={c.done ? colors.success : c.attempts > 0 ? colors.teal : colors.accent}
              onPress={() =>
                router.push(
                  `/shadowing-studio?text=${encodeURIComponent(c.text_en)}&hint=${encodeURIComponent(
                    c.text_tr ?? '',
                  )}&mediaId=${encodeURIComponent(c.media_id)}&idx=${c.idx}&start=${c.start_ms}&end=${c.end_ms}`,
                )
              }
            />
          )}
        />

        {/* Gramer kesitleri */}
        <Rail
          title="Gramer Kesitleri"
          sub="Bir kalıbın geçtiği gerçek cümleler"
          icon="git-branch"
          tint={colors.teal}
          data={fGrammar}
          renderCard={(c) => (
            <ClipCard
              key={`g${c.media_id}${c.idx}${c.norm_pattern}`}
              poster={getPoster(c.youtube_id)}
              cefr={c.cefr}
              durationMs={c.end_ms - c.start_ms}
              icon="git-branch"
              iconBg="rgba(255,255,255,0.92)"
              iconColor={colors.teal}
              text={c.text_en}
              footText={c.label_tr}
              footTint={colors.teal}
              onPress={() =>
                router.push(
                  `/item?type=grammar&key=${encodeURIComponent(c.norm_pattern)}&title=${encodeURIComponent(
                    c.label_tr,
                  )}`,
                )
              }
            />
          )}
        />

        {/* Oku (makaleler) */}
        <Rail
          title="Oku"
          sub="Seviyene uygun kısa metinler"
          icon="book"
          tint={colors.accent}
          data={fArticles}
          renderCard={(a) => (
            <ArticleCard key={a.id} article={a} onPress={() => router.push(`/reading?id=${encodeURIComponent(a.id)}`)} />
          )}
        />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// Ilk yukleme iskeleti: gercek yerlesimi (cip satiri + hero + 2 ray) taklit eder,
// veri gelince zıplama olmaz.
function KesfetSkeleton() {
  return (
    <>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {[54, 96, 44, 44].map((w, i) => (
          <Skeleton key={i} width={w} height={32} radius={radius.pill} />
        ))}
      </View>
      <View style={styles.heroSection}>
        <Skeleton width={120} height={12} />
        <Skeleton width="100%" height={0} style={{ aspectRatio: 16 / 9 }} radius={radius.lg} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
      </View>
      {[0, 1].map((r) => (
        <View key={r} style={styles.rail}>
          <Skeleton width={150} height={18} />
          <Skeleton width={110} height={12} />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            {[0, 1].map((c) => (
              <View key={c} style={styles.card}>
                <Skeleton width={CARD_W} height={(CARD_W * 9) / 16} radius={0} />
                <Skeleton width="70%" height={13} style={{ marginHorizontal: space.sm, marginTop: space.xs }} />
                <Skeleton width="45%" height={11} style={{ marginHorizontal: space.sm }} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

// Yatay ray: baslik + alt metin + kart listesi. Bos ise hic gosterilmez.
function Rail<T>({
  title,
  sub,
  icon,
  tint,
  data,
  renderCard,
}: {
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  data: T[];
  renderCard: (item: T) => React.ReactNode;
}) {
  if (data.length === 0) return null;
  return (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <View style={styles.railTitleRow}>
          <Ionicons name={icon} size={18} color={tint} />
          <Text style={styles.railTitle}>{title}</Text>
          <Text style={styles.railCount}>{data.length}</Text>
        </View>
        <Text style={styles.railSub}>{sub}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railScroll}>
        {data.map(renderCard)}
      </ScrollView>
    </View>
  );
}

// Kesit karti: poster + CEFR + klip suresi + alan ikonu + cumle + alan metrigi.
function ClipCard({
  poster,
  cefr,
  durationMs,
  icon,
  iconBg,
  iconColor,
  text,
  footText,
  footTint,
  onPress,
}: {
  poster: number | null;
  cefr: string | null;
  durationMs: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  text: string;
  footText: string;
  footTint: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardThumb}>
        {poster ? <Image source={poster} style={styles.thumbImg} resizeMode="cover" /> : null}
        {cefr ? <Text style={styles.cardBadge}>{cefr}</Text> : null}
        {durationMs > 0 ? <Text style={styles.cardDur}>{fmt(durationMs)}</Text> : null}
        <View style={[styles.cardIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
      </View>
      <Text style={styles.cardText} numberOfLines={2}>
        {text}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.footText, { color: footTint }]} numberOfLines={1}>
          {footText}
        </Text>
      </View>
    </Pressable>
  );
}

// Makale karti: renkli kapak (poster yok) + CEFR + baslik + kelime/dk (GERCEK).
function ArticleCard({ article, onPress }: { article: ArticleRow; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardThumb, styles.articleCover]}>
        <Ionicons name="document-text-outline" size={30} color={colors.teal} />
        {article.cefr ? <Text style={[styles.cardBadge, styles.articleBadge]}>{article.cefr}</Text> : null}
      </View>
      <Text style={styles.cardText} numberOfLines={2}>
        {article.title}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.footText} numberOfLines={1}>
          {article.word_count} kelime · {article.read_minutes} dk
        </Text>
      </View>
    </Pressable>
  );
}

// Siradaki gorev hero: en son aktiviteye gore bir sonraki kesit (GERCEK).
function NextTaskHero({ task }: { task: NextTask }) {
  const isShadow = task.domain === 'shadowing';
  const go = () => {
    if (isShadow) {
      router.push(
        `/shadowing-studio?text=${encodeURIComponent(task.text_en)}&hint=${encodeURIComponent(
          task.text_tr ?? '',
        )}&mediaId=${encodeURIComponent(task.media_id)}&idx=${task.idx}&start=${task.start_ms}&end=${task.end_ms}`,
      );
    } else {
      router.push(`/player?id=${encodeURIComponent(task.media_id)}&start=${task.start_ms}`);
    }
  };
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroHead}>
        <Text style={styles.eyebrow}>SIRADAKİ GÖREV</Text>
        <View style={styles.reasonBadge}>
          <View style={styles.pulse} />
          <Text style={styles.reasonText}>{task.reason}</Text>
        </View>
      </View>
      <Pressable style={styles.hero} onPress={go}>
        <View style={styles.heroThumb}>
          {getPoster(task.youtube_id) ? (
            <Image source={getPoster(task.youtube_id)!} style={styles.thumbImg} resizeMode="cover" />
          ) : null}
          <View style={styles.heroBadge}>
            <Ionicons name={isShadow ? 'mic' : 'play'} size={12} color="#fff" />
            <Text style={styles.heroBadgeText}>
              {isShadow ? 'Shadowing' : 'İzle'}
              {task.cefr ? ` · ${task.cefr}` : ''}
            </Text>
          </View>
          {task.end_ms - task.start_ms > 0 ? (
            <Text style={styles.durBadge}>{fmt(task.end_ms - task.start_ms)}</Text>
          ) : null}
          <View style={styles.playCircle}>
            <Ionicons name={isShadow ? 'mic' : 'play'} size={26} color={isShadow ? colors.teal : colors.accent} />
          </View>
        </View>
        <View style={styles.heroBody}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {task.text_en}
          </Text>
          {task.text_tr ? (
            <Text style={styles.heroTr} numberOfLines={1}>
              {task.text_tr}
            </Text>
          ) : null}
          <Text style={styles.heroSource} numberOfLines={1}>
            {task.title}
          </Text>
          <View style={[styles.heroCta, isShadow && { backgroundColor: colors.teal }]}>
            <Text style={styles.heroCtaText}>{isShadow ? 'Shadowing Yap' : 'Devam Et'}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

// Ders uniteleri seridi: 8 tematik unite, GERCEK icerik sayimlariyla. Karta
// dokun -> /unit detay (Grammar/Vocabulary/Reading/Listening/Speaking/Writing).
function UnitsStrip({ units }: { units: CourseUnitOverview[] }) {
  if (!units.length) return null;
  return (
    <View style={styles.unitsBlock}>
      <View style={styles.unitsHead}>
        <Text style={styles.unitsTitle}>Ders Üniteleri</Text>
        <Text style={styles.unitsSub}>Tema · gramer · kelime</Text>
      </View>
      <FlatList
        data={units}
        horizontal
        keyExtractor={(u) => String(u.no)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.unitsRow}
        renderItem={({ item: u }) => {
          const total = u.grammarCount + u.vocabCount + u.readingCount + u.listeningCount;
          return (
            <Pressable style={styles.unitCard} onPress={() => router.push(`/unit?no=${u.no}`)}>
              <View style={styles.unitTop}>
                <View style={styles.unitBadge}>
                  <Ionicons name={u.icon as never} size={16} color={colors.accent} />
                </View>
                <Text style={styles.unitNo}>ÜNİTE {String(u.no).padStart(2, '0')}</Text>
              </View>
              <Text style={styles.unitTitle} numberOfLines={2}>
                {u.title_tr}
              </Text>
              <Text style={styles.unitMeta} numberOfLines={1}>
                {u.grammarCount} gramer · {u.vocabCount} kelime
              </Text>
              <View style={styles.unitFoot}>
                <Text style={styles.unitCefr}>{u.cefr}</Text>
                {total === 0 ? <Text style={styles.unitSoon}>yakında</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function fmt(ms: number) {
  const s = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const CARD_W = 210;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  unitsBlock: { gap: space.sm },
  unitsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  unitsTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  unitsSub: { fontSize: 12, color: colors.muted },
  unitsRow: { gap: space.md, paddingRight: space.xl },
  unitCard: {
    width: 156,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  unitTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  unitBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitNo: { fontSize: 10, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  unitTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, lineHeight: 18, marginTop: 2, minHeight: 36 },
  unitMeta: { fontSize: 11, color: colors.muted },
  unitFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  unitCefr: { fontSize: 10, fontWeight: '800', color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  unitSoon: { fontSize: 10, color: colors.muted, fontStyle: 'italic' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, padding: 0 },
  tuneBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tuneBtnOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tuneDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.ink,
  },

  chipsWrap: { marginHorizontal: -space.xl },
  chipsRow: { gap: space.sm, paddingHorizontal: space.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipAccent: { borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextOn: { color: '#fff' },

  // Siradaki gorev hero
  heroSection: { gap: space.sm },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1 },
  reasonBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pulse: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  reasonText: { fontSize: 11, fontWeight: '700', color: colors.accent },
  hero: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden' },
  heroThumb: { aspectRatio: 16 / 9, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  heroBadge: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  durBadge: {
    position: 'absolute',
    top: space.md,
    right: space.md,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  playCircle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: { padding: space.lg, gap: 6 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, lineHeight: 23, letterSpacing: -0.2 },
  heroTr: { fontSize: 13, color: colors.muted },
  heroSource: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  heroCtaText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Ray
  rail: { gap: space.sm },
  railHead: { gap: 2 },
  railTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  railTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  railCount: { fontSize: 12, color: colors.muted, fontWeight: '700', marginLeft: 2 },
  railSub: { fontSize: 12, color: colors.muted },
  railScroll: { gap: space.md, paddingRight: space.xl },

  // Kart
  card: {
    width: CARD_W,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingBottom: space.sm,
    gap: space.xs,
  },
  cardThumb: { aspectRatio: 16 / 9, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  articleCover: { backgroundColor: colors.tealSoft },
  thumbImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  cardBadge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  articleBadge: { backgroundColor: colors.teal },
  cardDur: {
    position: 'absolute',
    bottom: space.sm,
    right: space.sm,
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 18,
    paddingHorizontal: space.sm,
    marginTop: space.xs,
  },
  cardFooter: {
    marginHorizontal: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
  },
  footText: { fontSize: 11, fontWeight: '700', color: colors.muted },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },
});
