import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Haptic = 'light' | 'medium' | 'heavy' | 'none';

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Basiliyken kuculme orani (varsayilan 0.96). */
  scaleTo?: number;
  /** Basinca dokunsal geri bildirim (varsayilan hafif). */
  haptic?: Haptic;
};

const IMPACT: Record<Exclude<Haptic, 'none'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/**
 * Basinca hafifce kuculen (scale) + dokunsal geri bildirim veren Pressable.
 * Tum uygulamada tutarli dokunma hissi icin standart buton sarmalayicisi.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.96,
  haptic = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 130 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic !== 'none' && !disabled && Platform.OS !== 'web') {
          Haptics.impactAsync(IMPACT[haptic]).catch(() => {});
        }
        onPress?.(e);
      }}
      style={[animStyle, style]}>
      {children}
    </AnimatedPressable>
  );
}
