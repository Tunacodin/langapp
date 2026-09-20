import { ReactNode, useEffect } from 'react';
import { DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, radius, space } from '@/constants/appTheme';

// Yukleme iskeleti (skeleton): icerik gelene kadar ayni yerlesimde gri nabiz atan
// bloklar gosterir. Amac: veri sonradan geldiginde ekranin YERLESIMI degismesin
// (bir anlik bos ekran / zıplama hissi olmasin). Sadece opaklik animasyonu (UI
// thread'inde ucuz), boyutlar sabit -> kendisi layout kaymasi yaratmaz.

const BASE = '#ECECEE'; // acik gri blok (beyaz zemin uzerinde belli belirsiz)

export function Skeleton({
  width = '100%',
  height = 14,
  radius: r = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const o = useSharedValue(0.55);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: BASE }, anim, style]} />;
}

// Tek metin satiri iskeleti (varsayilan yukseklik = normal metin gibi).
export function SkeletonText({ width = '100%', height = 12 }: { width?: DimensionValue; height?: number }) {
  return <Skeleton width={width} height={height} radius={radius.sm} />;
}

// Basit dikey grup: aralikli bloklar.
export function SkeletonBlock({ gap = space.sm, style, children }: { gap?: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
