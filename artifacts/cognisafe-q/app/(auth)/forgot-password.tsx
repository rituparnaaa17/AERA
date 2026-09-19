/**
 * Forgot Password — Cognisafe-Q
 *
 * Field: Email.
 * Primary Reset Password → mock request then back to Sign In.
 * "Back to Sign In" link.
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
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthField } from '@/components/AuthField';
import { Mascot } from '@/components/Mascot';
import { PrimaryButton } from '@/components/PrimaryButton';
import { forgotPassword, mapCognitoError } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fade, rise]);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: unknown) {
      setError(mapCognitoError(err));
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
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
            <Feather name="chevron-left" size={22} color="#DBEAFE" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: rise }] }]}>
            <Mascot pose="thinking" size={128} />
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset link.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: rise }] }]}>
            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FCA5A5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View style={styles.successBanner}>
                <Feather name="check-circle" size={16} color="#86EFAC" />
                <Text style={styles.successText}>
                  If an account exists for {email.trim()}, a reset link is on its way.
                </Text>
              </View>
            ) : (
              <AuthField
                label="EMAIL"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => void handleReset()}
              />
            )}

            <PrimaryButton
              label={loading ? 'Sending…' : sent ? 'Back to Sign In' : 'Reset Password'}
              onPress={() => (sent ? router.replace('/(auth)/login') : void handleReset())}
              loading={loading}
              style={styles.ctaSpacing}
            />
          </Animated.View>

          <View style={styles.footerRow}>
            <Feather name="arrow-left" size={14} color="#60A5FA" />
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}>Back to Sign In</Text>
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
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitle: { color: '#DBEAFE', fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },

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

  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  successText: { color: '#BBF7D0', fontSize: 13, flex: 1, lineHeight: 18 },

  ctaSpacing: { marginTop: 4 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  footerLink: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
});
