/**
 * AuthField — input field for the deep-navy auth screens.
 * Matches the landing page's electric-blue / navy language.
 */

import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  showToggle?: boolean;
} & React.ComponentProps<typeof TextInput>;

export const AuthField = forwardRef<TextInput, Props>(function AuthField(
  { label, icon, showToggle, secureTextEntry, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const isSecure = showToggle ? !visible : secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Feather name={icon} size={16} color={focused ? '#60A5FA' : '#93C5FD'} />
        <TextInput
          ref={ref}
          {...rest}
          secureTextEntry={isSecure}
          placeholderTextColor="rgba(147, 197, 253, 0.55)"
          style={styles.input}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        />
        {showToggle ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={10}>
            <Feather name={visible ? 'eye-off' : 'eye'} size={17} color="#93C5FD" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 52,
    backgroundColor: 'rgba(15, 30, 75, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.28)',
  },
  fieldFocused: {
    borderColor: '#60A5FA',
    backgroundColor: 'rgba(15, 30, 75, 0.9)',
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    paddingVertical: 10,
  },
});

export default AuthField;
