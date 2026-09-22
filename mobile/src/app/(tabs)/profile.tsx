import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { CardFull, getAllCards, getChunksLibrary, getMedia, getSetting, getVocabCefrCounts, setSetting } from '@/lib/db';
import { retrievability } from '@/lib/srs';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Kompakt Profil (revize): kullanici + hafiza koruma + 3 metrik + favori ozet + ayarlar.
// Metrikler gercek; seri/XP/haftalik delta/pratik-dk/GB uydurmalari yok.
export default function ProfileScreen() {
  const [words, setWords] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [videos, setVideos] = useState(0);
  const [cards, setCards] = useState<CardFull[]>([]);
  const [level, setLevel] = useState<string | null>(null);
  const [notify, setNotify] = useState(false);
  const [loading, setLoading] = useState(true); // ilk yukleme iskeleti
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setWords(getVocabCefrCounts().reduce((a, c) => a + c.c, 0));
      setChunks(getChunksLibrary().length);
      setVideos(getMedia().length);
      setCards(getAllCards());
      setLevel(getSetting('level'));
      setNotify(getSetting('notify') === '1');
      setLoading(false);
    }, []),
  );

  // Yalniz doner-kartlar (card_json dolu) hafiza skoruna girer; makale/izle kayitlari kartsizdir.
  const flipCards = cards.filter((c) => c.card_json);
  const memoryR = flipCards.length
    ? Math.round((flipCards.reduce((a, c) => a + retrievability(c.card_json), 0) / flipCards.length) * 100)
    : 0;
  const nextLevel = level ? LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)] : 'C1';
  const lastSource = cards.find((c) => c.media_title)?.media_title ?? null;

  function toggleNotify(v: boolean) {
    setNotify(v);
    setSetting('notify', v ? '1' : '0');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bolum basligi (diger sekmelerle ayni) */}
        <ScreenHeader title="Profil" subtitle="Hesabın ve ilerlemen" icon="person" />

        {loading ? <ProfileSkeleton /> : (
        <>
        {/* Kullanici karti */}
        <View style={styles.user}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Öğrenci</Text>
            <View style={styles.levelRow}>
              <Text style={styles.levelText}>{level ? `${level} İleri Seviye` : 'Seviye seçilmedi'}</Text>
              {level ? (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.goalText}>{nextLevel} Hedefi</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Hafiza koruma (gercek FSRS R) */}
        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Text style={styles.progressLabel}>
              <Ionicons name="pulse-outline" size={15} color={colors.teal} /> Hafıza Koruma (R)
            </Text>
            <Text style={styles.progressPct}>%{memoryR}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${memoryR}%` }]} />
          </View>
          <Text style={styles.progressSub}>
            {cards.length > 0 ? 'Kartların akılda kalıcılığına göre tahmini hatırlama' : 'Kart ekleyince burada hafıza skorun görünür'}
          </Text>
        </View>

        {/* 3 kompakt metrik */}
        <View style={styles.metrics}>
          <MetricCard value={words.toLocaleString('tr-TR')} label="Kelime" />
          <MetricCard value={String(chunks)} label="Aktif Kalıp" sub="B2-C1" tint={colors.teal} />
          <MetricCard value={String(cards.length)} label="Kayıtlı Kart" />
        </View>

        {/* Favori ozet (tek satir) */}
        <Pressable style={styles.favRow} onPress={() => router.navigate('/review')}>
          <View style={styles.favIcon}>
            <Ionicons name="bookmark" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.favTitle}>Kayıtlı Kesitler & Kalıplar</Text>
            <Text style={styles.favSub} numberOfLines={1}>
              {cards.length} kayıt{lastSource ? ` · Son: ${lastSource}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {/* Ayarlar */}
        <Text style={styles.sectionTitle}>Hesap & Ayarlar</Text>
        <View style={styles.settings}>
          <SettingRow icon="flag-outline" title="Günlük Hedefler" sub="20 kart / gün" first />
          <View style={styles.setRow}>
            <View style={styles.setIcon}>
              <Ionicons name="notifications-outline" size={18} color={colors.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.setTitle}>Bildirimler</Text>
              <Text style={styles.setSub}>Günlük tekrar hatırlatıcısı</Text>
            </View>
            <Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: colors.accent, false: colors.line }} thumbColor="#fff" />
          </View>
          <SettingRow icon="cloud-download-outline" title="İndirilenler & Çevrimdışı" sub={`${videos} video gömülü`} />
          <SettingRow icon="language-outline" title="Seviye & Tercihler" sub={`İngilizce${level ? ` · ${level}` : ''}`} />
        </View>

        <Text style={styles.note}>Bildirim tercihi kaydedilir; zamanlanmış bildirim bu sürümde henüz aktif değil.</Text>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Ilk yukleme iskeleti: kullanici karti + ilerleme + metrikler + satirlar.
function ProfileSkeleton() {
  return (
    <>
      <View style={styles.user}>
        <Skeleton width={60} height={60} radius={radius.pill} />
        <View style={{ flex: 1, gap: space.sm }}>
          <Skeleton width="50%" height={18} />
          <Skeleton width="70%" height={12} />
        </View>
      </View>
      <View style={styles.progress}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="100%" height={8} radius={radius.pill} />
        <Skeleton width="80%" height={11} />
      </View>
      <View style={styles.metrics}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="30%" height={70} radius={radius.md} style={{ flex: 1 }} />
        ))}
      </View>
      <Skeleton width="100%" height={64} radius={radius.md} />
      <Skeleton width={160} height={14} />
      <Skeleton width="100%" height={180} radius={radius.md} />
    </>
  );
}

function MetricCard({ value, label, sub, tint }: { value: string; label: string; sub?: string; tint?: string }) {
  return (
    <View style={styles.mCard}>
      <Text style={styles.mLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.mValue}>{value}</Text>
      {sub ? <Text style={[styles.mSub, tint ? { color: tint } : null]}>{sub}</Text> : null}
    </View>
  );
}

function SettingRow({
  icon,
  title,
  sub,
  first,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.setRow, !first && styles.setBorder]}>
      <View style={styles.setIcon}>
        <Ionicons name={icon} size={18} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.setTitle}>{title}</Text>
        <Text style={styles.setSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  user: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 3 },
  levelText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  dot: { width: 3, height: 3, borderRadius: radius.pill, backgroundColor: colors.lineStrong },
  goalText: { fontSize: 12, color: colors.accent, fontWeight: '700' },

  progress: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontWeight: '700', color: colors.ink },
  progressPct: { fontSize: 15, fontWeight: '800', color: colors.teal },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.teal },
  progressSub: { fontSize: 11, color: colors.muted },

  metrics: { flexDirection: 'row', gap: space.sm },
  mCard: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: 2 },
  mLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  mValue: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 2, letterSpacing: -0.5 },
  mSub: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  favRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md },
  favIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  favTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  favSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, paddingHorizontal: space.xs },
  settings: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  setBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  setIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  setTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  setSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  note: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: -space.sm, paddingHorizontal: space.xs },
});
