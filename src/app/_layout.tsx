import { Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { Unbounded_500Medium, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Loading } from '@/components/ui';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SessionProvider, useSession } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const NavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
    border: Colors.border,
    text: Colors.text,
    primary: Colors.primary,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [Fonts.display]: Unbounded_500Medium,
    [Fonts.displayBold]: Unbounded_700Bold,
    [Fonts.body]: Manrope_500Medium,
    [Fonts.bodySemi]: Manrope_600SemiBold,
    [Fonts.bodyBold]: Manrope_700Bold,
  });

  // El splash sigue visible hasta tener las fuentes; si fallan, se sigue con las del sistema.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={NavigationTheme}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (!isSupabaseConfigured) return <SetupNeeded />;
  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
        headerStyle: { backgroundColor: Colors.background },
        headerShadowVisible: false,
        headerTintColor: Colors.text,
        headerTitleStyle: { fontFamily: Fonts.display, fontSize: 16 },
      }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="partido/nuevo" options={{ title: 'Armar partido', presentation: 'modal' }} />
        <Stack.Screen name="partido/[id]" options={{ title: 'Partido' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="jugador/[id]" options={{ title: 'Jugador' }} />
        <Stack.Screen name="cancha/[id]" options={{ title: 'Reservar cancha' }} />
        <Stack.Screen name="reservas" options={{ title: 'Mis reservas' }} />
        <Stack.Screen name="sedes/index" options={{ title: 'Mis sedes' }} />
        <Stack.Screen name="sedes/[id]" options={{ title: 'Sede' }} />
        <Stack.Screen name="admin" options={{ title: 'Administración' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="legal/[doc]" options={{ title: 'Legal' }} />    </Stack>
  );
}

function SetupNeeded() {
  const theme = useTheme();
  return (
    <View style={[styles.setup, { backgroundColor: theme.background }]}>
      <ThemedText type="subtitle">Falta conectar Supabase</ThemedText>
      <ThemedText themeColor="textSecondary">
        Copia .env.example como .env.local, pega la URL y la llave publicable de tu proyecto de
        Supabase, y vuelve a iniciar la app.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  setup: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
