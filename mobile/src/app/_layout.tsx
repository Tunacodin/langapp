import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { setupDb } from '@/lib/db';

SplashScreen.preventAutoHideAsync();

// Tasarım kuralı: koyu tema yok. Cihaz koyu modda olsa bile açık tema sabit.
export default function RootLayout() {
  // Yerel veritabanini kur + ders verisini seed et (idempotent).
  useEffect(() => {
    setupDb();
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
