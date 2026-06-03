import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { FontSizes, Radius, Spacing } from '../../constants/theme';

const STATUS_MAP = {
  pending: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pending' },
  confirmed: { bg: '#dbeafe', text: '#1e3a8a', dot: '#3b82f6', label: 'Confirmed' },
  preparing: { bg: '#ede9fe', text: '#4c1d95', dot: '#8b5cf6', label: 'Preparing' },
  out_for_delivery: { bg: '#ffedd5', text: '#7c2d12', dot: '#f97316', label: 'Out for Delivery' },
  delivered: { bg: '#dcfce7', text: '#14532d', dot: '#22c55e', label: 'Delivered' },
  cancelled: { bg: '#fee2e2', text: '#7f1d1d', dot: '#ef4444', label: 'Cancelled' },
  veg: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Veg' },
  'non-veg': { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Non-Veg' },
  new: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6', label: 'New' },
  bestseller: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Bestseller' },
  platinum: { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Platinum' },
};

export default function Badge({ status, label, size = 'sm', showDot = true, style }) {
  const config = STATUS_MAP[status] || {
    bg: Colors.border,
    text: Colors.textSecondary,
    dot: Colors.textMuted,
    label: label || status,
  };

  const displayLabel = label || config.label;
  const fontSize = size === 'xs' ? 10 : size === 'sm' ? FontSizes.xs : FontSizes.sm;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      {showDot && (
        <View style={[styles.dot, { backgroundColor: config.dot }]} />
      )}
      <Text style={[styles.text, { color: config.text, fontSize }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
