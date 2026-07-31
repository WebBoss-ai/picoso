import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';

export default function AddressCard({ address, selected, onSelect, onDelete, onEdit }) {
  const typeIconMap = {
    home: 'home',
    work: 'briefcase',
    other: 'location',
  };

  const icon = typeIconMap[address.type?.toLowerCase()] || 'location';

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={onSelect ? 0.85 : 1}
      style={[
        styles.container,
        selected && styles.selected,
      ]}
    >
      <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
        <Ionicons
          name={icon}
          size={18}
          color={selected ? Colors.primary : Colors.textSecondary}
        />
      </View>

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <Text style={styles.type}>{address.type || address.label || 'Address'}</Text>
          {selected && (
            <View style={styles.selectedBadge}>
              <Ionicons name="checkmark" size={10} color={Colors.white} />
            </View>
          )}
        </View>
        <Text style={styles.addressText} numberOfLines={2}>
          {address.line1 || address.fullAddress}
          {address.line2 ? `, ${address.line2}` : ''}
          {address.city ? `, ${address.city}` : ''}
          {address.pincode ? ` - ${address.pincode}` : ''}
        </Text>
      </View>

      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  selected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGreen,
  },
  iconBoxSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  details: { flex: 1, marginHorizontal: Spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  type: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  selectedBadge: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actions: { gap: 8 },
  actionBtn: { padding: 4 },
});
