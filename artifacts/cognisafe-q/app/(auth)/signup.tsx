/**
 * Signup Screen — Premium account creation
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
  const btnAnim = useRef(new Animated.Value(1)).current;

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
    Animated.spring(btnAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
    // TODO: Replace with actual Cognito signUp call
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
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back + Brand ── */}
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color={colors.text2} />
          <Text style={[styles.backText, { color: colors.text2 }]}>Back</Text>
        </Pressable>

        <View style={styles.brandSection}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brandName, { color: colors.text1 }]}>Create Account</Text>
          <Text style={[styles.brandSub, { color: colors.text3 }]}>
            Join Cognisafe-Q and drive protected
          </Text>
        </View>

        {/* ── Success banner ── */}
        {success && (
          <View style={[styles.successBanner, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
            <Feather name="check-circle" size={16} color={colors.safe} />
            <Text style={[styles.successText, { color: colors.safe }]}>Account created successfully! Redirecting to login…</Text>
          </View>
        )}

        {/* ── Error ── */}
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
            <Feather name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        {/* ── Form ── */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AuthField label="Full Name" icon="user" value={fullName} onChangeText={setFullName} placeholder="Alex Johnson" autoCapitalize="words" returnKeyType="next" colors={colors} />
          <AuthField label="Email" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" returnKeyType="next" colors={colors} />
          <AuthField label="Phone Number" icon="phone" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" returnKeyType="next" colors={colors} />
          <AuthField
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry={!showPassword}
            returnKeyType="next"
            colors={colors}
            rightElement={
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.text3} />
              </Pressable>
            }
          />
          <AuthField
            label="Confirm Password"
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
              style={[styles.signupBtn, { backgroundColor: colors.primary }, (loading || success) && styles.disabled]}
            >
              <Text style={styles.signupBtnText}>
                {loading ? 'Creating Account…' : 'CREATE ACCOUNT'}
              </Text>
              {!loading && <Feather name="arrow-right" size={18} color="#FFFFFF" />}
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: colors.text3 }]}>Already have an account?</Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={[styles.loginLink, { color: colors.primary }]}> Sign in</Text>
          </Pressable>
        </View>

        <View style={[styles.assurance, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
          <Feather name="shield" size={13} color={colors.safe} />
          <Text style={[styles.assuranceText, { color: colors.safe }]}>
            Passwords secured by AWS Cognito — never stored locally
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const AuthField = React.forwardRef<
  TextInput,
  { label: string; icon: React.ComponentProps<typeof Feather>['name']; rightElement?: React.ReactNode; colors: ReturnType<typeof useColors> } & React.ComponentProps<typeof TextInput>
>(function AuthFieldInner({ label, icon, rightElement, colors, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text3 }]}>{label}</Text>
      <View style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: focused ? colors.primary : colors.input, borderWidth: focused ? 2 : 1.5 }]}>
        <Feather name={icon} size={17} color={focused ? colors.primary : colors.text3} />
        <TextInput ref={ref} {...props} placeholderTextColor={colors.text4} style={[styles.fieldInput, { color: colors.text1 }]} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        {rightElement}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  brandSection: { alignItems: 'center', gap: 6, marginBottom: 6 },
  logo: { width: 64, height: 64 },
  brandName: { fontSize: 24, fontWeight: '800' },
  brandSub: { fontSize: 14, textAlign: 'center' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  successText: { fontSize: 13, flex: 1, fontWeight: '500' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  errorText: { fontSize: 13, flex: 1 },
  formCard: { borderRadius: 28, borderWidth: 1.5, padding: 24, gap: 14 },
  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  signupBtn: { minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  signupBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  disabled: { opacity: 0.6 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14, fontWeight: '700' },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, justifyContent: 'center' },
  assuranceText: { fontSize: 12, flex: 1 },
});
