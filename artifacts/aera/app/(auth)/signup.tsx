/**
 * Sign Up — AERA
 *
 * Fields: Name, Email, Password.
 * Primary Create Account → mock signup then Sign In screen.
 * Footer → (auth)/login
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
import { signUp, confirmSignUp, resendConfirmationCode, mapCognitoError } from '@/services/authService';

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [success, setSuccess] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [fade, rise]);

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in required fields.');
      return;
    }
    if (phone.trim() && !/^\+[1-9]\d{1,14}$/.test(phone.trim())) {
      setError('Phone number must be in E.164 format (e.g. +919876543210).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, name.trim(), phone.trim() || undefined);
      setShowConfirm(true);
    } catch (err: unknown) {
      setError(mapCognitoError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmCode.trim()) {
      setError('Please enter the verification code from your email.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(email.trim().toLowerCase(), confirmCode.trim());
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 1500));
      router.replace('/(auth)/login');
    } catch (err: unknown) {
      setError(mapCognitoError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendConfirmationCode(email.trim().toLowerCase());
      setError('');
    } catch (err: unknown) {
      setError(mapCognitoError(err));
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
            <Mascot pose="wink" size={128} />
            <Text style={styles.title}>{showConfirm ? 'Verify your email' : 'Create your account'}</Text>
            <Text style={styles.subtitle}>
              {showConfirm ? `We sent a code to ${email}` : "Let's get you protected."}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: fade, transform: [{ translateY: rise }] }]}>
            {error ? (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={14} color="#FCA5A5" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.errorBanner}>
                <Feather name="check-circle" size={14} color="#86EFAC" />
                <Text style={[styles.errorText, { color: '#86EFAC' }]}>Account verified! Redirecting…</Text>
              </View>
            ) : null}

            {!showConfirm ? (
              <>
                <AuthField
                  label="FULL NAME"
                  icon="user"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
                <AuthField
                  ref={emailRef}
                  label="EMAIL"
                  icon="mail"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => phoneRef.current?.focus()}
                />
                <AuthField
                  ref={phoneRef}
                  label="PHONE NUMBER (OPTIONAL)"
                  icon="phone"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+919876543210"
                  keyboardType="phone-pad"
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
                  placeholder="At least 8 characters"
                  showToggle
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSignup()}
                />

                <PrimaryButton
                  label={loading ? 'Creating…' : 'Create Account'}
                  onPress={() => void handleSignup()}
                  loading={loading}
                  style={styles.ctaSpacing}
                />
              </>
            ) : (
              <>
                <AuthField
                  label="VERIFICATION CODE"
                  icon="hash"
                  value={confirmCode}
                  onChangeText={setConfirmCode}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleConfirm()}
                />

                <PrimaryButton
                  label={loading ? 'Verifying…' : 'Verify Email'}
                  onPress={() => void handleConfirm()}
                  loading={loading}
                  style={styles.ctaSpacing}
                />

                <Pressable onPress={() => void handleResendCode()} style={{ alignItems: 'center', paddingTop: 8 }}>
                  <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '600' }}>Resend code</Text>
                </Pressable>
              </>
            )}
          </Animated.View>

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Already have an account? </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}>Sign In</Text>
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
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

  ctaSpacing: { marginTop: 4 },

  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerMuted: { color: '#93C5FD', fontSize: 14 },
  footerLink: { color: '#60A5FA', fontSize: 15, fontWeight: '700' },
});
