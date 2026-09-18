import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppSheet, SheetHeight } from '@/components/app-sheet';
import { colors, radius, space } from '@/constants/appTheme';

export type SheetStep = {
  /** Adim basligi (sheet ust basligi olarak gosterilir). */
  title?: string;
  /** Adim govdesi. */
  content: ReactNode;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  steps: SheetStep[];
  /** Son adimda "Bitir"e basilinca. Verilmezse onClose cagrilir. */
  onDone?: () => void;
  /** Yukseklik varyanti. Adimlar farkli boyda ise 'half'/sabit yukseklik onerilir. */
  height?: SheetHeight;
  backLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
};

// Adim degisiminde yeni icerik yandan suzulup belirir (adimli gecis).
const SLIDE_PX = 44;
const TRANS_MS = 240;

/**
 * Adimli (stepper) bottom sheet. Ust kisimda ilerleme cubugu + adim sayaci,
 * altta Geri / Ileri (son adimda Bitir) butonlari. Adimlar arasi yatay gecis.
 */
export function SheetStepper({
  visible,
  onClose,
  steps,
  onDone,
  height = 'auto',
  backLabel = 'Geri',
  nextLabel = 'İleri',
  doneLabel = 'Bitir',
}: Props) {
  const [step, setStep] = useState(0);
  const dir = useRef(1); // 1 = ileri, -1 = geri (gecis yonu)

  const tx = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Sheet her acildiginda ilk adima don.
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  // Adim degistikce yeni icerigi yon'e gore yandan getir + fade-in.
  useEffect(() => {
    tx.value = dir.current * SLIDE_PX;
    opacity.value = 0;
    tx.value = withTiming(0, { duration: TRANS_MS });
    opacity.value = withTiming(1, { duration: TRANS_MS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const current = steps[step];

  const goNext = () => {
    if (isLast) {
      (onDone ?? onClose)();
      return;
    }
    dir.current = 1;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => {
    if (isFirst) return;
    dir.current = -1;
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      title={current?.title}
      height={height}
      footer={
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.btnGhost, isFirst && styles.btnDisabled]}
            disabled={isFirst}
            onPress={goBack}>
            <Text style={[styles.btnGhostText, isFirst && styles.btnDisabledText]}>{backLabel}</Text>
          </Pressable>
          <Pressable style={styles.btnFilled} onPress={goNext}>
            <Text style={styles.btnFilledText}>{isLast ? doneLabel : nextLabel}</Text>
          </Pressable>
        </View>
      }>
      {/* Ilerleme: segmentli cubuk + adim sayaci */}
      <View style={styles.progress}>
        <View style={styles.track}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.segment, i <= step && styles.segmentOn]} />
          ))}
        </View>
        <Text style={styles.counter}>
          {step + 1} / {steps.length}
        </Text>
      </View>

      <Animated.View style={contentStyle}>{current?.content}</Animated.View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flexDirection: 'row', flex: 1, gap: 4 },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  segmentOn: { backgroundColor: colors.accent },
  counter: { fontSize: 13, fontWeight: '700', color: colors.muted },
  footerRow: { flexDirection: 'row', gap: space.sm },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: { color: colors.ink, fontWeight: '700' },
  btnDisabled: { borderColor: colors.line },
  btnDisabledText: { color: colors.line },
  btnFilled: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilledText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
