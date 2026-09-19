/**
 * Signup Screen — COGNISAFE-Q
 * Premium account creation. Same brand language as Login.
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
import { signUp, confirmSignUp, resendConfirmationCode, mapCognitoError } from '@/services/authService';



export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const btnAnim = useRef(new Animated.Value(1)).current;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('All fields except confirm password are required.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    Animated.spring(btnAnim, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim(), phone.trim() || undefined);
      setShowConfirm(true); // Show email verification step
    } catch (err: unknown) {
      setError(mapCognitoError(err));
    } finally {
      setLoading(false);
      Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true }).start();
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
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={18} color={colors.text3} />
          <Text style={[styles.backText, { color: colors.text3 }]}>Back</Text>
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

          {/* Contextual sub-header for this screen */}
          <View style={styles.screenHeadingRow}>
            <Text style={[styles.screenTitle, { color: colors.text1 }]}>
              Create Account
            </Text>
            <Text style={[styles.screenSub, { color: colors.text3 }]}>
              Join Cognisafe-Q and drive protected
            </Text>
          </View>
        </Animated.View>

        {/* ── Success banner ── */}
        {success && (
          <View
            style={[
              styles.successBanner,
              { backgroundColor: colors.safeBackground, borderColor: colors.safeBorder },
            ]}
          >
            <Feather name="check-circle" size={15} color={colors.safe} />
            <Text style={[styles.successText, { color: colors.safe }]}>
              Account created. Redirecting to sign in…
            </Text>
          </View>
        )}

        {/* ── Error ── */}
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

        {/* ── Form ── */}
        {!showConfirm ? (
          <GlassCard style={styles.formCard}>
            <AuthField
              label="FULL NAME"
              icon="user"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Alex Johnson"
              autoCapitalize="words"
              returnKeyType="next"
              colors={colors}
            />
            <AuthField
              label="EMAIL"
              icon="mail"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              colors={colors}
            />
            <AuthField
              label="PHONE NUMBER"
              icon="phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              returnKeyType="next"
              colors={colors}
            />
            <AuthField
              label="PASSWORD"
              icon="lock"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              secureTextEntry={!showPassword}
              returnKeyType="next"
              colors={colors}
              rightElement={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={17}
                    color={colors.text3}
                  />
                </Pressable>
              }
            />
            <AuthField
              label="CONFIRM PASSWORD"
              icon="lock"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={() => void handleSignup()}
              colors={colors}
            />

            <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
              <Pressable
                onPress={() => void handleSignup()}
                disabled={loading || success}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.brandBlue, borderColor: colors.brandBlue },
                  (loading || success) && styles.disabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Creating Account…' : 'CREATE ACCOUNT'}
                </Text>
                {!loading && (
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                )}
              </Pressable>
            </Animated.View>
          </GlassCard>
        ) : (
          /* ── Email Verification Step ── */
          <GlassCard style={styles.formCard}>
            <View style={{ gap: 4, marginBottom: 4 }}>
              <Text style={[styles.screenTitle, { color: colors.text1, fontSize: 18 }]}>
                Verify your email
              </Text>
              <Text style={[styles.tagline, { color: colors.text3 }]}>
                We sent a 6-digit code to {email}
              </Text>
            </View>
            <AuthField
              label="VERIFICATION CODE"
              icon="hash"
              value={confirmCode}
              onChangeText={setConfirmCode}
              placeholder="6-digit code"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={() => void handleConfirm()}
              colors={colors}
            />
            <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
              <Pressable
                onPress={() => void handleConfirm()}
                disabled={loading}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.brandBlue, borderColor: colors.brandBlue },
                  loading && styles.disabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {loading ? 'Verifying…' : 'VERIFY EMAIL'}
                </Text>
                {!loading && <Feather name="check" size={16} color="#FFFFFF" />}
              </Pressable>
            </Animated.View>
            <Pressable onPress={() => void handleResendCode()} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: colors.brandBlue, fontSize: 13, fontWeight: '600' }}>
                Resend code
              </Text>
            </Pressable>
          </GlassCard>
        )}

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.text3 }]}>
            Already have an account?
          </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.loginLink, { color: colors.brandBlue }]}>
              {' '}Sign in
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.assurance,
            { backgroundColor: colors.safeBackground, borderColor: colors.safeBorder },
          ]}
        >
          <Feather name="shield" size={13} color={colors.safe} />
          <Text style={[styles.assuranceText, { color: colors.safe }]}>
            Passwords secured by AWS Cognito — never stored locally
          </Text>
        </View>
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
    rightElement?: React.ReactNode;
    colors: ReturnType<typeof useColors>;
  } & React.ComponentProps<typeof TextInput>
>(function AuthFieldInner({ label, icon, rightElement, colors, ...props }, ref) {
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
        {rightElement}
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
    paddingBottom: 24,
  },
  accentRule: {
    width: 32,
    height: 2,
    marginBottom: 16,
    borderRadius: 1,
  },
  logo: {
    width: 72,
    height: 72,
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
    marginBottom: 20,
  },
  screenHeadingRow: {
    alignItems: 'center',
    gap: 3,
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
  },

  // ── Banners ──
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
    marginBottom: 20,
  },
  loginText: { fontSize: 13 },
  loginLink: { fontSize: 13, fontWeight: '700' },

  // ── Assurance ──
  assurance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'center',
  },
  assuranceText: { fontSize: 11, fontWeight: '500', flex: 1 },
});
