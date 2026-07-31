import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function VegBadge({ isVeg }) {
  const color = isVeg !== false ? Colors.primary : Colors.error;
  return (
    <View style={[styles.vegSquare, { borderColor: color }]}>
      <View style={[styles.vegDot, { backgroundColor: color }]} />
    </View>
  );
}

function AddButton({ quantity, onAdd, onInc, onDec, compact }) {
  if (quantity > 0) {
    return (
      <View style={[styles.qtyControl, compact && styles.qtyControlCompact]}>
        <TouchableOpacity onPress={onDec} style={styles.qtyBtn} activeOpacity={0.7}>
          <Ionicons name="remove" size={14} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{quantity}</Text>
        <TouchableOpacity onPress={onInc} style={styles.qtyBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={14} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.addBtn, compact && styles.addBtnCompact]}
      onPress={onAdd}
      activeOpacity={0.85}
    >
      <Text style={styles.addBtnText}>ADD</Text>
      <Ionicons name="chevron-down" size={11} color={Colors.primary} style={{ marginLeft: 2 }} />
    </TouchableOpacity>
  );
}

export default function BowlCard({ bowl, horizontal = false, featured = false }) {
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

  const handleAdd = useCallback((e) => {
    e?.stopPropagation?.();
    scale.value = withSpring(0.96, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    addItem(bowl);
  }, [bowl, addItem, scale]);

  const handleInc = useCallback(() => {
    if (cartItem) updateQuantity(cartItem.key, quantity + 1);
  }, [cartItem, quantity, updateQuantity]);

  const handleDec = useCallback(() => {
    if (cartItem) updateQuantity(cartItem.key, quantity - 1);
  }, [cartItem, quantity, updateQuantity]);

  const servingLabel = bowl.pieces
    ? `${bowl.pieces} Piece${bowl.pieces > 1 ? 's' : ''}`
    : bowl.serves
      ? `Serves ${bowl.serves}`
      : null;

  // ── Featured full-width card ──────────────────────────────────────────────
  if (featured) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92} style={styles.featured}>
        <View style={styles.featuredImageWrap}>
          <Image
            source={{ uri: bowl.image }}
            style={styles.featuredImage}
            contentFit="cover"
            transition={300}
          />
          <View style={styles.featuredVeg}>
            <VegBadge isVeg={bowl.isVeg} />
          </View>
          <View style={styles.featuredAdd}>
            <AddButton
              quantity={quantity}
              onAdd={handleAdd}
              onInc={handleInc}
              onDec={handleDec}
            />
          </View>
          {bowl.isBestseller && (
            <View style={styles.bestsellerBadge}>
              <Ionicons name="star" size={9} color="#fff" />
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          )}
        </View>
        <View style={styles.featuredBody}>
          {servingLabel && (
            <View style={styles.servingPill}>
              <Text style={styles.servingText}>{servingLabel}</Text>
            </View>
          )}
          <Text style={styles.featuredName}>{bowl.name}</Text>
          {bowl.description ? (
            <Text style={styles.featuredDesc} numberOfLines={2}>{bowl.description}</Text>
          ) : null}
          <Text style={styles.featuredPrice}>₹{bowl.price}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Horizontal list variant ───────────────────────────────────────────────
  if (horizontal) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.horizontal}>
        <View style={styles.hImageWrap}>
          <Image
            source={{ uri: bowl.image }}
            style={styles.hImage}
            contentFit="cover"
            transition={300}
          />
          {bowl.isBestseller && (
            <View style={[styles.bestsellerBadge, { top: 6, left: 6 }]}>
              <Ionicons name="star" size={8} color="#fff" />
              <Text style={styles.bestsellerText}>Bestseller</Text>
            </View>
          )}
        </View>
        <View style={styles.hBody}>
          <View style={styles.hMeta}>
            <VegBadge isVeg={bowl.isVeg} />
            {servingLabel && (
              <View style={styles.servingPill}>
                <Text style={styles.servingText}>{servingLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.hName} numberOfLines={1}>{bowl.name}</Text>
          {bowl.description ? (
            <Text style={styles.hDesc} numberOfLines={1}>{bowl.description}</Text>
          ) : (
            <Text style={styles.hDesc}>{bowl.calories || 0} kcal</Text>
          )}
          <View style={styles.hFooter}>
            <Text style={styles.price}>₹{bowl.price}</Text>
            <AddButton
              quantity={quantity}
              onAdd={handleAdd}
              onInc={handleInc}
              onDec={handleDec}
              compact
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Default 2-column grid card (Swiggy style) ─────────────────────────────
  return (
    <AnimatedPressable onPress={handlePress} style={[styles.card, animatedStyle]}>
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: bowl.image }}
          style={styles.image}
          contentFit="cover"
          transition={300}
        />
        {bowl.isBestseller && (
          <View style={styles.bestsellerBadge}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={styles.bestsellerText}>Bestseller</Text>
          </View>
        )}
        {!bowl.isBestseller && bowl.isNew && (
          <View style={[styles.bestsellerBadge, styles.newBadge]}>
            <Text style={styles.bestsellerText}>New</Text>
          </View>
        )}
        <View style={styles.imageBottom}>
          <VegBadge isVeg={bowl.isVeg} />
          <AddButton
            quantity={quantity}
            onAdd={handleAdd}
            onInc={handleInc}
            onDec={handleDec}
          />
        </View>
      </View>

      <View style={styles.body}>
        {servingLabel && (
          <View style={[styles.servingPill, { marginBottom: 4 }]}>
            <Text style={styles.servingText}>{servingLabel}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={2}>{bowl.name}</Text>
        {bowl.description ? (
          <Text style={styles.desc} numberOfLines={2}>{bowl.description}</Text>
        ) : (
          <Text style={styles.desc} numberOfLines={1}>
            {bowl.calories || 0} kcal
            {bowl.protein ? ` · ${bowl.protein}g protein` : ''}
          </Text>
        )}
        <Text style={styles.price}>₹{bowl.price}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Grid card
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    flex: 1,
    margin: 6,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 148,
    borderRadius: Radius.md,
  },
  imageBottom: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  body: {
    paddingTop: 8,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  name: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  desc: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '400',
    marginBottom: 6,
    lineHeight: 15,
  },
  price: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },

  // Veg badge
  vegSquare: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Bestseller badge
  bestsellerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  newBadge: {
    backgroundColor: '#3b82f6',
  },
  bestsellerText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Serving pill
  servingPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceGray,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  servingText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // ADD button (Swiggy style)
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Shadow.sm,
  },
  addBtnCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // Quantity control
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  qtyControlCompact: {},
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.primary,
    minWidth: 20,
    textAlign: 'center',
  },

  // Featured
  featured: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  featuredImageWrap: {
    position: 'relative',
    height: 200,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredVeg: {
    position: 'absolute',
    bottom: 12,
    left: 12,
  },
  featuredAdd: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  featuredBody: {
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  featuredName: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  featuredDesc: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 6,
  },
  featuredPrice: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },

  // Horizontal
  horizontal: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadow.card,
  },
  hImageWrap: {
    position: 'relative',
    width: 110,
    height: 110,
  },
  hImage: {
    width: 110,
    height: 110,
  },
  hBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  hMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  hName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  hDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  hFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
