import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import CartItem from '../../components/CartItem';

export default function CartScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    items,
    isEmpty,
    totalItems,
    subtotal,
    deliveryFee,
    totalAmount,
    clearCart,
  } = useCart();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/checkout');
  };

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="bag-outline" size={38} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Discover our fresh bowls, salads and wraps
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/menu')}
            style={styles.browseBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const amountForFreeDelivery = 299 - subtotal;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.subtitle}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</Text>
        </View>
        <TouchableOpacity
          onPress={clearCart}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.clearBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View layout={LinearTransition} style={styles.itemsList}>
          {items.map((item) => (
            <CartItem key={item.key} item={item} />
          ))}
        </Animated.View>

        {deliveryFee === 0 ? (
          <Animated.View entering={FadeInDown} style={styles.freeDelivery}>
            <View style={styles.freeDeliveryIcon}>
              <Ionicons name="bicycle" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.freeDeliveryText}>
              You've unlocked <Text style={styles.freeDeliveryBold}>free delivery!</Text>
            </Text>
          </Animated.View>
        ) : amountForFreeDelivery > 0 ? (
          <View style={styles.deliveryNote}>
            <View style={styles.deliveryProgress}>
              <View
                style={[
                  styles.deliveryProgressFill,
                  { width: `${Math.min(100, (subtotal / 299) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.deliveryNoteText}>
              Add <Text style={styles.deliveryNoteAmount}>₹{amountForFreeDelivery}</Text> more for free delivery
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.couponRow} activeOpacity={0.8}>
          <View style={styles.couponLeft}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
            <Text style={styles.couponText}>Apply coupon or promo code</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.summary}>
          <Text style={styles.summaryTitle}>Bill Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Total</Text>
            <Text style={styles.summaryValue}>₹{subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeText]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform Fee</Text>
            <Text style={styles.summaryValue}>₹0</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>To Pay</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </Animated.View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.checkoutBar}>
        <View style={styles.checkoutInfo}>
          <Text style={styles.checkoutTotal}>₹{totalAmount}</Text>
          <Text style={styles.checkoutSub}>
            {deliveryFee === 0 ? 'Free delivery included' : `+₹${deliveryFee} delivery`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutBtnInner}
          >
            <Text style={styles.checkoutBtnText}>Checkout</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  clearText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.error,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: 24,
  },
  itemsList: { marginBottom: Spacing.sm },

  freeDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 10,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGreen,
  },
  freeDeliveryIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeDeliveryText: {
    fontSize: FontSizes.sm,
    color: Colors.primaryDarker,
    fontWeight: '500',
  },
  freeDeliveryBold: { fontWeight: '700' },

  deliveryNote: {
    marginBottom: Spacing.md,
    gap: 6,
  },
  deliveryProgress: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  deliveryProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  deliveryNoteText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  deliveryNoteAmount: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.borderGreen,
    borderStyle: 'dashed',
  },
  couponLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  couponText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primaryDark,
  },

  summary: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  summaryTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: -0.1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  freeText: { color: Colors.primary, fontWeight: '700' },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  browseBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    ...Shadow.green,
  },
  browseBtnText: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },

  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingTop: 14,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadow.xl,
  },
  checkoutInfo: {},
  checkoutTotal: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  checkoutSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  checkoutBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Shadow.green,
  },
  checkoutBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  checkoutBtnText: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
