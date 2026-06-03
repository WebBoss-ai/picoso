import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import Badge from './ui/Badge';

const STATUS_CONFIG = {
  pending: { icon: 'time-outline', color: '#f59e0b', bg: '#fffbeb' },
  confirmed: { icon: 'checkmark-circle-outline', color: '#3b82f6', bg: '#eff6ff' },
  preparing: { icon: 'restaurant-outline', color: '#8b5cf6', bg: '#f5f3ff' },
  out_for_delivery: { icon: 'bicycle-outline', color: '#f97316', bg: '#fff7ed' },
  delivered: { icon: 'checkmark-done-circle', color: Colors.primary, bg: '#f0fdf4' },
  cancelled: { icon: 'close-circle-outline', color: Colors.error, bg: '#fef2f2' },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderCard({ order }) {
  const router = useRouter();
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const itemCount = order.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
  const firstItem = order.items?.[0];
  const itemName = firstItem?.bowl?.name || firstItem?.name || 'Custom Bowl';
  const orderId = `#${order._id.slice(-6).toUpperCase()}`;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/order/${order._id}`)}
      activeOpacity={0.88}
      style={styles.container}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusIconWrap, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={16} color={config.color} />
          </View>
          <View>
            <Text style={styles.orderId}>{orderId}</Text>
            <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>
        <Badge status={order.status} size="sm" />
      </View>

      <View style={styles.divider} />

      {/* Items info */}
      <View style={styles.body}>
        <View style={styles.bodyLeft}>
          <Text style={styles.itemName} numberOfLines={1}>
            {itemName}
            {itemCount > 1 && <Text style={styles.moreText}> +{itemCount - 1} more</Text>}
          </Text>
          <Text style={styles.itemCount}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
        </View>
        <View style={styles.bodyRight}>
          <Text style={styles.amount}>₹{order.totalAmount || order.total}</Text>
          {order.paymentMethod && (
            <Text style={styles.payMethod}>{order.paymentMethod.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {/* On-the-way strip */}
      {order.status === 'out_for_delivery' && (
        <View style={styles.deliveryStrip}>
          <Ionicons name="bicycle" size={14} color="#c2410c" />
          <Text style={styles.deliveryStripText}>Your order is on the way</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.viewDetails}>View Details</Text>
        <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: 10,
    ...Shadow.card,
    borderWidth: 1,
    borderColor: '#f8fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderId: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.4,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bodyLeft: { flex: 1, marginRight: Spacing.md },
  itemName: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  moreText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  itemCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  bodyRight: { alignItems: 'flex-end' },
  amount: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  payMethod: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  deliveryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  deliveryStripText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: '#c2410c',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  viewDetails: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.1,
  },
});
