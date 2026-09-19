/**
 * Sign In — Cognisafe-Q
 *
 * Deep-navy overlay matching the Batch 1 landing theme.
 * Fields: Email, Password.
 * Forgot Password link → (auth)/forgot-password
 * Primary Sign In → (tabs)
 * Footer Sign Up → (auth)/signup
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '@/components/AuthField';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { signIn, mapCognitoError } from '@/services/authService';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Entrance
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fade, rise]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const friendly = mapCognitoError(err);
      setError(friendly);
      if ((err as { code?: string })?.code === 'UserNotConfirmedException') {
        setError('Please verify your email first. Check your inbox for the confirmation code.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={require('@/assets/backgrounds/main_theme.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['rgba(4,13,36,0.55)', 'rgba(4,13,36,0.78)', 'rgba(4,13,36,0.92)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable onPress={() => router.replace('/')} hitSlop={12} style={styles.backRow}>
            <Feather name="chevron-left" size={22} color="#DBEAFE" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          {/* Mascot + heading */}
          <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: rise }] }]}>
            <Mascot pose="wave" size={128} />
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.subtitle}>Sign in to keep every journey safe.</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: rise }] }]}>
            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FCA5A5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AuthField
              label="EMAIL"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <AuthField
              ref={passwordRef}
              label="PASSWORD"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              showToggle
              returnKeyType="done"
              onSubmitEditing={() => void handleLogin()}
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              hitSlop={8}
              style={styles.forgotRow}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

            <PrimaryButton
              label={loading ? 'Signing in…' : 'Sign In'}
              onPress={() => void handleLogin()}
              loading={loading}
              style={styles.ctaSpacing}
            />
          </Animated.View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('/(auth)/signup')} hitSlop={8}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#040D24' },
  scroll: { paddingHorizontal: 24, gap: 18 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { color: '#DBEAFE', fontSize: 15, fontWeight: '600' },

  header: { alignItems: 'center', gap: 8, marginTop: 4 },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: { color: '#DBEAFE', fontSize: 14, textAlign: 'center' },

  card: {
    gap: 14,
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(8, 20, 55, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.20)',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  errorText: { color: '#FCA5A5', fontSize: 13, flex: 1 },

  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { color: '#60A5FA', fontSize: 13, fontWeight: '700' },

  ctaSpacing: { marginTop: 4 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerMuted: { color: '#93C5FD', fontSize: 14 },
  footerLink: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
});
