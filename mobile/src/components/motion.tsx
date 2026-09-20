import { MotiView } from 'moti';
import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

type AppearProps = {
  children: ReactNode;
  /** Gecikme (ms). Ard arda ogeleri kademeli (stagger) getirmek icin kullan. */
  delay?: number;
  /** Asagidan yukari kayma miktari (px). Varsayilan 10. */
  offset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Mount olunca hafifce yukari suzulup beliren (fade + rise) sarmalayici.
 * Ekran ve liste ogelerine tutarli giris animasyonu verir. moti + reanimated.
 */
export function Appear({ children, delay = 0, offset = 10, style }: AppearProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: offset }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 320, delay }}
      style={style}>
      {children}
    </MotiView>
  );
}
