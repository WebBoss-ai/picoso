import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors, { CategoryColors } from '../constants/colors';
import { Radius, FontSizes, Spacing } from '../constants/theme';

const CATEGORY_ICONS = {
  all: 'grid-outline',
  'pf-meals': 'restaurant-outline',
  'pf-salads': 'leaf-outline',
  'pf-beverages': 'cafe-outline',
  'pf-wraps': 'layers-outline',
  'pf-sandwiches': 'fast-food-outline',
  meals: 'restaurant-outline',
  salads: 'leaf-outline',
  beverages: 'cafe-outline',
  wraps: 'layers-outline',
  sandwiches: 'fast-food-outline',
};

export default function CategoryChip({ category, selected, onPress, label, count }) {
  const key = category?.toLowerCase() || 'all';
  const iconName = CATEGORY_ICONS[key] || 'apps-outline';
  const colors = CategoryColors[key] || CategoryColors.all;
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
          <Ionicons name={iconName.replace('-outline', '')} size={13} color={Colors.white} />
          <Text style={[styles.text, styles.textSelected]}>{displayLabel}</Text>
          {count != null && (
            <Text style={[styles.count, styles.countSelected]}>{count}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      style={[styles.wrapper, styles.chipOutline]}
    >
      <Ionicons name={iconName} size={13} color={colors.icon} />
      <Text style={[styles.text, { color: Colors.textSecondary }]}>{displayLabel}</Text>
      {count != null && (
        <Text style={styles.count}>{count}</Text>
      )}
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
    paddingVertical: 8,
    borderRadius: Radius.full,
    gap: 5,
  },
  chipOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  textSelected: {
    color: Colors.white,
  },
  count: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.textMuted,
    marginLeft: 2,
  },
  countSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
});
