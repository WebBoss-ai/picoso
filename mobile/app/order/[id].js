import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ordersAPI } from '../../lib/api';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import Badge from '../../components/ui/Badge';

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant-outline' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
];

const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    fetchOrder();
    // Poll for status updates every 30 sec if active
    const interval = setInterval(() => {
      if (order && !['delivered', 'cancelled'].includes(order.status)) {
        fetchOrder();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await ordersAPI.getById(id);
      setOrder(res.data);
    } catch {
      Alert.alert('Error', 'Could not load order details.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.loading}>
        <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
      </View>
    );
  }

  const currentStepIdx = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  const date = new Date(order.createdAt);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order ID & Status */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statusCard}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</Text>
            <Badge status={order.status} />
          </View>
          <Text style={styles.orderDate}>{formattedDate} at {formattedTime}</Text>
        </Animated.View>

        {/* Progress Tracker */}
        {!isCancelled && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
            <Text style={styles.sectionTitle}>Tracking</Text>
            <View style={styles.trackingCard}>
              {STEPS.map((step, i) => {
                const isDone = i <= currentStepIdx;
                const isCurrent = i === currentStepIdx;
                return (
                  <View key={step.key} style={styles.step}>
                    <View style={styles.stepLeft}>
                      <View
                        style={[
                          styles.stepDot,
                          isDone && styles.stepDotDone,
                          isCurrent && styles.stepDotCurrent,
                        ]}
                      >
                        <Ionicons
                          name={step.icon}
                          size={14}
                          color={isDone ? Colors.white : Colors.textMuted}
                        />
                      </View>
                      {i < STEPS.length - 1 && (
                        <View
                          style={[styles.stepLine, isDone && i < currentStepIdx && styles.stepLineDone]}
                        />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, isDone && styles.stepLabelDone]}>
                        {step.label}
                      </Text>
                      {isCurrent && (
                        <Text style={styles.stepCurrent}>In progress...</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Items */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          <View style={styles.card}>
            {order.items.map((item, i) => (
              <View key={i} style={[styles.itemRow, i < order.items.length - 1 && styles.itemBorder]}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.bowl?.name || item.name}</Text>
                  {item.customizations && (
                    <Text style={styles.itemCustom}>Customized</Text>
                  )}
                </View>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price * item.quantity}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Pricing */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          <View style={styles.card}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal</Text>
              <Text style={styles.billValue}>₹{order.subtotal}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery</Text>
              <Text style={[styles.billValue, order.deliveryFee === 0 && styles.freeText]}>
                {order.deliveryFee === 0 ? 'FREE' : `₹${order.deliveryFee}`}
              </Text>
            </View>
            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.billTotal}>Total Paid</Text>
              <Text style={styles.billTotalValue}>₹{order.totalAmount}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Delivery Address */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={18} color={Colors.primary} />
              <Text style={styles.addressText}>
                {order.deliveryAddress?.line1}
                {order.deliveryAddress?.line2 ? `, ${order.deliveryAddress.line2}` : ''}
                {order.deliveryAddress?.city ? `, ${order.deliveryAddress.city}` : ''}
                {order.deliveryAddress?.pincode ? ` - ${order.deliveryAddress.pincode}` : ''}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.card}>
            <View style={styles.payRow}>
              <Ionicons
                name={order.paymentMethod === 'cod' ? 'cash-outline' : 'phone-portrait-outline'}
                size={18}
                color={Colors.primary}
              />
              <Text style={styles.payMethod}>
                {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'UPI Payment'}
              </Text>
              <View style={[
                styles.payStatus,
                order.paymentStatus === 'paid' ? styles.payStatusPaid : styles.payStatusPending,
              ]}>
                <Text style={styles.payStatusText}>
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Feedback */}
        {order.status === 'delivered' && !order.feedback && (
          <Animated.View entering={FadeInDown.delay(400)} style={styles.feedbackSection}>
            <Text style={styles.feedbackTitle}>How was your order?</Text>
            <Text style={styles.feedbackSubtitle}>Your feedback helps us improve</Text>
            <TouchableOpacity style={styles.feedbackBtn} onPress={() => setShowFeedback(true)}>
              <Text style={styles.feedbackBtnText}>Rate this order</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderId: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  orderDate: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  trackingCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  step: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepLeft: { alignItems: 'center', width: 32 },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: Colors.primary },
  stepDotCurrent: {
    backgroundColor: Colors.primaryDark,
    borderWidth: 3,
    borderColor: Colors.primaryBg,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  stepLineDone: { backgroundColor: Colors.primary },
  stepContent: { flex: 1, paddingBottom: Spacing.md, paddingTop: 6 },
  stepLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  stepLabelDone: { color: Colors.textPrimary },
  stepCurrent: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemLeft: { flex: 1 },
  itemName: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemCustom: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  itemQty: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginHorizontal: Spacing.md,
  },
  itemPrice: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  billValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  freeText: { color: Colors.primary, fontWeight: '700' },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  billTotal: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billTotalValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  addressText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  payMethod: {
    flex: 1,
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  payStatus: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  payStatusPaid: { backgroundColor: Colors.surfaceGreen },
  payStatusPending: { backgroundColor: '#fef3c7' },
  payStatusText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  feedbackSection: {
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  feedbackTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  feedbackSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  feedbackBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  feedbackBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
});
