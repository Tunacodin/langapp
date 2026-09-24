import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, space } from '@/constants/appTheme';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';
import { ActiveFocus, ArticleRow, getActiveFocus, getArticles } from '@/lib/db';

// OKUMA: seviyene uygun kisa metinler + Sozlugum (kelime kutuphanesi). Kelime,
// okuma alanina ait oldugu icin vocab girisi burada. Odak varken SADECE o gramer
// yapisini iceren metinler listelenir (odak kilidi).
export default function OkumaScreen() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [focus, setFocus] = useState<ActiveFocus | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      const f = getActiveFocus();
      setFocus(f);
      setArticles(getArticles(f?.key));
      setLoading(false);
    }, []),
  );

  const needle = q.trim().toLowerCase();
  const fArticles = useMemo(
    () => articles.filter((a) => !needle || a.title.toLowerCase().includes(needle)),
    [articles, needle],
  );
  const searching = needle.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Okuma" subtitle="Okuyarak kelime hazneni genişlet" icon="book" />

        <FocusBadge />

        {/* Sozlugum: kelime kutuphanesi girisi (vocab bu alana ait) */}
        <Pressable style={styles.lexEntry} onPress={() => router.push('/vocabulary')}>
          <View style={styles.lexIcon}>
            <Ionicons name="library" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.lexTitle}>Sözlüğüm</Text>
            <Text style={styles.lexSub}>Kelime kütüphaneni aç ve pratik yap</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.teal} />
        </Pressable>

        {/* Arama */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Metin başlığı ara"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {loading ? <OkumaSkeleton /> : null}

        {!loading ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metinler</Text>
            {fArticles.length === 0 ? (
              <Text style={styles.empty}>
                {searching ? 'Sonuç yok.' : focus ? `${focus.label} için metin yok.` : 'Henüz metin yok.'}
              </Text>
            ) : (
              fArticles.map((a) => (
                <Pressable
                  key={a.id}
                  style={styles.row}
                  onPress={() => router.push(`/reading?id=${encodeURIComponent(a.id)}`)}>
                  {a.image_url ? (
                    <Image source={{ uri: a.image_url }} style={styles.rowImg} contentFit="cover" transition={150} />
                  ) : (
                    <View style={styles.rowIcon}>
                      <Ionicons name="document-text-outline" size={22} color={colors.teal} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <Text style={styles.rowFoot} numberOfLines={1}>
                      {a.word_count} kelime · {a.read_minutes} dk
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function OkumaSkeleton() {
  return (
    <>
      {[0, 1, 2, 3].map((r) => (
        <View key={r} style={styles.row}>
          <Skeleton width={44} height={44} radius={radius.sm} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Skeleton width="85%" height={14} />
            <Skeleton width="45%" height={11} />
          </View>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  lexEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: colors.teal,
    borderRadius: radius.md,
    padding: space.md,
  },
  lexIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lexTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  lexSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  search: {
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

  section: { gap: space.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },

  row: {
    flexDirection: 'row',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
    alignItems: 'center',
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImg: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.line },
  rowText: { fontSize: 15, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  rowFoot: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 4 },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },
});
