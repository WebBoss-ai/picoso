import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing } from '../../constants/theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  style,
  textStyle,
}) {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md },
    md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: Radius.lg },
    lg: { paddingVertical: 17, paddingHorizontal: 32, borderRadius: Radius.xl },
  };

  const textSizes = { sm: FontSizes.sm, md: FontSizes.base, lg: FontSizes.md };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={disabled || loading}
        style={[fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={disabled ? ['#9ca3af', '#6b7280'] : Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.textPrimary, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
              {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled || loading}
        style={[
          styles.base,
          styles.outline,
          sizeStyles[size],
          fullWidth && { width: '100%' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={[styles.textOutline, { fontSize: textSizes[size] }, textStyle]}>
              {title}
            </Text>
            {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
          </>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={disabled || loading}
        style={[styles.base, sizeStyles[size], fullWidth && { width: '100%' }, style]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        <Text style={[styles.textGhost, { fontSize: textSizes[size] }, textStyle]}>
          {title}
        </Text>
        {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
      </TouchableOpacity>
    );
  }

  if (variant === 'platinum') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        disabled={disabled || loading}
        style={[fullWidth && { width: '100%' }, style]}
      >
        <LinearGradient
          colors={Colors.gradientPlatinum}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.textPrimary, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  textPrimary: {
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textOutline: {
    color: Colors.primary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textGhost: {
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
});
