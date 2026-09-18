import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/constants/appTheme';

// Tüm ekranların ortak dış kabuğu: açık zemin + güvenli alan + kaydırma.
// bleedTop: üst güvenli alan boşluğunu kaldırır (içerik statüs çubuğu altına uzanır).
export function Screen({
  children,
  scroll = true,
  bleedTop = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  bleedTop?: boolean;
}) {
  const edges = bleedTop ? (['left', 'right'] as const) : (['top', 'left', 'right'] as const);
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: space.xl,
    gap: space.lg,
  },
});
