import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing } from '../constants/theme';

const CATEGORY_ICONS = {
  all: 'grid-outline',
  meals: 'restaurant-outline',
  salads: 'leaf-outline',
  beverages: 'cafe-outline',
  wraps: 'layers-outline',
  sandwiches: 'fast-food-outline',
};

const CATEGORY_COLORS = {
  all: { bg: '#f0fdf4', text: '#15803d', icon: '#16a34a' },
  meals: { bg: '#f0fdf4', text: '#15803d', icon: '#16a34a' },
  salads: { bg: '#d1fae5', text: '#065f46', icon: '#10b981' },
  beverages: { bg: '#cffafe', text: '#164e63', icon: '#06b6d4' },
  wraps: { bg: '#fef9c3', text: '#713f12', icon: '#ca8a04' },
  sandwiches: { bg: '#fee2e2', text: '#7f1d1d', icon: '#dc2626' },
};

export default function CategoryChip({ category, selected, onPress, label }) {
  const key = category?.toLowerCase() || 'all';
  const iconName = CATEGORY_ICONS[key] || 'apps-outline';
  const colors = CATEGORY_COLORS[key] || CATEGORY_COLORS.all;
  const displayLabel = label || category;

  if (selected) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={styles.wrapper}>
        <LinearGradient
          colors={Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.chip}
        >
          <Ionicons name={iconName.replace('-outline', '')} size={14} color={Colors.white} />
          <Text style={[styles.text, styles.textSelected]}>{displayLabel}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[styles.wrapper, styles.chipOutline, { backgroundColor: colors.bg }]}
    >
      <Ionicons name={iconName} size={14} color={colors.icon} />
      <Text style={[styles.text, { color: colors.text }]}>{displayLabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    gap: 5,
  },
  chipOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 5,
  },
  text: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textSelected: {
    color: Colors.white,
  },
});
