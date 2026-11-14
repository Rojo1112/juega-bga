import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Loading } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SessionProvider, useSession } from '@/lib/session';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
    <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="partido/nuevo" options={{ title: 'Armar partido', presentation: 'modal' }} />
        <Stack.Screen name="partido/[id]" options={{ title: 'Partido' }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat' }} />
        <Stack.Screen name="jugador/[id]" options={{ title: 'Jugador' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="legal/[doc]" options={{ title: 'Legal' }} />
    </Stack>
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
