import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { scoreColor } from '@/components/speak-practice';
import { colors, radius, space } from '@/constants/appTheme';
import { addSrsCard } from '@/lib/db';
import { WordScore } from '@/lib/pronunciation';
import { getLastAssessment } from '@/lib/shadowingStore';

// Akustik & Fonetik analiz detayi. Veriler GERCEK (Azure telaffuz degerlendirmesi):
// genel/dogruluk/akicilik/eslesme + kelime bazli dogruluk. Dalga formu ve pitch
// egrisi bu surumde YOK (sinyal analizi verisi uretmiyoruz) - uydurma gostermiyoruz.
export default function AnalysisScreen() {
  const data = getLastAssessment();
  const [added, setAdded] = useState(false);

  if (!data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <Header onAdd={undefined} added={false} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Analiz için önce bir kayıt yap.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { sentence, tr, result } = data;
  const grade = letterGrade(result.pron);

  function addSentence() {
    addSrsCard({ front_type: 'sentence', front_en: sentence, back_tr: tr });
    setAdded(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Header onAdd={addSentence} added={added} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hedef cumle + vurgu haritasi (kelime bazli renk) */}
        <View style={styles.card}>
          <Text style={styles.label}>HEDEF CÜMLE & VURGU HARİTASI</Text>
          <Text style={styles.sentence}>
            {result.words.map((w, i) => (
              <Text key={i} style={{ color: scoreColor(w.accuracy) }}>
                {w.word}{' '}
              </Text>
            ))}
          </Text>
          {tr ? <Text style={styles.tr}>{tr}</Text> : null}
        </View>

        {/* Genel skor */}
        <View style={styles.card}>
          <View style={styles.overallRow}>
            <View>
              <Text style={styles.label}>AKUSTİK DOĞRULUK</Text>
              <Text style={[styles.bigScore, { color: scoreColor(result.pron) }]}>%{result.pron}</Text>
            </View>
            <View style={[styles.gradeBox, { borderColor: scoreColor(result.pron) }]}>
              <Text style={[styles.grade, { color: scoreColor(result.pron) }]}>{grade}</Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <Metric label="Doğruluk" value={result.accuracy} />
            <View style={styles.metricDivider} />
            <Metric label="Akıcılık" value={result.fluency} />
            <View style={styles.metricDivider} />
            <Metric label="Eşleşme" value={result.matchPct} />
          </View>
          {result.recognized ? <Text style={styles.heard}>Duyulan: {result.recognized}</Text> : null}
        </View>

        {/* Kelime bazli fonetik */}
        <View style={styles.card}>
          <Text style={styles.label}>KELİME BAZLI ARTİKÜLASYON</Text>
          <View style={{ gap: space.xs, marginTop: space.sm }}>
            {result.words.map((w, i) => (
              <WordRow key={i} w={w} />
            ))}
          </View>
        </View>

        {/* Durust not: elimizde olmayan analizler */}
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={styles.noteText}>
            Dalga formu karşılaştırması ve pitch (ton) eğrisi bu sürümde yok; skorlar Whisper/Azure telaffuz
            değerlendirmesinden gelir.
          </Text>
        </View>

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          <Pressable style={styles.ghost} onPress={() => router.back()}>
            <Ionicons name="refresh" size={18} color={colors.ink} />
            <Text style={styles.ghostText}>Yeniden Kaydet</Text>
          </Pressable>
          <Pressable style={styles.filled} onPress={() => router.back()}>
            <Text style={styles.filledText}>Sonraki Cümle</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onAdd, added }: { onAdd?: () => void; added: boolean }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.ink} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>Akustik & Fonetik Analiz</Text>
      </View>
      {onAdd ? (
        <Pressable style={styles.addBtn} onPress={onAdd} disabled={added}>
          <Ionicons name={added ? 'checkmark' : 'add'} size={16} color={added ? colors.good : colors.accent} />
          <Text style={[styles.addText, added && { color: colors.good }]}>{added ? 'Eklendi' : 'FSRS Ekle'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: scoreColor(value) }]}>%{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function WordRow({ w }: { w: WordScore }) {
  const ok = w.errorType === 'None';
  return (
    <View style={styles.wordRow}>
      <Ionicons name={ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={scoreColor(w.accuracy)} />
      <Text style={styles.wordText}>{w.word}</Text>
      {!ok ? <Text style={styles.wordErr}>{errLabel(w.errorType)}</Text> : null}
      <View style={{ flex: 1 }} />
      <Text style={[styles.wordPct, { color: scoreColor(w.accuracy) }]}>%{Math.round(w.accuracy)}</Text>
    </View>
  );
}

function letterGrade(v: number) {
  if (v >= 90) return 'A+';
  if (v >= 80) return 'A';
  if (v >= 70) return 'B';
  if (v >= 60) return 'C';
  return 'D';
}
function errLabel(t: string) {
  if (t === 'Omission') return 'atlandı';
  if (t === 'Insertion') return 'fazladan';
  if (t === 'Mispronunciation') return 'hatalı';
  return t.toLowerCase();
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addText: { fontSize: 12, fontWeight: '800', color: colors.accent },

  content: { padding: space.xl, gap: space.md, paddingBottom: space.xxl },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  label: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 0.5 },
  sentence: { fontSize: 20, fontWeight: '700', lineHeight: 30 },
  tr: { fontSize: 14, color: colors.muted, lineHeight: 20 },

  overallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigScore: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  gradeBox: { width: 56, height: 56, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  grade: { fontSize: 24, fontWeight: '800' },
  metrics: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: space.md },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricDivider: { width: 1, height: 28, backgroundColor: colors.line },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 11, color: colors.muted },
  heard: { fontSize: 12, color: colors.muted },

  wordRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  wordText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  wordErr: { fontSize: 11, color: colors.danger, fontWeight: '700' },
  wordPct: { fontSize: 14, fontWeight: '800' },

  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingHorizontal: space.xs },
  noteText: { flex: 1, fontSize: 12, color: colors.muted, lineHeight: 18 },

  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
  },
  ghostText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  filled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  filledText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  emptyText: { fontSize: 14, color: colors.muted },
});
