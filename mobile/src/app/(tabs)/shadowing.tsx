import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FocusBadge } from '@/components/focus-badge';
import { ScreenHeader } from '@/components/screen-header';
import { colors, space } from '@/constants/appTheme';
import { getActiveFocus, getLadderSummary, getSpeakingStats, LadderSummary, SpeakingFocusStat } from '@/lib/db';
import { SPEAKING_FOCUS } from '@/lib/speaking';
import { LADDER_TRACKS, ladderStep, trackProgress, trackUnlocked } from '@/lib/speaking/ladder';
import { useScrollTopOnBlur } from '@/lib/useScrollTopOnBlur';

// KONUSMA: ustte KONUSMA MERDIVENI (gramer konusu -> temalar; her tema tek akis:
// ipucundan cumle soyle -> zincir, bkz. speaking-ladder.tsx). Konular ders
// kitabi sirasinda tek satir; acik konunun temalari altinda listelenir. Varsayilan
// acik konu: aktif odagin konusu (kilitli degilse), yoksa bitmemis ilk acik konu.
// Altta eski kisa odak pratikleri.
// Kisa pratik: odak-nokta temelli konusma pratigi. Her odak tek bir yapiyi
// olumlu/olumsuz/soru/farkli-kelime varyasyonlariyla calistirir. Karta dokun ->
// pratik ekrani (dinle -> ses kaydi + opsiyonel video -> sirakadi varyasyon).
// Ilerleme GERCEK: her odak icin kac kayit / kac gun (speaking_takes).
export default function KonusmaScreen() {
  const [stats, setStats] = useState<Record<string, SpeakingFocusStat>>({});
  const [ladder, setLadder] = useState<Record<string, LadderSummary>>({});
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null); // null = varsayilan konu, '' = hepsi kapali
  const scrollRef = useScrollTopOnBlur();

  useFocusEffect(
    useCallback(() => {
      setStats(getSpeakingStats());
      setLadder(getLadderSummary());
      setFocusKey(getActiveFocus()?.key ?? null);
    }, []),
  );

  const unlocked = useMemo(() => LADDER_TRACKS.map((_, i) => trackUnlocked(i, ladder)), [ladder]);
  const defaultId = useMemo(() => {
    const fi = focusKey ? LADDER_TRACKS.findIndex((t) => t.patterns.includes(focusKey)) : -1;
    if (fi >= 0 && unlocked[fi]) return LADDER_TRACKS[fi].id;
    let last = LADDER_TRACKS[0].id;
    for (let i = 0; i < LADDER_TRACKS.length && unlocked[i]; i++) {
      last = LADDER_TRACKS[i].id;
      const p = trackProgress(LADDER_TRACKS[i], ladder);
      if (p.done < p.total) break;
    }
    return last;
  }, [focusKey, unlocked, ladder]);
  const shownId = openId ?? defaultId;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Konuşma" subtitle="Sesli pratik yap, telaffuzunu geliştir" icon="mic" />

        <FocusBadge />

        <View style={styles.list}>
          <View>
            <Text style={styles.secTitle}>Konuşma merdiveni</Text>
            <Text style={styles.secSub}>
              Her temada kısa ipucuna bakıp cümlenin İngilizcesini söylersin. Sonra cümleleri art arda anlatırsın.
            </Text>
          </View>
          {LADDER_TRACKS.map((track, i) => {
            const open = unlocked[i] && track.id === shownId;
            const prog = trackProgress(track, ladder);
            const nextUp = !unlocked[i] && unlocked[i - 1];
            return (
              <View key={track.id} style={styles.track}>
                <Pressable
                  style={[styles.trackHead, !unlocked[i] && styles.trackLocked]}
                  disabled={!unlocked[i]}
                  onPress={() => setOpenId(open ? '' : track.id)}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                    <Text style={styles.trackSub} numberOfLines={1}>
                      {nextUp ? 'Önceki konu bitince açılır' : track.subtitle}
                    </Text>
                  </View>
                  {unlocked[i] ? (
                    <>
                      <Text style={styles.trackCount}>
                        {prog.done}/{prog.total}
                      </Text>
                      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                    </>
                  ) : (
                    <Ionicons name="lock-closed" size={16} color={colors.muted} />
                  )}
                </Pressable>
                {open ? (
                  <View style={styles.frame}>
                    {track.themes.map((t, k) => {
                      const sm = ladder[t.id];
                      const { label: step, frac } = ladderStep(t, sm?.byStage ?? {}, sm?.chainLen ?? 0);
                      return (
                        <Pressable
                          key={t.id}
                          style={[styles.themeRow, k === track.themes.length - 1 && styles.rowLast]}
                          onPress={() => router.push(`/speaking-ladder?theme=${encodeURIComponent(t.id)}`)}>
                          <View style={styles.cardIcon}>
                            <Ionicons name={t.icon} size={20} color={colors.accent} />
                          </View>
                          <View style={{ flex: 1, gap: 6 }}>
                            <View style={styles.themeTop}>
                              <Text style={styles.themeTitle}>{t.title}</Text>
                              <Text style={styles.themeStep}>{step}</Text>
                            </View>
                            <View style={styles.bar}>
                              <View style={[styles.barFill, { width: `${Math.round(frac * 100)}%` }]} />
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Text style={styles.secTitle}>Kısa pratikler</Text>
        <View style={styles.frame}>
          {SPEAKING_FOCUS.map((f, k) => {
            const s = stats[f.id];
            return (
              <Pressable
                key={f.id}
                style={[styles.card, k === SPEAKING_FOCUS.length - 1 && styles.rowLast]}
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

  list: { gap: space.md },
  secTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  secSub: { fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 19 },
  track: { gap: space.sm },
  // Konu basligi: kalin murekkep alt cizgi, kose/golge yok.
  trackHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingVertical: space.sm,
  },
  trackLocked: { opacity: 0.45, borderBottomColor: colors.lineStrong },
  trackTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  trackSub: { fontSize: 12, color: colors.muted },
  trackCount: { fontSize: 12, fontWeight: '800', color: colors.ink, letterSpacing: 0.5 },
  // Liste cercevesi: tek kalin cerceve, satirlar ince cizgiyle ayrilir.
  frame: { borderWidth: 2, borderColor: colors.ink },
  rowLast: { borderBottomWidth: 0 },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    padding: space.md,
  },
  themeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  themeTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.ink },
  themeStep: { fontSize: 12, fontWeight: '700', color: colors.muted },
  bar: { height: 5, backgroundColor: colors.line },
  barFill: { height: 5, backgroundColor: colors.accent },
  card: { borderBottomWidth: 1, borderBottomColor: colors.line, padding: space.lg, gap: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardIcon: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  cardTag: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 1 },
  cardGoal: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  // Etiketler: kapsul degil, ince cerceveli kare.
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  historyText: { fontSize: 11, fontWeight: '800', color: colors.accent },
  newText: { fontSize: 11, fontWeight: '700', color: colors.accent },
});
