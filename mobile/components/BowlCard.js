import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import { useCart } from '../context/CartContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 40 - 12) / 2;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function BowlCard({ bowl, horizontal = false }) {
  const router = useRouter();
  const { addItem, getItemQuantity, updateQuantity, items } = useCart();
  const scale = useSharedValue(1);
  const quantity = getItemQuantity(bowl._id);
  const cartItem = items.find((i) => i.bowl._id === bowl._id);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    router.push(`/bowl/${bowl._id}`);
  }, [bowl._id, router]);

  const handleAddToCart = useCallback((e) => {
    e?.stopPropagation?.();
    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    addItem(bowl);
  }, [bowl, addItem, scale]);

  const handleIncrement = useCallback(() => {
    if (cartItem) updateQuantity(cartItem.key, quantity + 1);
  }, [cartItem, quantity, updateQuantity]);

  const handleDecrement = useCallback(() => {
    if (cartItem) updateQuantity(cartItem.key, quantity - 1);
  }, [cartItem, quantity, updateQuantity]);

  if (horizontal) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.horizontal}>
        <Image
          source={{ uri: bowl.image }}
          style={styles.horizontalImage}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.horizontalBody}>
          <View style={styles.horizontalMeta}>
            <View style={[styles.vegDot, { backgroundColor: bowl.isVeg ? Colors.primary : Colors.error }]} />
            {bowl.isBestseller && (
              <View style={styles.bestsellerPill}>
                <Text style={styles.bestsellerPillText}>Bestseller</Text>
              </View>
            )}
          </View>
          <Text style={styles.horizontalName} numberOfLines={1}>{bowl.name}</Text>
          <Text style={styles.horizontalCalories}>{bowl.calories || 0} kcal</Text>
          <View style={styles.horizontalFooter}>
            <Text style={styles.price}>₹{bowl.price}</Text>
            {quantity === 0 ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleAddToCart}
                activeOpacity={0.85}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons name="add" size={18} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={styles.quantityControl}>
                <TouchableOpacity onPress={handleDecrement} style={styles.qtyBtn} activeOpacity={0.7}>
                  <Ionicons name="remove" size={13} color={Colors.primaryDark} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity onPress={handleIncrement} style={styles.qtyBtn} activeOpacity={0.7}>
                  <Ionicons name="add" size={13} color={Colors.primaryDark} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <AnimatedPressable onPress={handlePress} style={[styles.card, animatedStyle]}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: bowl.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        {/* Veg/Non-veg indicator */}
        <View style={styles.vegIndicator}>
          <View style={[styles.vegSquare, { borderColor: bowl.isVeg ? Colors.primary : Colors.error }]}>
            <View style={[styles.vegDotInner, { backgroundColor: bowl.isVeg ? Colors.primary : Colors.error }]} />
          </View>
        </View>
        {/* Tag badges */}
        {bowl.isBestseller && (
          <View style={styles.badge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.badgeText}>Bestseller</Text>
          </View>
        )}
        {!bowl.isBestseller && bowl.isNew && (
          <View style={[styles.badge, styles.newBadge]}>
            <Text style={styles.badgeText}>New</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{bowl.name}</Text>
        <Text style={styles.calories} numberOfLines={1}>
          {bowl.calories || 0} kcal
          {bowl.protein ? ` · ${bowl.protein}g protein` : ''}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{bowl.price}</Text>
          {quantity === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={handleAddToCart}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={19} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.quantityControl}>
              <TouchableOpacity onPress={handleDecrement} style={styles.qtyBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={13} color={Colors.primaryDark} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={handleIncrement} style={styles.qtyBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={13} color={Colors.primaryDark} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    flex: 1,
    margin: 6,
    ...Shadow.card,
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 130 },
  vegIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.white,
    borderRadius: 4,
    padding: 3,
    ...Shadow.sm,
  },
  vegSquare: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#f59e0b',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  newBadge: { backgroundColor: '#3b82f6' },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },

  body: { padding: 12 },
  name: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  calories: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: -0.2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
    minWidth: 18,
    textAlign: 'center',
  },

  // Horizontal variant
  horizontal: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadow.card,
  },
  horizontalImage: { width: 104, height: 104 },
  horizontalBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  horizontalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 3,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  bestsellerPill: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  bestsellerPillText: {
    fontSize: 9,
    color: '#c2410c',
    fontWeight: '700',
  },
  horizontalName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  horizontalCalories: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  horizontalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
