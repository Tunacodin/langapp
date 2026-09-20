import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Dairesel ilerleme (ring). 12 yönünden başlar, saat yönünde dolar.
// Ortadaki içeriği (yüzde metni vb.) children ile ver.
export function ProgressRing({
  size = 48,
  strokeWidth = 5,
  progress,
  color,
  trackColor = '#EBEBEB',
  children,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress || 0));
  const offset = circ * (1 - clamped);
  const c = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      {children}
    </View>
  );
}
