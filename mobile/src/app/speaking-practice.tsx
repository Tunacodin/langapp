import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';
import { addSpeakingTake, updateSpeakingTakeMedia } from '@/lib/db';
import { getSpeakingFocus } from '@/lib/speaking';
import { persistTakeAudio } from '@/lib/speaking/media';
import { useSpeechAssessment } from '@/lib/useSpeechAssessment';

// KONUSMA PRATIGI (v1 - ses): bir odagin varyasyonlarini tek tek calis.
// Her varyasyon icin: Dinle (TTS) -> mikrofonla kaydet -> Azure telaffuz puani.
// Her PUANLI kayit bir "take" olarak DB'ye yazilir (gelisim puan uzerinden gorunur).
// Video + medya replay bir sonraki surumde (expo-file-system + expo-camera).
export default function SpeakingPractice() {
  const { focus: focusId } = useLocalSearchParams<{ focus?: string }>();
  const focus = useMemo(() => getSpeakingFocus(focusId), [focusId]);

  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [takes, setTakes] = useState(0);

  const cur = focus?.variations[idx];
  const { status, result, error, listen, toggleRecord, reset, lastUri } = useSpeechAssessment(cur?.en ?? '');

  // Kayit tamamlaninca (lastUri) take olustur + sesi KALICI sakla. Azure ayarli
  // olmasa da kayit saklanir (puan sonra gelirse ayni take'e yazilir).
  const takeIdRef = useRef<number | null>(null);
  const savedUriRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focus || !cur || !lastUri || lastUri === savedUriRef.current) return;
    savedUriRef.current = lastUri;
    const id = addSpeakingTake({ focus_id: focus.id, variation_key: cur.key, text_en: cur.en, score: null });
    takeIdRef.current = id;
    setTakes((t) => t + 1);
    persistTakeAudio(focus.id, id, lastUri)
      .then((dest) => updateSpeakingTakeMedia(id, { audio_uri: dest }))
      .catch(() => {});
  }, [lastUri, focus, cur]);

  // Puan gelince ayni take'e yaz.
  useEffect(() => {
    if (result && takeIdRef.current != null) {
      updateSpeakingTakeMedia(takeIdRef.current, { score: Math.round(result.pron) });
    }
  }, [result]);

  if (!focus || !cur) {
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

  const total = focus.variations.length;
  const last = idx >= total - 1;

  function advance() {
    // Kayit zaten useEffect'te saklandi; bu buton yalniz sirayi ilerletir / bitirir.
    reset();
    savedUriRef.current = null;
    takeIdRef.current = null;
    if (last) setDone(true);
    else setIdx((i) => i + 1);
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          <Text style={styles.doneTitle}>Pratik tamam</Text>
          <Text style={styles.doneSub}>
            {focus.title} · bu turda {takes} kayıt aldın
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace(`/speaking-progress?focus=${encodeURIComponent(focus.id)}`)}>
            <Text style={styles.primaryText}>Kayıtları gör</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Bitir</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Ust bar: kapat + ilerleme */}
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
        <Text style={styles.headCount}>
          {idx + 1} / {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${(idx / total) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Odak baglami */}
        <View style={styles.focusCard}>
          <Text style={styles.focusKicker}>ODAK · {focus.focusEn}</Text>
          <Text style={styles.focusBase}>{focus.base.en}</Text>
          <Text style={styles.focusBaseTr}>{focus.base.tr}</Text>
        </View>

        {/* Hedef varyasyon */}
        <View style={styles.card}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{cur.typeLabel}</Text>
          </View>
          <Text style={styles.targetEn}>{cur.en}</Text>
          <Text style={styles.targetTr}>{cur.tr}</Text>
          {cur.tip ? (
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={15} color={colors.warning} />
              <Text style={styles.tipText}>{cur.tip}</Text>
            </View>
          ) : null}

          <Pressable style={styles.listenBtn} onPress={() => listen()}>
            <Ionicons name="volume-high" size={18} color={colors.accent} />
            <Text style={styles.listenText}>Dinle</Text>
          </Pressable>
        </View>

        {/* Kayit + sonuc */}
        <View style={styles.recWrap}>
          <Pressable
            style={[styles.micBtn, status === 'recording' && styles.micBtnOn]}
            onPress={toggleRecord}
            disabled={status === 'assessing'}>
            <Ionicons
              name={status === 'recording' ? 'stop' : 'mic'}
              size={30}
              color={status === 'recording' ? '#fff' : colors.accent}
            />
          </Pressable>
          <Text style={styles.micHint}>
            {status === 'recording'
              ? 'Durdurmak için bas'
              : status === 'assessing'
                ? 'Değerlendiriliyor...'
                : 'Söyle: mikrofona bas ve cümleyi seslendir'}
          </Text>

          {result ? (
            <View style={styles.scoreCard}>
              <View style={styles.scoreRow}>
                <ScorePill label="Telaffuz" value={Math.round(result.pron)} tint={colors.accent} />
                <ScorePill label="Doğruluk" value={Math.round(result.accuracy)} tint={colors.teal} />
                <ScorePill label="Eşleşme" value={result.matchPct} tint={colors.success} />
              </View>
              {result.recognized ? (
                <Text style={styles.recognized} numberOfLines={2}>
                  Duyulan: {result.recognized}
                </Text>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={styles.errText}>{error}</Text> : null}
        </View>
      </ScrollView>

      {/* Alt: ilerlet */}
      <View style={styles.footer}>
        <Pressable style={styles.footBtn} onPress={() => advance()}>
          <Text style={styles.footBtnText}>{last ? 'Bitir' : 'Sıradaki'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ScorePill({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <View style={styles.scorePill}>
      <Text style={[styles.scoreValue, { color: tint }]}>%{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },

  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md },
  headCount: { fontSize: 13, fontWeight: '800', color: colors.muted },
  track: { height: 3, backgroundColor: colors.surface, marginTop: space.md },
  trackFill: { height: 3, backgroundColor: colors.accent },

  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },

  focusCard: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: 4, backgroundColor: colors.surface },
  focusKicker: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.6 },
  focusBase: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 4 },
  focusBaseTr: { fontSize: 13, color: colors.muted },

  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  typeBadgeText: { fontSize: 12, fontWeight: '800', color: colors.accent },
  targetEn: { fontSize: 22, fontWeight: '800', color: colors.ink, lineHeight: 29, letterSpacing: -0.3 },
  targetTr: { fontSize: 15, color: colors.muted },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FFF8E6', borderRadius: radius.sm, padding: space.sm, marginTop: space.xs },
  tipText: { flex: 1, fontSize: 12, color: colors.ink, lineHeight: 17 },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  listenText: { fontSize: 15, fontWeight: '800', color: colors.accent },

  recWrap: { alignItems: 'center', gap: space.md },
  micBtn: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  micHint: { fontSize: 13, color: colors.muted, textAlign: 'center' },

  scoreCard: { width: '100%', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.md, gap: space.sm },
  scoreRow: { flexDirection: 'row', gap: space.sm },
  scorePill: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, paddingVertical: space.sm, gap: 2 },
  scoreValue: { fontSize: 20, fontWeight: '800' },
  scoreLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  recognized: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },

  errText: { fontSize: 12, color: colors.danger, textAlign: 'center' },

  footer: { padding: space.xl, borderTopWidth: 1, borderTopColor: colors.line },
  footBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: space.lg,
  },
  footBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  errTitle: { fontSize: 18, fontWeight: '800', color: colors.ink },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  doneSub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.xl, marginTop: space.sm },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { paddingVertical: space.sm, paddingHorizontal: space.xl },
  secondaryText: { color: colors.muted, fontWeight: '700', fontSize: 14 },
});
