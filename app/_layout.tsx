import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/features/twitter/AuthProvider';
import { useTwitterTheme } from '@/features/twitter/theme';
import { Button, Notice, styles } from '@/features/twitter/ui';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthenticatedRoutes />
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function AuthenticatedRoutes() {
  const { ready, session, bootError, retry } = useAuth();
  const t = useTwitterTheme();
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: t.background, justifyContent: 'center' }}>
        <ActivityIndicator color={t.tint} />
      </View>
    );
  if (bootError)
    return (
      <View style={[styles.empty, { flex: 1, backgroundColor: t.background }]}>
        <Notice text={bootError} />
        <Button onPress={retry}>Повторить</Button>
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack.Protected>
    </Stack>
  );
}
