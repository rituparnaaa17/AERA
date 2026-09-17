/**
 * Login Screen — Premium branded entry experience
 * Cognisafe-Q authentication with AWS Cognito
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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const btnAnim = useRef(new Animated.Value(1)).current;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    Animated.spring(btnAnim, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
    // TODO: Replace with actual Cognito signIn when credentials are provided
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    Animated.spring(btnAnim, { toValue: 1, useNativeDriver: true }).start();
    // Placeholder: navigate to tabs (real auth will gate this via AuthContext)
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand ── */}
        <View style={styles.brandSection}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brandName, { color: colors.text1 }]}>Cognisafe-Q</Text>
          <Text style={[styles.brandTagline, { color: colors.text3 }]}>
            Safety that watches over every journey.
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.text1 }]}>Welcome back</Text>
          <Text style={[styles.formSub, { color: colors.text3 }]}>Sign in to your account</Text>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: '#FFF0F0', borderColor: '#FFCCCC' }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <AuthField
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            colors={colors}
          />

          <AuthField
            ref={passwordRef}
            label="Password"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!showPassword}
            returnKeyType="done"
            onSubmitEditing={() => void handleLogin()}
            colors={colors}
            rightElement={
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.text3} />
              </Pressable>
            }
          />

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
          </Pressable>

          <Animated.View style={{ transform: [{ scale: btnAnim }] }}>
            <Pressable
              onPress={() => void handleLogin()}
              disabled={loading}
              style={[styles.loginBtn, { backgroundColor: colors.primary }, loading && styles.disabled]}
            >
              {loading ? (
                <Text style={styles.loginBtnText}>Signing in…</Text>
              ) : (
                <>
                  <Text style={styles.loginBtnText}>SIGN IN</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Sign up link ── */}
        <View style={styles.signupRow}>
          <Text style={[styles.signupText, { color: colors.text3 }]}>Don't have an account?</Text>
          <Pressable onPress={() => router.push('/(auth)/signup')}>
            <Text style={[styles.signupLink, { color: colors.primary }]}> Create account</Text>
          </Pressable>
        </View>

        {/* ── Safety assurance ── */}
        <View style={[styles.assurance, { backgroundColor: '#F0FBF5', borderColor: colors.safeBorder }]}>
          <Feather name="shield" size={14} color={colors.safe} />
          <Text style={[styles.assuranceText, { color: colors.safe }]}>
            Protected by AWS Cognito · End-to-end encrypted
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Auth Field ───────────────────────────────────────────────────────────────

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
            backgroundColor: colors.background,
            borderColor: focused ? colors.primary : colors.input,
            borderWidth: focused ? 2 : 1.5,
          },
        ]}
      >
        <Feather name={icon} size={17} color={focused ? colors.primary : colors.text3} />
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
  content: { paddingHorizontal: 24, gap: 20 },

  brandSection: { alignItems: 'center', gap: 8, marginBottom: 10 },
  logo: { width: 80, height: 80 },
  brandName: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  brandTagline: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  formCard: { borderRadius: 28, borderWidth: 1.5, padding: 24, gap: 14 },
  formTitle: { fontSize: 22, fontWeight: '800' },
  formSub: { fontSize: 14, marginTop: -8 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  errorText: { fontSize: 13, flex: 1 },

  field: { gap: 7 },
  fieldLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, minHeight: 52 },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 12 },

  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: '600' },

  loginBtn: { minHeight: 58, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  disabled: { opacity: 0.6 },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '700' },

  assurance: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 12, justifyContent: 'center' },
  assuranceText: { fontSize: 12, fontWeight: '500' },
});
