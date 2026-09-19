import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { TripProvider, useTrip } from '@/components/TripContext';
import { useColors } from '@/hooks/useColors';
import { getCurrentSession } from '@/services/authService';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const { status, tripActive } = useTrip();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getCurrentSession();
      const authenticated = session !== null;
      setIsAuthenticated(authenticated);
      setAuthChecked(true);

      const inAuthGroup = segments[0] === '(auth)';

      if (!authenticated && !inAuthGroup) {
        // Not logged in and not in auth screens → send to login
        router.replace('/(auth)/login');
      } else if (authenticated && inAuthGroup) {
        // Logged in but still on auth screens → send to main app
        router.replace('/(tabs)');
      }
    };
    void checkAuth();
  // Run once on mount — segments is not included in deps intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Emergency navigation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tripActive) return;
    if (status === 'ALERT' && pathname !== '/alert') router.replace('/alert');
    if (status === 'EMERGENCY' && pathname !== '/emergency') router.replace('/emergency');
  }, [pathname, router, status, tripActive]);

  if (!authChecked) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="alert" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="emergency" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="summary" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}


function RootBackground({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TripProvider>
            <GestureHandlerRootView style={styles.container}>
              <RootBackground>
                <RootLayoutNav />
              </RootBackground>
            </GestureHandlerRootView>
          </TripProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});



