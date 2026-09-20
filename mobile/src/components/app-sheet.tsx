import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/constants/appTheme';

/**
 * Yukseklik varyanti:
 * - 'auto'  : icerik kadar (kompakt). Ekranin %90'ini gecmez.
 * - 'half'  : ekranin yarisi.
 * - 'full'  : neredeyse tam ekran (ust bosluk birakir).
 * - {fraction}: ekranin verilen orani (0..1).
 * - {height}: sabit piksel yuksekligi.
 */
export type SheetHeight = 'auto' | 'half' | 'full' | { fraction: number } | { height: number };

// Acilis: hafif yayli (spring). Kapanis: kisa timing (fade + kayma birlikte).
const SPRING = { damping: 24, stiffness: 260, mass: 0.9 } as const;
const FADE_MS = 200;
const CLOSE_MS = 220;
// Swipe ile kapanma esigi: bu kadar asagi surukle YA DA bu hizi gec.
const DRAG_CLOSE_PX = 120;
const DRAG_CLOSE_VELOCITY = 900;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type AppSheetProps = {
  /** Sheet acik mi. */
  visible: boolean;
  /** Kapatma (disari dokun / swipe / geri tusu) cagrisi. */
  onClose: () => void;
  /** Ust baslik (opsiyonel). */
  title?: string;
  /** Yukseklik varyanti. Varsayilan: 'auto' (icerik kadar). */
  height?: SheetHeight;
  /** Uzun icerik icin govdeyi kaydirilabilir yapar. */
  scrollable?: boolean;
  /** Backdrop'a dokununca kapansin mi. Varsayilan: true. */
  dismissible?: boolean;
  /** Alta sabitlenen aksiyon alani (kaydirma disinda kalir). */
  footer?: ReactNode;
  /** true: sheet'in HERHANGI bir yerinden asagi cekince kapanir (yalniz handle degil).
   *  Bu modda govde kaydirilmaz (kompakt/auto sheet'ler icin). Dokunuslar (buton) calisir. */
  dragAnywhere?: boolean;
  children: ReactNode;
  /** Eski API uyumu icin durur; artik height ile yonetiliyor. */
  snapPoints?: unknown;
};

/**
 * Alttan acilan modal (bottom sheet). Reanimated ile:
 * - Backdrop (arka karartma) AYRI fade-in yapar; sheet ile birlikte yukari kaymaz.
 * - Sheet spring ile asagidan yukari suzulur, asagi swipe ile kapanir.
 * Sade RN Modal + Reanimated; @expo/ui'ye bagli degil.
 */
export function AppSheet({
  visible,
  onClose,
  title,
  height = 'auto',
  scrollable = false,
  dismissible = true,
  footer,
  dragAnywhere = false,
  children,
}: AppSheetProps) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Cikis animasyonu bitene kadar Modal'i acik tutmak icin ic durum.
  const [mounted, setMounted] = useState(visible);

  const translateY = useSharedValue(screenH); // sheet'in dikey konumu (0 = tam acik)
  const progress = useSharedValue(0); // backdrop opakligi (0..1)
  const dragStart = useSharedValue(0);

  const finishClose = useCallback(() => setMounted(false), []);

  // Disaridan gelen `visible` degisimini izle: acilista mount et, kapanista cikis oynat.
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      translateY.value = withTiming(screenH, { duration: CLOSE_MS });
      progress.value = withTiming(0, { duration: CLOSE_MS }, (fin) => {
        'worklet';
        if (fin) scheduleOnRN(finishClose);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Mount olunca giris animasyonunu baslat (asagidan yukari + fade-in).
  useEffect(() => {
    if (!mounted) return;
    translateY.value = screenH;
    progress.value = 0;
    translateY.value = withSpring(0, SPRING);
    progress.value = withTiming(1, { duration: FADE_MS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Asagi surukleyerek kapatma. activeOffsetY(10): yalniz ~10px asagi cekiste devreye
  // girer; boylece ic butonlara dokunma (tap) ve yukari hareketler pan'i tetiklemez.
  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onStart(() => {
      dragStart.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStart.value + e.translationY;
      // Yukari cekmeye direnc goster (lastik hissi), asagi serbest.
      translateY.value = next < 0 ? next * 0.15 : next;
      // Suruklendikce backdrop hafifce silinsin.
      const damp = Math.max(0, 1 - Math.max(0, next) / (screenH * 0.6));
      progress.value = damp;
    })
    .onEnd((e) => {
      const shouldClose = e.translationY > DRAG_CLOSE_PX || e.velocityY > DRAG_CLOSE_VELOCITY;
      if (shouldClose) {
        scheduleOnRN(onClose); // cikis animasyonunu visible-effect yurutur
      } else {
        translateY.value = withSpring(0, SPRING);
        progress.value = withTiming(1, { duration: FADE_MS });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const sizeStyle = resolveSize(height, screenH);
  const bodyPadBottom = insets.bottom + (footer ? space.md : space.xxl);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <AnimatedPressable
          style={[styles.backdrop, backdropStyle]}
          onPress={dismissible ? onClose : undefined}
        />

        <Animated.View style={[styles.sheet, sizeStyle, sheetStyle]}>
          {(() => {
            const grab = (
              <View style={styles.grabArea}>
                <View style={styles.handle} />
                {title ? <Text style={styles.title}>{title}</Text> : null}
              </View>
            );
            // dragAnywhere: govde kaydirilmaz (pan ile cakismasin); aksi halde scrollable'a uy.
            const useScroll = scrollable && !dragAnywhere;
            const body = useScroll ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[styles.body, { paddingBottom: bodyPadBottom }]}
                showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.body, { paddingBottom: bodyPadBottom }]}>{children}</View>
            );

            return dragAnywhere ? (
              // Tum sheet (baslik + govde) suruklenebilir alan.
              <GestureDetector gesture={pan}>
                <View style={styles.flex}>
                  {grab}
                  {body}
                </View>
              </GestureDetector>
            ) : (
              // Yalniz tutamac/baslik suruklenebilir.
              <>
                <GestureDetector gesture={pan}>{grab}</GestureDetector>
                {body}
              </>
            );
          })()}

          {footer ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>{footer}</View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Yukseklik varyantini somut stile cevirir. */
function resolveSize(height: SheetHeight, screenH: number) {
  const cap = { maxHeight: Math.round(screenH * 0.92) };
  if (height === 'auto') return { maxHeight: Math.round(screenH * 0.9) };
  if (height === 'half') return { height: Math.round(screenH * 0.5), ...cap };
  if (height === 'full') return { height: Math.round(screenH * 0.92) };
  if ('fraction' in height) return { height: Math.round(screenH * height.fraction), ...cap };
  return { height: height.height, ...cap };
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  flex: { flexGrow: 0, flexShrink: 1 },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  grabArea: {
    paddingTop: space.md,
    paddingHorizontal: space.lg,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.lineStrong,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.md,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: space.sm,
  },
});
