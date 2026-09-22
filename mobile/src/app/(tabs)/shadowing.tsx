import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { colors, radius, space } from '@/constants/appTheme';
import { getSpeakingStats, SpeakingFocusStat } from '@/lib/db';
import { SPEAKING_FOCUS } from '@/lib/speaking';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';

// KONUSMA: odak-nokta temelli konusma pratigi. Her odak tek bir yapiyi
// olumlu/olumsuz/soru/farkli-kelime varyasyonlariyla calistirir. Karta dokun ->
// pratik ekrani (dinle -> ses kaydi + opsiyonel video -> sirakadi varyasyon).
// Ilerleme GERCEK: her odak icin kac kayit / kac gun (speaking_takes).
export default function KonusmaScreen() {
  const [stats, setStats] = useState<Record<string, SpeakingFocusStat>>({});
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setStats(getSpeakingStats());
    }, []),
  );

  const totalTakes = Object.values(stats).reduce((a, s) => a + s.takes, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Konuşma" subtitle="Sesli pratik yap, telaffuzunu geliştir" icon="mic" />

        <FocusBadge />

        {totalTakes > 0 ? (
          <View style={styles.summary}>
            <Ionicons name="mic-circle" size={20} color={colors.accent} />
            <Text style={styles.summaryText}>Toplam {totalTakes} kayıt · her gün biraz daha</Text>
          </View>
        ) : (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Konuşarak öğren</Text>
            <Text style={styles.introBody}>
              Bir odak seç. Önce cümleyi dinle, sonra kendini sesli (istersen ön kameradan videolu) kaydet.
              Aynı yapıyı olumlu, olumsuz, soru ve farklı kelimelerle tekrarla; gelişimini gün gün gör.
            </Text>
          </View>
        )}

        <View style={styles.list}>
          {SPEAKING_FOCUS.map((f) => {
            const s = stats[f.id];
            return (
              <Pressable
                key={f.id}
                style={styles.card}
                onPress={() => router.push(`/speaking-practice?focus=${encodeURIComponent(f.id)}`)}>
                <View style={styles.cardTop}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="chatbubbles" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{f.title}</Text>
                    <Text style={styles.cardTag} numberOfLines={1}>
                      {f.focusEn} · {f.cefr}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </View>

                <Text style={styles.cardGoal} numberOfLines={2}>
                  {f.goalTr}
                </Text>

                <View style={styles.cardFoot}>
                  <View style={styles.metaPill}>
                    <Ionicons name="albums-outline" size={13} color={colors.teal} />
                    <Text style={styles.metaText}>{f.variations.length} varyasyon</Text>
                  </View>
                  {s && s.takes > 0 ? (
                    <>
                      <View style={styles.metaPill}>
                        <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                        <Text style={styles.metaText}>{s.days} gün</Text>
                      </View>
                      <Pressable
                        style={styles.historyPill}
                        onPress={() => router.push(`/speaking-progress?focus=${encodeURIComponent(f.id)}`)}>
                        <Ionicons name="albums" size={13} color={colors.accent} />
                        <Text style={styles.historyText}>{s.takes} kayıt</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Text style={styles.newText}>Henüz başlamadın</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.xl, paddingTop: space.sm, gap: space.lg, paddingBottom: space.xxl },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  summaryText: { fontSize: 13, fontWeight: '700', color: colors.ink },

  intro: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  introTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  introBody: { fontSize: 13, color: colors.muted, lineHeight: 20 },

  list: { gap: space.md },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  cardTag: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 1 },
  cardGoal: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyText: { fontSize: 11, fontWeight: '800', color: colors.accent },
  newText: { fontSize: 11, fontWeight: '700', color: colors.accent },
});
