import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/appTheme';

type SnapPoint = 'half' | 'full' | { fraction: number } | { height: number };

type AppSheetProps = {
  /** Sheet acik mi. */
  visible: boolean;
  /** Kapatma / disari dokununca cagrilir. */
  onClose: () => void;
  /** Ust baslik (opsiyonel). */
  title?: string;
  /** Yukseklik duraklari (bu sade RN uygulamasinda yok sayilir). */
  snapPoints?: SnapPoint[];
  children: ReactNode;
};

/**
 * Airbnb tarzi alttan acilan modal. Sade RN Modal ile (SDK'lar arasi surprizsiz).
 * Not: @expo/ui'ye bagli degil; snapPoints prop'u API uyumlulugu icin durur.
 */
export function AppSheet({ visible, onClose, title, children }: AppSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: space.xxl,
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
});
