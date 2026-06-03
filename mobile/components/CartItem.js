import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInLeft, FadeOutRight } from 'react-native-reanimated';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import { useCart } from '../context/CartContext';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();
  const totalPrice = item.price * item.quantity;

  return (
    <Animated.View
      entering={FadeInLeft.duration(280)}
      exiting={FadeOutRight.duration(200)}
      style={styles.container}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {item.customizations && (
          <Text style={styles.customText} numberOfLines={1}>Custom bowl</Text>
        )}
        <Text style={styles.price}>₹{totalPrice}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => removeItem(item.key)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
        </TouchableOpacity>

        <View style={styles.quantityRow}>
          <TouchableOpacity
            onPress={() => updateQuantity(item.key, item.quantity - 1)}
            style={styles.qtyBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="remove" size={13} color={Colors.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            onPress={() => updateQuantity(item.key, item.quantity + 1)}
            style={styles.qtyBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={13} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 10,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: '#f8fafb',
  },
  image: {
    width: 66,
    height: 66,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  customText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 5,
  },
  price: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.2,
  },
  controls: {
    alignItems: 'flex-end',
    gap: 10,
    marginLeft: 8,
  },
  deleteBtn: {
    padding: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
    minWidth: 20,
    textAlign: 'center',
  },
});
