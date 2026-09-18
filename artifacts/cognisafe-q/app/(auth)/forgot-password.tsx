/**
 * Forgot Password Screen — COGNISAFE-Q
 * Two-step Cognito reset flow. Same brand language as Login/Signup.
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GlassCard } from '@/components/AppPrimitives';


export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const btnAnim = useRef(new Animated.Value(1)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const sendCode = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    Animated.spring(btnAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
    // TODO: Call Cognito forgotPassword(email)
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true }).start();
    setStep(2);
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPassword) { setError('Please enter the verification code and new password.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    Animated.spring(btnAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
    // TODO: Call Cognito confirmForgotPassword(email, code, newPassword)
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true }).start();
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 1800));
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: 'transparent' }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back ── */}
        <Pressable
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          style={styles.backRow}
        >
          <Feather name="arrow-left" size={18} color={colors.text3} />
          <Text style={[styles.backText, { color: colors.text3 }]}>
            {step === 2 ? 'Back' : 'Sign in'}
          </Text>
        </Pressable>

        {/* ── Brand Header ── */}
        <Animated.View
          style={[
            styles.brandSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={[styles.accentRule, { backgroundColor: colors.brandCyan }]} />

          <Image
            source={require('@/assets/images/cognisafe-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={[styles.wordmark, { color: colors.text1 }]}>
            COGNISAFE-Q
          </Text>
          <Text style={[styles.tagline, { color: colors.text3 }]}>
            Intelligent safety for every journey.
          </Text>

          {/* Contextual sub-header */}
          <View style={styles.screenHeadingRow}>
            <Text style={[styles.screenTitle, { color: colors.text1 }]}>
              Reset Password
            </Text>
            <Text style={[styles.screenSub, { color: colors.text3 }]}>
              {step === 1
                ? "Enter your email and we'll send a reset code"
                : `Code sent to ${email}. Enter it below.`}
            </Text>
          </View>
        </Animated.View>

        {/* ── Step indicator ── */}
        <View style={styles.stepIndicator}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                {
                  backgroundColor: s <= step ? colors.brandBlue : colors.border,
                  width: s === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* ── Banners ── */}
        {error ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' },
            ]}
          >
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {success && (
          <View
            style={[
              styles.successBanner,
              { backgroundColor: colors.safeBackground, borderColor: colors.safeBorder },
            ]}
          >
            <Feather name="check-circle" size={15} color={colors.safe} />
            <Text style={[styles.successText, { color: colors.safe }]}>
              Password reset successful. Redirecting to sign in…
            </Text>
          </View>
        )}

        {/* ── Form Card ── */}
        <GlassCard style={styles.formCard}>
          {step === 1 ? (
            <>
              <AuthField
                label="EMAIL ADDRESS"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={() => void sendCode()}
                colors={colors}
              />
              <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
                <Pressable
                  onPress={() => void sendCode()}
                  disabled={loading}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.brandBlue, borderColor: colors.brandBlue },
                    loading && styles.disabled,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Sending code…' : 'SEND RESET CODE'}
                  </Text>
                  {!loading && (
                    <Feather name="send" size={15} color="#FFFFFF" />
                  )}
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <>
              <AuthField
                label="VERIFICATION CODE"
                icon="hash"
                value={code}
                onChangeText={setCode}
                placeholder="6-digit code"
                keyboardType="number-pad"
                returnKeyType="next"
                colors={colors}
              />
              <AuthField
                label="NEW PASSWORD"
                icon="lock"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Min. 8 characters"
                secureTextEntry
                returnKeyType="next"
                colors={colors}
              />
              <AuthField
                label="CONFIRM NEW PASSWORD"
                icon="lock"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={() => void resetPassword()}
                colors={colors}
              />
              <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
                <Pressable
                  onPress={() => void resetPassword()}
                  disabled={loading || success}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: colors.brandBlue, borderColor: colors.brandBlue },
                    (loading || success) && styles.disabled,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? 'Resetting…' : 'RESET PASSWORD'}
                  </Text>
                  {!loading && (
                    <Feather name="check" size={15} color="#FFFFFF" />
                  )}
                </Pressable>
              </Animated.View>
            </>
          )}
        </GlassCard>

        <Pressable
          onPress={() => router.replace('/(auth)/login')}
          style={styles.loginRow}
        >
          <Text style={[styles.loginText, { color: colors.text3 }]}>
            Remember your password?{' '}
          </Text>
          <Text style={[styles.loginLink, { color: colors.brandBlue }]}>
            Sign in
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Auth Field ─────────────────────────────────────────────────────────────


const AuthField = React.forwardRef<
  TextInput,
  {
    label: string;
    icon: React.ComponentProps<typeof Feather>['name'];
    colors: ReturnType<typeof useColors>;
  } & React.ComponentProps<typeof TextInput>
>(function AuthFieldInner({ label, icon, colors, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{label}</Text>
      <View
        style={[
          styles.fieldRow,
          {
            backgroundColor: 'transparent',
            borderColor: focused ? colors.brandBlue : colors.input,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        <Feather
          name={icon}
          size={16}
          color={focused ? colors.brandBlue : colors.text4}
        />
        <TextInput
          ref={ref}
          {...props}
          placeholderTextColor={colors.text4}
          style={[styles.fieldInput, { color: colors.text1 }]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 0 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  backText: { fontSize: 14, fontWeight: '500' },

  // ── Brand ──
  brandSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  accentRule: {
    width: 32,
    height: 2,
    marginBottom: 16,
    borderRadius: 1,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 14,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 5,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 0.2,
    lineHeight: 17,
    marginBottom: 18,
  },
  screenHeadingRow: {
    alignItems: 'center',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 16,
    width: '100%',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  screenSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Step indicator ──
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },

  // ── Banners ──
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 11,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, flex: 1 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  successText: { fontSize: 13, flex: 1, fontWeight: '500' },

  // ── Form Card ──
  formCard: {
    gap: 13,
    marginBottom: 20,
  },

  // ── Fields ──
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 13,
    minHeight: 48,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },

  // ── Primary Button ──
  primaryBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  disabled: { opacity: 0.55 },

  // ── Login link ──
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  loginText: { fontSize: 13 },
  loginLink: { fontSize: 13, fontWeight: '700' },
});
