import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/constants/appTheme';

type Opt = { key: string; label: string };

// Duz metin geçiş (chip/pill degil): aktif olan aksan renginde + alti cizili.
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.row}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={styles.item} hitSlop={6}>
            <Text style={[styles.label, on && styles.labelOn]}>{o.label}</Text>
            <View style={[styles.bar, on && styles.barOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xl, borderBottomWidth: 1, borderBottomColor: colors.line },
  item: { paddingBottom: space.sm, gap: space.sm },
  label: { fontSize: 15, fontWeight: '700', color: colors.muted },
  labelOn: { color: colors.ink },
  bar: { height: 2, backgroundColor: 'transparent' },
  barOn: { backgroundColor: colors.accent },
});
