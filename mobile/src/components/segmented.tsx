import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/appTheme';

type Opt = { key: string; label: string };

// iOS tarzi segmented control: gri iz uzerinde esit genislikte bolmeler; secili
// bolmeyi beyaz, hairline kenarli bir kutu isaretler ve secim degisince kayar.
// Golge yok (flat). Saf JS: native bagimlilik gerektirmez (OTA ile gider).
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string;
  onChange: (key: string) => void;
}) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const x = useRef(new Animated.Value(idx)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: idx, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  }, [idx, x]);

  const segW = w > 0 ? (w - PAD * 2) / options.length : 0;

  return (
    <View style={styles.track} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {segW > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { width: segW, transform: [{ translateX: Animated.multiply(x, segW) }] },
          ]}
        />
      ) : null}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={styles.item} hitSlop={4}>
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 3;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: PAD,
    height: 42,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, fontWeight: '700', color: colors.muted },
  labelOn: { color: colors.ink, fontWeight: '800' },
});
