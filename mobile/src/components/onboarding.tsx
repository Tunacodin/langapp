import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { colors, radius, space } from '@/constants/appTheme';
import { setSetting } from '@/lib/db';

type Slide = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };
const SLIDES: Slide[] = [
  {
    icon: 'film-outline',
    title: 'Yapay cümleleri unut, gerçek hayattan öğren',
    body: 'Otantik videolardan, konuşmacıların ağzından çıkan gerçek cümle ve kalıpları çalış.',
  },
  {
    icon: 'mic-outline',
    title: 'Whisper AI ile Shadowing',
    body: 'Cümleyi sesli tekrar et; telaffuzunu ve ritmini gerçek zamanlı ölç.',
  },
  {
    icon: 'repeat-outline',
    title: 'FSRS ile kalıcı bellek',
    body: 'Öğrendiğini unutmadan hemen önce tekrar et; aralıklı tekrar en verimli anı seçer.',
  },
];

type Level = { code: string; title: string; desc: string; rec?: boolean };
const LEVELS: Level[] = [
  { code: 'A1', title: 'Başlangıç', desc: 'Temel selamlaşma ve çok basit günlük ifadeler.' },
  { code: 'A2', title: 'Temel', desc: 'Basit rutinler, alışveriş ve tanıdık konular.' },
  { code: 'B1', title: 'Orta Seviye', desc: 'Seyahat ve kişisel ilgi alanlarında akıcı iletişim.' },
  { code: 'B2', title: 'Orta-İleri', desc: 'Otantik video ve tartışmaları anlama, teknik konular.', rec: true },
  { code: 'C1', title: 'İleri Düzey', desc: 'Akıcı, esnek ve profesyonel/akademik kullanım.' },
  { code: 'C2', title: 'Anadil Düzeyinde', desc: 'Karmaşık nüansları ve deyimleri zahmetsiz kavrama.' },
];

// Ilk acilis akisi: 3 adimli tanitim + seviye secimi. Bitince app_meta'ya yazar.
export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0); // 0..2 slaytlar, 3 seviye
  const [level, setLevel] = useState('B2');
  const isLevel = step === 3;

  function finish() {
    setSetting('level', level);
    setSetting('onboarded', '1');
    onDone();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      {/* Ust: ilerleme noktalari + Atla */}
      <View style={styles.top}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>
        <Pressable onPress={finish} hitSlop={8}>
          <Text style={styles.skip}>Atla</Text>
        </Pressable>
      </View>

      {isLevel ? (
        <LevelSelector level={level} onPick={setLevel} />
      ) : (
        <View style={styles.slide}>
          <View style={styles.iconWrap}>
            <Ionicons name={SLIDES[step].icon} size={44} color={colors.accent} />
          </View>
          <Text style={styles.slideTitle}>{SLIDES[step].title}</Text>
          <Text style={styles.slideBody}>{SLIDES[step].body}</Text>
        </View>
      )}

      {/* Alt aksiyon */}
      <View style={styles.footer}>
        <PressableScale style={styles.cta} haptic="medium" onPress={() => (isLevel ? finish() : setStep((s) => s + 1))}>
          <Text style={styles.ctaText}>{isLevel ? `${level} Seviyesi ile Başla` : 'Devam Et'}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function LevelSelector({ level, onPick }: { level: string; onPick: (c: string) => void }) {
  return (
    <View style={styles.levelWrap}>
      <Text style={styles.levelHead}>Şu anki İngilizce seviyeniz nedir?</Text>
      <Text style={styles.levelSub}>İçerikleri seviyenizin bir adım üstünde (i+1) seçeriz.</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {LEVELS.map((l) => {
          const on = l.code === level;
          return (
            <Pressable key={l.code} style={[styles.levelRow, on && styles.levelRowOn]} onPress={() => onPick(l.code)}>
              <View style={[styles.levelCode, on && styles.levelCodeOn]}>
                <Text style={[styles.levelCodeText, on && { color: '#fff' }]}>{l.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.levelTitleRow}>
                  <Text style={styles.levelTitle}>{l.title}</Text>
                  {l.rec ? <Text style={styles.recBadge}>Önerilen</Text> : null}
                </View>
                <Text style={styles.levelDesc}>{l.desc}</Text>
              </View>
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={on ? colors.accent : colors.line}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 4, borderRadius: radius.pill, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.accent },
  skip: { fontSize: 14, fontWeight: '700', color: colors.muted },

  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl, gap: space.lg },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideTitle: { fontSize: 26, fontWeight: '800', color: colors.ink, textAlign: 'center', letterSpacing: -0.5, lineHeight: 32 },
  slideBody: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22 },

  levelWrap: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.sm },
  levelHead: { fontSize: 22, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  levelSub: { fontSize: 13, color: colors.muted, marginBottom: space.sm },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: space.md,
  },
  levelRowOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  levelCode: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCodeOn: { backgroundColor: colors.accent },
  levelCodeText: { fontSize: 14, fontWeight: '800', color: colors.ink },
  levelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  levelTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  recBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accent,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  levelDesc: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },

  footer: { paddingHorizontal: space.xl, paddingTop: space.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: space.lg,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
