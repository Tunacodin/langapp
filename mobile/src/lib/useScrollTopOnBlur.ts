import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { ScrollView } from 'react-native';

// Tab ekranlari varsayilan olarak mount kalir; React Navigation v7'de unmountOnBlur
// yok. Bu hook, ekrandan cikilirken (blur) kok ScrollView'i basa sarar. Boylece
// tab'a geri donuldugunde her zaman en bastan (tepeden) gorunur, kalinan yer tutulmaz.
export function useScrollTopOnBlur() {
  const ref = useRef<ScrollView>(null);
  useFocusEffect(
    useCallback(() => {
      return () => {
        ref.current?.scrollTo?.({ y: 0, animated: false });
      };
    }, []),
  );
  return ref;
}
