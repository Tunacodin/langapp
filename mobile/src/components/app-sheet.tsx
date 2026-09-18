import { BottomSheet, Host } from '@expo/ui';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/constants/appTheme';

type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

type AppSheetProps = {
  /** Sheet acik mi. */
  visible: boolean;
  /** Kapatma / disari dokununca cagrilir. */
  onClose: () => void;
  /** Ust baslik (opsiyonel). */
  title?: string;
  /**
   * Yukseklik duraklari. Verilmezse icerige gore otomatik boyutlanir.
   * Ornek: ['half', 'full'] veya [{ fraction: 0.4 }].
   */
  snapPoints?: SnapPoint[];
  children: ReactNode;
};

/**
 * Airbnb tarzi, yerel (native) bottom sheet modal.
 * iOS'ta SwiftUI, Android'de Jetpack Compose, web'de vaul ile calisir.
 * @expo/ui uzerine kurulu: RN yerine tek agac, platform ayrimi yok.
 */
export function AppSheet({ visible, onClose, title, snapPoints, children }: AppSheetProps) {
  return (
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={snapPoints}
        containerColor={colors.bg}>
        <View style={styles.body}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </View>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.md,
    paddingBottom: space.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.4,
  },
});
