import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/constants/appTheme';
import { ActiveFocus, getActiveFocus } from '@/lib/db';

// Kalici ODAK ROZETI: aktif odak (bir gramer konusu) her sekmenin ustunde
// gorunur. Odak yoksa hicbir sey cizmez (sekmeler serbest kalir). Dokununca o
// konunun modulune (yol haritasi) doner. Ekrana her donuste tazelenir.
export function FocusBadge() {
  const [focus, setFocus] = useState<ActiveFocus | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFocus(getActiveFocus());
    }, []),
  );

  if (!focus) return null;

  return (
    <Pressable
      style={styles.badge}
      onPress={() =>
        router.push(
          `/grammar-topic?key=${encodeURIComponent(focus.key)}&title=${encodeURIComponent(focus.label)}`,
        )
      }>
      <View style={styles.dot}>
        <Ionicons name="locate" size={13} color="#fff" />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        Odak: {focus.label}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.pill,
    paddingLeft: 4,
    paddingRight: space.md,
    paddingVertical: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.ink },
});
