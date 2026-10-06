import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type TextStyle } from 'react-native';

import { colors, fonts, MIN_TOUCH, radius, spacing } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Web only: hides the browser's focus outline (the box below shows focus instead). React Native's
// types leave out 'none', but react-native-web passes it straight to CSS; native ignores it.
const NO_OUTLINE = { outlineStyle: 'none' } as unknown as TextStyle;

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  icon?: IconName;
  error?: string;
  hint?: string;
  /** Hides the value and adds a show/hide toggle. */
  secret?: boolean;
}

export function TextField({ label, icon, error, hint, secret = false, editable = true, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, error ? styles.boxError : null, !editable && styles.boxDisabled]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? colors.accent : colors.textMuted} /> : null}
        <TextInput
          {...input}
          editable={editable}
          accessibilityLabel={label}
          secureTextEntry={secret && hidden}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={styles.input}
        />
        {secret ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading },
  box: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.inputFill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  boxFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
  boxError: { borderColor: colors.danger },
  boxDisabled: { opacity: 0.6 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: spacing.sm + 4, ...NO_OUTLINE },
  error: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
