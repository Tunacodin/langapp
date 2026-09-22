import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { deleteSpeakingTake, getSpeakingTakes, SpeakingTake } from '@/lib/db';
import { getSpeakingFocus } from '@/lib/speaking';
import { deleteTakeFiles, humanBytes, totalBytes } from '@/lib/speaking/media';

// GELISIM: bir odagin kayitlarini tarih tarih goster. Her kayit: varyasyon +
// puan + saat + geri-dinle + sil. Ustte toplam depolama. "Gun gun gelisim"i
// puan ve kayit sayisi uzerinden gorursun. (Video sonraki surumde.)
export default function SpeakingProgress() {
  const { focus: focusId } = useLocalSearchParams<{ focus?: string }>();
  const focus = useMemo(() => getSpeakingFocus(focusId), [focusId]);

  const [takes, setTakes] = useState<SpeakingTake[]>([]);
  const [bytes, setBytes] = useState(0);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const player = useAudioPlayer(null);

  const varLabel = useMemo(() => {
    const m: Record<string, string> = {};
    focus?.variations.forEach((v) => (m[v.key] = v.typeLabel));
    return m;
  }, [focus]);

  const load = useCallback(() => {
    if (!focus) return;
    const list = getSpeakingTakes(focus.id);
    setTakes(list);
    totalBytes(list.map((t) => t.audio_uri)).then(setBytes).catch(() => {});
  }, [focus]);

  useFocusEffect(
    useCallback(() => {
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
      load();
      return () => {
        try {
          player.pause();
        } catch {}
      };
    }, [load, player]),
  );

  // Oynatma bitince gostergeyi sifirla.
  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) setPlayingId(null);
    });
    return () => sub.remove();
  }, [player]);

  function togglePlay(t: SpeakingTake) {
    if (!t.audio_uri) return;
    if (playingId === t.id) {
      player.pause();
      setPlayingId(null);
      return;
    }
    try {
      player.replace(t.audio_uri);
      player.seekTo(0);
      player.play();
      setPlayingId(t.id);
    } catch {}
  }

  function remove(t: SpeakingTake) {
    deleteSpeakingTake(t.id);
    deleteTakeFiles([t.audio_uri, t.video_uri]).finally(() => load());
    if (playingId === t.id) {
      try {
        player.pause();
      } catch {}
      setPlayingId(null);
    }
  }

  // Gune gore grupla (yerel gun). Takes zaten created_at DESC.
  const groups = useMemo(() => {
    const out: { day: string; items: SpeakingTake[] }[] = [];
    for (const t of takes) {
      const day = new Date(t.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      const g = out[out.length - 1];
      if (g && g.day === day) g.items.push(t);
      else out.push({ day, items: [t] });
    }
    return out;
  }, [takes]);

  if (!focus) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errTitle}>Odak bulunamadı</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Geri dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headTitle} numberOfLines={1}>
          {focus.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{takes.length}</Text>
            <Text style={styles.summaryLabel}>kayıt</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{groups.length}</Text>
            <Text style={styles.summaryLabel}>gün</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryValue}>{humanBytes(bytes)}</Text>
            <Text style={styles.summaryLabel}>alan</Text>
          </View>
        </View>

        <Pressable
          style={styles.practiceBtn}
          onPress={() => router.replace(`/speaking-practice?focus=${encodeURIComponent(focus.id)}`)}>
          <Ionicons name="mic" size={18} color="#fff" />
          <Text style={styles.practiceText}>Yeni pratik</Text>
        </Pressable>

        {takes.length === 0 ? (
          <Text style={styles.empty}>Henüz kayıt yok. "Yeni pratik" ile başla.</Text>
        ) : null}

        {groups.map((g) => (
          <View key={g.day} style={styles.section}>
            <Text style={styles.dayLabel}>{g.day}</Text>
            {g.items.map((t) => {
              const playing = playingId === t.id;
              return (
                <View key={t.id} style={styles.row}>
                  <Pressable
                    style={[styles.playBtn, !t.audio_uri && styles.playBtnOff]}
                    onPress={() => togglePlay(t)}
                    disabled={!t.audio_uri}>
                    <Ionicons name={playing ? 'pause' : 'play'} size={18} color={t.audio_uri ? colors.accent : colors.muted} />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {t.text_en}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {varLabel[t.variation_key] ?? '—'} ·{' '}
                      {new Date(t.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      {t.video_uri ? ' · video' : ''}
                    </Text>
                  </View>
                  {t.score != null ? (
                    <View style={styles.scoreTag}>
                      <Text style={styles.scoreText}>%{t.score}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noScore}>puan yok</Text>
                  )}
                  <Pressable hitSlop={8} onPress={() => remove(t)} style={styles.delBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },

  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.xl, paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  headTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },

  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  summary: { flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: 'hidden' },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: space.md, gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.ink },
  summaryLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },

  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  practiceText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  section: { gap: space.sm },
  dayLabel: { fontSize: 13, fontWeight: '800', color: colors.muted, letterSpacing: 0.2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.sm,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnOff: { backgroundColor: colors.surface },
  rowText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  scoreTag: { backgroundColor: colors.tealSoft, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  scoreText: { fontSize: 12, fontWeight: '800', color: colors.teal },
  noScore: { fontSize: 11, color: colors.muted, fontStyle: 'italic' },
  delBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  empty: { fontSize: 14, color: colors.muted, paddingVertical: space.lg, textAlign: 'center' },

  errTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.xl },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
