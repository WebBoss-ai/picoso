import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { bowlsAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const IMAGE_HEIGHT = 320;

export default function BowlDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addItem, getItemQuantity, items, updateQuantity } = useCart();
  const [bowl, setBowl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const addScale = useSharedValue(1);

  const cartQuantity = getItemQuantity(id);
  const cartItem = items.find((i) => i.bowl._id === id);

  useEffect(() => {
    fetchBowl();
  }, [id]);

  const fetchBowl = async () => {
    try {
      const res = await bowlsAPI.getById(id);
      setBowl(res.data);
    } catch {
      Alert.alert('Error', 'Could not load item details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const addBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addScale.value }],
  }));

  const handleAddToCart = () => {
    addScale.value = withSpring(0.93, {}, () => {
      addScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(bowl, quantity);
  };

  if (loading || !bowl) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingImage} />
      </View>
    );
  }

  const NUTRIENTS = [
    { label: 'Calories', value: bowl.calories, unit: 'kcal', icon: 'flash', iconColor: '#f59e0b' },
    { label: 'Protein', value: bowl.protein, unit: 'g', icon: 'barbell-outline', iconColor: '#8b5cf6' },
    { label: 'Carbs', value: bowl.carbs, unit: 'g', icon: 'nutrition-outline', iconColor: Colors.primary },
    { label: 'Fat', value: bowl.fat, unit: 'g', icon: 'water-outline', iconColor: '#3b82f6' },
  ];

  const servingLabel = bowl.pieces
    ? `${bowl.pieces} Piece${bowl.pieces > 1 ? 's' : ''}`
    : bowl.serves
      ? `Serves ${bowl.serves}`
      : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: bowl.image }}
            style={styles.image}
            contentFit="cover"
            transition={400}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(255,255,255,1)']}
            style={styles.imageGradient}
          />

          <SafeAreaView style={styles.topButtons}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.imageBadges}>
            {bowl.isBestseller && <Badge status="bestseller" size="xs" />}
            {bowl.isNew && <Badge status="new" size="xs" />}
          </View>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(100)} style={styles.titleRow}>
            <View style={styles.titleLeft}>
              <View style={[styles.vegBadge, { borderColor: bowl.isVeg !== false ? Colors.primary : Colors.error }]}>
                <View style={[styles.vegDot, { backgroundColor: bowl.isVeg !== false ? Colors.primary : Colors.error }]} />
              </View>
              <Text style={styles.category}>{bowl.pfCategory || bowl.category}</Text>
              {servingLabel && (
                <View style={styles.servingPill}>
                  <Text style={styles.servingText}>{servingLabel}</Text>
                </View>
              )}
            </View>
            <Text style={styles.price}>₹{bowl.price}</Text>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(150)} style={styles.name}>
            {bowl.name}
          </Animated.Text>

          {bowl.description && (
            <Animated.Text entering={FadeInDown.delay(200)} style={styles.description}>
              {bowl.description}
            </Animated.Text>
          )}

          <Animated.View entering={FadeInDown.delay(250)} style={styles.nutritionCard}>
            <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
            <View style={styles.nutritionGrid}>
              {NUTRIENTS.map((n) => (
                <View key={n.label} style={styles.nutrientItem}>
                  <View style={[styles.nutrientIconWrap, { backgroundColor: n.iconColor + '18' }]}>
                    <Ionicons name={n.icon} size={16} color={n.iconColor} />
                  </View>
                  <Text style={styles.nutrientValue}>
                    {n.value || 0}<Text style={styles.nutrientUnit}>{n.unit}</Text>
                  </Text>
                  <Text style={styles.nutrientLabel}>{n.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {bowl.availableFrom && bowl.availableTill && (
            <Animated.View entering={FadeInDown.delay(300)} style={styles.availabilityRow}>
              <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.availabilityText}>
                Available {bowl.availableFrom} – {bowl.availableTill}
              </Text>
            </Animated.View>
          )}

          {bowl.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {bowl.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {cartQuantity === 0 && (
            <Animated.View entering={FadeInDown.delay(350)} style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Quantity</Text>
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="remove" size={18} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity((q) => Math.min(10, q + 1))}
                  style={styles.qtyBtn}
                >
                  <Ionicons name="add" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <View style={styles.addToCartBar}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>
            ₹{bowl.price * (cartQuantity > 0 ? cartQuantity : quantity)}
          </Text>
        </View>

        {cartQuantity === 0 ? (
          <Animated.View style={[styles.addBtnWrapper, addBtnStyle]}>
            <Button
              title="Add to Cart"
              onPress={handleAddToCart}
              icon={<Ionicons name="bag-add-outline" size={18} color={Colors.white} />}
              style={styles.addBtn}
            />
          </Animated.View>
        ) : (
          <View style={styles.cartQuantityControl}>
            <TouchableOpacity
              onPress={() => cartItem && updateQuantity(cartItem.key, cartQuantity - 1)}
              style={styles.cartQtyBtn}
            >
              <Ionicons name="remove" size={18} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.cartQtyValue}>{cartQuantity} in cart</Text>
            <TouchableOpacity
              onPress={() => cartItem && updateQuantity(cartItem.key, cartQuantity + 1)}
              style={styles.cartQtyBtn}
            >
              <Ionicons name="add" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  loadingContainer: { flex: 1 },
  loadingImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.border,
  },
  imageWrapper: {
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  imageBadges: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.base,
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  vegBadge: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'capitalize',
  },
  servingPill: {
    backgroundColor: Colors.surfaceGray,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  servingText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  price: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  name: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  nutritionCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.borderGreen,
  },
  nutritionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutrientItem: { alignItems: 'center', gap: 4, flex: 1 },
  nutrientIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrientValue: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  nutrientUnit: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  nutrientLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  availabilityText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.base,
  },
  tag: {
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.borderGreen,
  },
  tagText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
  },
  quantityLabel: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  addToCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadow.xl,
  },
  totalInfo: {},
  totalLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  addBtnWrapper: {},
  addBtn: { minWidth: 160 },
  cartQuantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    gap: 2,
    paddingHorizontal: 4,
  },
  cartQtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'center',
  },
});
