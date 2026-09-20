import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { countDueCards, getAllCards, getDueCards, getGrammarLibrary, getMedia } from '@/lib/db';
import { retrievability } from '@/lib/srs';

type Kind = 'reminder' | 'progress' | 'info';
type Href = '/(tabs)/index' | '/review' | '/grammar' | '/shadowing';
type Notif = {
  id: string;
  kind: Kind;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  soft: string;
  title: string;
  body: string;
  cta?: { label: string; to: Href };
};

const FILTERS: { key: 'all' | Kind; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'reminder', label: 'Hatırlatmalar' },
  { key: 'progress', label: 'İlerleme' },
  { key: 'info', label: 'İpuçları' },
];

// Bildirimler: GERCEK uygulama durumundan turetilir (bekleyen tekrar, hafiza skoru,
// kesfedilecek gramer/video). Sahte seri/XP/rozet yok; gercek yoksa bos durum.
function buildNotifs(): Notif[] {
  const cards = getAllCards();
  const due = getDueCards();
  const list: Notif[] = [];

  if (due.length > 0) {
    const sample = due.slice(0, 2).map((d) => d.front_en).join(', ');
    list.push({
      id: 'due',
      kind: 'reminder',
      icon: 'alarm-outline',
      tint: colors.accent,
      soft: colors.accentSoft,
      title: `${due.length} kart tekrar zamanı`,
      body: `${sample}${due.length > 2 ? ' ve diğerleri' : ''} unutma eşiğine ulaştı. Kısa bir tekrarla sabitle.`,
      cta: { label: 'Hızlı Tekrara Başla', to: '/review' },
    });
  }

  if (cards.length > 0) {
    const r = Math.round((cards.reduce((a, c) => a + retrievability(c.card_json), 0) / cards.length) * 100);
    list.push({
      id: 'memory',
      kind: 'progress',
      icon: 'pulse-outline',
      tint: colors.teal,
      soft: colors.tealSoft,
      title: `Hafıza koruman %${r}`,
      body: 'FSRS unutma eğrisine göre kayıtlı kartlarının tahmini hatırlanma oranı.',
      cta: { label: 'Kartlarım', to: '/review' },
    });
  } else {
    list.push({
      id: 'empty-cards',
      kind: 'info',
      icon: 'add-circle-outline',
      tint: colors.accent,
      soft: colors.accentSoft,
      title: 'Henüz kart eklemedin',
      body: 'Videolardaki cümle ve kalıpları kaydederek akıllı hafıza planını başlat.',
      cta: { label: 'Videoları Keşfet', to: '/(tabs)/index' },
    });
  }

  const grammarTotal = getGrammarLibrary().length;
  const grammarSaved = new Set(cards.filter((c) => c.front_type === 'grammar').map((c) => c.front_en)).size;
  const newGrammar = grammarTotal - grammarSaved;
  if (newGrammar > 0) {
    list.push({
      id: 'grammar',
      kind: 'info',
      icon: 'git-branch-outline',
      tint: colors.teal,
      soft: colors.tealSoft,
      title: `${newGrammar} gramer kalıbı seni bekliyor`,
      body: 'Videolardan çıkan kalıpları sahneleriyle çalış ve pratiğe dök.',
      cta: { label: 'Dilbilgisi', to: '/grammar' },
    });
  }

  const videos = getMedia().length;
  if (videos > 0) {
    list.push({
      id: 'videos',
      kind: 'info',
      icon: 'film-outline',
      tint: colors.ink,
      soft: colors.surface,
      title: `Kütüphanende ${videos} video var`,
      body: 'Seviyene uygun otantik videoları izle, yeni kalıpları yakala.',
      cta: { label: 'İzle', to: '/(tabs)/index' },
    });
  }

  return list;
}

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [read, setRead] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      setNotifs(buildNotifs());
    }, []),
  );

  const list = useMemo(() => (filter === 'all' ? notifs : notifs.filter((n) => n.kind === filter)), [notifs, filter]);
  const unread = notifs.filter((n) => !read.has(n.id)).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Baslik */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <Text style={styles.headerSub}>{unread > 0 ? `${unread} yeni bildirim` : 'Hepsi okundu'}</Text>
        </View>
        {unread > 0 ? (
          <Pressable style={styles.markAll} onPress={() => setRead(new Set(notifs.map((n) => n.id)))}>
            <Ionicons name="checkmark-done" size={15} color={colors.muted} />
            <Text style={styles.markAllText}>Okundu</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filtre cipleri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}>
        {FILTERS.map((f) => {
          const on = f.key === filter;
          const n = f.key === 'all' ? notifs.length : notifs.filter((x) => x.kind === f.key).length;
          return (
            <Pressable key={f.key} style={[styles.chip, on && styles.chipOn]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {f.label} ({n})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {list.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={44} color={colors.muted} />
            <Text style={styles.emptyText}>Bu filtrede bildirim yok.</Text>
          </View>
        ) : (
          list.map((n) => (
            <View key={n.id} style={styles.card}>
              {!read.has(n.id) ? <View style={styles.unreadDot} /> : null}
              <View style={[styles.cardIcon, { backgroundColor: n.soft }]}>
                <Ionicons name={n.icon} size={22} color={n.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.cardBody}>{n.body}</Text>
                {n.cta ? (
                  <Pressable style={styles.cardCta} onPress={() => router.navigate(n.cta!.to)}>
                    <Text style={styles.cardCtaText}>{n.cta.label}</Text>
                    <Ionicons name="arrow-forward" size={15} color={colors.accent} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}

        {/* Ayar kisayolu */}
        <Pressable style={styles.footer} onPress={() => router.navigate('/profile')}>
          <Ionicons name="notifications-outline" size={20} color={colors.muted} />
          <Text style={styles.footerText}>Bildirim tercihlerini Profil'den özelleştir.</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
        <Text style={styles.note}>
          Bu bildirimler uygulamadaki gerçek durumundan üretilir. Zamanlanmış (telefon) bildirimleri bu sürümde henüz aktif değil.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  headerSub: { fontSize: 12, color: colors.accent, fontWeight: '700', marginTop: 1 },
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: { fontSize: 12, fontWeight: '700', color: colors.muted },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsRow: { gap: space.sm, paddingHorizontal: space.xl, paddingBottom: space.sm, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  chipTextOn: { color: '#fff' },

  list: { padding: space.xl, paddingTop: space.sm, gap: space.md, paddingBottom: space.xxl },
  card: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    paddingLeft: space.lg,
  },
  unreadDot: { position: 'absolute', left: 8, top: 18, width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.accent },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  cardBody: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 3 },
  cardCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm },
  cardCtaText: { fontSize: 13, fontWeight: '800', color: colors.accent },

  empty: { alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.xxl * 2 },
  emptyText: { fontSize: 14, color: colors.muted },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginTop: space.sm,
  },
  footerText: { flex: 1, fontSize: 13, color: colors.muted },
  note: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: space.sm, paddingHorizontal: space.xs },
});
