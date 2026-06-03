import React, { useState, forwardRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing } from '../../constants/theme';

const Input = forwardRef(function Input(
  {
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    keyboardType,
    error,
    hint,
    prefix,
    suffix,
    editable = true,
    multiline = false,
    numberOfLines,
    maxLength,
    autoCapitalize = 'none',
    autoCorrect = false,
    returnKeyType,
    onSubmitEditing,
    style,
    inputStyle,
    onFocus,
    onBlur,
  },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          !editable && styles.inputWrapperDisabled,
        ]}
      >
        {prefix && <View style={styles.prefix}>{prefix}</View>}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            multiline && styles.multiline,
            prefix && styles.inputWithPrefix,
            suffix && styles.inputWithSuffix,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.suffix}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {suffix && !secureTextEntry && (
          <View style={styles.suffix}>{suffix}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  inputWrapperError: {
    borderColor: Colors.error,
  },
  inputWrapperDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  inputWithPrefix: { paddingLeft: Spacing.sm },
  inputWithSuffix: { paddingRight: Spacing.sm },
  prefix: {
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suffix: {
    paddingRight: Spacing.md,
    paddingLeft: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: 5,
    marginLeft: 2,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 5,
    marginLeft: 2,
  },
});

export default Input;
