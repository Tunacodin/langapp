import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { H1, Lead, SectionLabel } from '@/components/ui';
import { colors, radius, space } from '@/constants/appTheme';
import { getDueCards, reviewCard, SrsCardRow } from '@/lib/db';
import { previewIntervals, RATINGS } from '@/lib/srs';

export default function PracticeScreen() {
  const [queue, setQueue] = useState<SrsCardRow[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setQueue(getDueCards());
  }, []);

  const card = queue[0];
  const intervals = card ? previewIntervals(card.card_json) : null;

  function answer(grade: (typeof RATINGS)[number]['grade']) {
    if (!card) return;
    reviewCard(card.id, grade);
    setRevealed(false);
    setQueue((q) => q.slice(1));
  }

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <SectionLabel>Tekrar</SectionLabel>
        <H1>Öbek tekrarı</H1>
        <Lead>Aralıklı tekrar (FSRS): doğru bildiğin seyrek, zorlandığın sık gelir.</Lead>
      </View>

      {!card ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Şu an vakti gelen kart yok. Video sekmesinde bir öbeğe basıp SRS'e ekle.
          </Text>
        </View>
      ) : (
        <View style={{ gap: space.lg }}>
          <View style={styles.card}>
            <Text style={styles.badge}>{card.front_type}</Text>
            <Text style={styles.front}>{card.front_en}</Text>
            {revealed ? <Text style={styles.back}>{card.back_tr}</Text> : null}
          </View>

          {!revealed ? (
            <Pressable style={styles.showBtn} onPress={() => setRevealed(true)}>
              <Text style={styles.showBtnText}>Cevabı göster</Text>
            </Pressable>
          ) : (
            <View style={styles.ratingRow}>
              {RATINGS.map((r) => (
                <Pressable key={r.grade} style={styles.rating} onPress={() => answer(r.grade)}>
                  <Text style={styles.ratingLabel}>{r.label}</Text>
                  <Text style={styles.ratingWhen}>{intervals?.[r.grade]}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.left}>Kuyrukta {queue.length} kart</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  emptyText: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
    minHeight: 160,
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingVertical: 3,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
  },
  front: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  back: { fontSize: 18, color: colors.muted },
  showBtn: {
    backgroundColor: colors.accent,
    paddingVertical: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  showBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  ratingRow: { flexDirection: 'row', gap: space.sm },
  rating: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    paddingVertical: space.md,
    alignItems: 'center',
    gap: 2,
  },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  ratingWhen: { fontSize: 11, color: colors.muted },
  left: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
