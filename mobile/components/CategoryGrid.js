import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Colors, { CategoryColors, MENU_CATEGORIES } from '../constants/colors';
import { Radius, Spacing, Shadow } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = (SCREEN_WIDTH - 32 - 36) / 5;

const DEFAULT_CATEGORIES = MENU_CATEGORIES.filter((c) => c.id !== 'all').slice(0, 10);

export default function CategoryGrid({
  categories = DEFAULT_CATEGORIES,
  onSelect,
  bowls = [],
}) {
  // Enrich categories with a sample image from bowls if available
  const enriched = categories.map((cat) => {
    const sample = bowls.find(
      (b) => b.pfCategory?.toLowerCase() === cat.id || b.category?.toLowerCase() === cat.id
    );
    const colors = CategoryColors[cat.id] || CategoryColors.all;
    return { ...cat, image: sample?.image, colors };
  });

  return (
    <View style={styles.grid}>
      {enriched.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={styles.item}
          onPress={() => onSelect?.(cat.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.circle, { backgroundColor: cat.colors.bg }]}>
            {cat.image ? (
              <Image
                source={{ uri: cat.image }}
                style={styles.circleImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Ionicons name={cat.icon} size={28} color={cat.colors.icon} />
            )}
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: 4,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginHorizontal: 2,
  },
  circle: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  circleImage: {
    width: 64,
    height: 64,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
});
