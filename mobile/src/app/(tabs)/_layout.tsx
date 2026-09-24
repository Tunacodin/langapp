import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { colors } from '@/constants/appTheme';

// 5 beceri sekmesi: Dinleme / Okuma / Konusma / Dil Bilgisi / Profil.
// - index    = Dinleme (video izle/dinle)
// - okuma    = Okuma (seviyene uygun metinler)   [/reading root makale ekraniyle
//              cakismasin diye rota adi 'okuma']
// - shadowing= Konusma (sesli taklit kutuphanesi) [dosya adi Faz 4'te speaking olur]
// - grammar  = Dil Bilgisi (gramer cekirdegi) [dosya adi Faz 4'te patterns olur]
// - review   = Tekrar; artik sekme DEGIL (href:null ile bardan gizli) ama /review
//              rotasi calisir; Faz 3'te "Bugun" seridinden acilir.
// Detay ekranlari (player, item, grammar-*, vb.) kok Stack'te (bkz. app/_layout.tsx).
export default function TabsLayout() {
  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dinleme',
          tabBarIcon: ({ color, size }) => <Ionicons name="headset-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="okuma"
        options={{
          title: 'Okuma',
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shadowing"
        options={{
          title: 'Konuşma',
          tabBarIcon: ({ color, size }) => <Ionicons name="mic-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grammar"
        options={{
          title: 'Dil Bilgisi',
          tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Tekrar: bardan gizli ama /review rotasi calisir (bildirimden acilir). */}
      <Tabs.Screen name="review" options={{ href: null }} />
    </Tabs>
  );
}
