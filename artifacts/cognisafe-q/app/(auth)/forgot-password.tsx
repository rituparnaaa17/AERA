/**
 * Forgot Password Screen — Two-step Cognito reset flow
 */

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useRef } from 'react';
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

  const sendCode = async () => {
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);
    Animated.spring(btnAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
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
    Animated.spring(btnAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
    // TODO: Call Cognito confirmForgotPassword(email, code, newPassword)
    await new Promise((r) => setTimeout(r, 1400));
    setLoading(false);
    Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true }).start();
    setSuccess(true);
    await new Promise((r) => setTimeout(r, 1800));
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => (step === 2 ? setStep(1) : router.back())} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.text2} />
          <Text style={[styles.backText, { color: colors.text2 }]}>{step === 2 ? 'Back' : 'Login'}</Text>
        </Pressable>

        <View style={styles.brandSection}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text1 }]}>Reset Password</Text>
          <Text style={[styles.sub, { color: colors.text3 }]}>
            {step === 1
              ? "Enter your email and we'll send a reset code"
              : `Code sent to ${email}. Enter it below.`}
          </Text>
        </View>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: s <= step ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {success && (
          <View style={[styles.successBanner, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
            <Feather name="check-circle" size={16} color={colors.safe} />
            <Text style={[styles.successText, { color: colors.safe }]}>Password reset successful! Redirecting to login…</Text>
          </View>
        )}

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {step === 1 ? (
            <>
              <AuthField label="Email Address" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" returnKeyType="done" onSubmitEditing={() => void sendCode()} colors={colors} />
              <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
                <Pressable onPress={() => void sendCode()} disabled={loading} style={[styles.actionBtn, { backgroundColor: colors.primary }, loading && styles.disabled]}>
                  <Text style={styles.actionBtnText}>{loading ? 'Sending code…' : 'SEND RESET CODE'}</Text>
                  {!loading && <Feather name="send" size={17} color="#FFFFFF" />}
                </Pressable>
              </Animated.View>
            </>
          ) : (
            <>
              <AuthField label="Verification Code" icon="hash" value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="number-pad" returnKeyType="next" colors={colors} />
              <AuthField label="New Password" icon="lock" value={newPassword} onChangeText={setNewPassword} placeholder="Min. 8 characters" secureTextEntry returnKeyType="next" colors={colors} />
              <AuthField label="Confirm New Password" icon="lock" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry returnKeyType="done" onSubmitEditing={() => void resetPassword()} colors={colors} />
              <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
                <Pressable onPress={() => void resetPassword()} disabled={loading || success} style={[styles.actionBtn, { backgroundColor: colors.primary }, (loading || success) && styles.disabled]}>
                  <Text style={styles.actionBtnText}>{loading ? 'Resetting…' : 'RESET PASSWORD'}</Text>
                  {!loading && <Feather name="check" size={17} color="#FFFFFF" />}
                </Pressable>
              </Animated.View>
            </>
          )}
        </View>

        <Pressable onPress={() => router.replace('/(auth)/login')} style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.text3 }]}>Remember your password? </Text>
          <Text style={[styles.loginLink, { color: colors.primary }]}>Sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AuthField = React.forwardRef<
  TextInput,
  { label: string; icon: React.ComponentProps<typeof Feather>['name']; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>
>(function AuthFieldInner({ label, icon, colors, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{label}</Text>
      <View style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: focused ? colors.primary : colors.input, borderWidth: focused ? 2 : 1.5 }]}>
        <Feather name={icon} size={17} color={focused ? colors.primary : colors.text3} />
        <TextInput ref={ref} {...props} placeholderTextColor={colors.text4} style={[styles.fieldInput, { color: colors.text1 }]} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  brandSection: { alignItems: 'center', gap: 8, marginBottom: 4 },
  logo: { width: 60, height: 60 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  stepIndicator: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  stepDot: { width: 28, height: 5, borderRadius: 3 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  errorText: { fontSize: 13, flex: 1 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  successText: { fontSize: 13, flex: 1, fontWeight: '500' },
  formCard: { borderRadius: 28, borderWidth: 1.5, padding: 24, gap: 14 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  actionBtn: { minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  disabled: { opacity: 0.6 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
});
