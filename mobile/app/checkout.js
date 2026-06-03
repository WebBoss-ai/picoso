import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ordersAPI, profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import Button from '../components/ui/Button';
import AddressCard from '../components/AddressCard';

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: 'cash-outline', desc: 'Pay when your order arrives' },
  { id: 'upi', label: 'UPI Payment', icon: 'phone-portrait-outline', desc: 'Pay via UPI / GPAY / PhonePe' },
];

export default function Checkout() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const { items, subtotal, deliveryFee, totalAmount, clearCart } = useCart();
  const [addresses, setAddresses] = useState(user?.savedAddresses || []);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [upiRef, setUpiRef] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: 'Home',
    line1: '',
    line2: '',
    city: '',
    pincode: '',
  });

  useEffect(() => {
    if (addresses.length === 0) setShowAddAddress(true);
  }, []);

  const handleAddAddress = async () => {
    if (!newAddress.line1 || !newAddress.city || !newAddress.pincode) {
      Alert.alert('Required', 'Please fill in address, city and pincode.');
      return;
    }
    try {
      await profileAPI.addAddress(newAddress);
      await refreshProfile();
      const updated = [...addresses, newAddress];
      setAddresses(updated);
      setSelectedAddressIdx(updated.length - 1);
      setShowAddAddress(false);
      setNewAddress({ type: 'Home', line1: '', line2: '', city: '', pincode: '' });
    } catch {
      Alert.alert('Error', 'Could not save address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (addresses.length === 0) {
      Alert.alert('Address Required', 'Please add a delivery address.');
      return;
    }
    if (paymentMethod === 'upi' && !upiRef.trim()) {
      Alert.alert('UPI Reference', 'Please enter the UTR / UPI transaction reference.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const orderData = {
        items: items.map((i) => ({
          bowl: i.bowl._id,
          quantity: i.quantity,
          price: i.price,
          name: i.name,
          customizations: i.customizations,
        })),
        deliveryAddress: addresses[selectedAddressIdx],
        paymentMethod,
        upiTransactionRef: paymentMethod === 'upi' ? upiRef : undefined,
        subtotal,
        deliveryFee,
        totalAmount,
        notes: notes.trim() || undefined,
      };

      const res = await ordersAPI.create(orderData);
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/order-success/${res.data._id}`);
    } catch (err) {
      Alert.alert(
        'Order Failed',
        err.response?.data?.message || 'Could not place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Delivery Address */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => router.push('/addresses')}>
                <Text style={styles.sectionLink}>Manage</Text>
              </TouchableOpacity>
            </View>

            {addresses.length === 0 ? (
              <View style={styles.noAddressBox}>
                <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.noAddressText}>No saved addresses</Text>
              </View>
            ) : (
              addresses.map((addr, idx) => (
                <AddressCard
                  key={idx}
                  address={addr}
                  selected={selectedAddressIdx === idx}
                  onSelect={() => setSelectedAddressIdx(idx)}
                />
              ))
            )}

            {showAddAddress ? (
              <View style={styles.addAddressForm}>
                <Text style={styles.addAddressTitle}>Add New Address</Text>
                {['Home', 'Work', 'Other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewAddress((a) => ({ ...a, type }))}
                    style={[styles.typeBtn, newAddress.type === type && styles.typeBtnActive]}
                  >
                    <Text style={[styles.typeBtnText, newAddress.type === type && styles.typeBtnTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={styles.textInput}
                  placeholder="Street address *"
                  placeholderTextColor={Colors.textMuted}
                  value={newAddress.line1}
                  onChangeText={(t) => setNewAddress((a) => ({ ...a, line1: t }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Apartment / Floor (optional)"
                  placeholderTextColor={Colors.textMuted}
                  value={newAddress.line2}
                  onChangeText={(t) => setNewAddress((a) => ({ ...a, line2: t }))}
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.textInput, styles.flex1, { marginRight: 8 }]}
                    placeholder="City *"
                    placeholderTextColor={Colors.textMuted}
                    value={newAddress.city}
                    onChangeText={(t) => setNewAddress((a) => ({ ...a, city: t }))}
                  />
                  <TextInput
                    style={[styles.textInput, styles.flex1]}
                    placeholder="Pincode *"
                    placeholderTextColor={Colors.textMuted}
                    value={newAddress.pincode}
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(t) => setNewAddress((a) => ({ ...a, pincode: t }))}
                  />
                </View>
                <View style={styles.row}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setShowAddAddress(false)}
                    style={styles.flex1}
                  />
                  <Button
                    title="Save"
                    onPress={handleAddAddress}
                    style={[styles.flex1, { marginLeft: 8 }]}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowAddAddress(true)}
                style={styles.addAddressBtn}
              >
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addAddressBtnText}>Add new address</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Payment Method */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {PAYMENT_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm.id}
                onPress={() => setPaymentMethod(pm.id)}
                style={[styles.paymentOption, paymentMethod === pm.id && styles.paymentOptionActive]}
              >
                <Ionicons
                  name={pm.icon}
                  size={22}
                  color={paymentMethod === pm.id ? Colors.primary : Colors.textMuted}
                />
                <View style={styles.paymentInfo}>
                  <Text style={[styles.paymentLabel, paymentMethod === pm.id && styles.paymentLabelActive]}>
                    {pm.label}
                  </Text>
                  <Text style={styles.paymentDesc}>{pm.desc}</Text>
                </View>
                <View style={[styles.radioOuter, paymentMethod === pm.id && styles.radioOuterActive]}>
                  {paymentMethod === pm.id && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}

            {paymentMethod === 'upi' && (
              <Animated.View entering={FadeInDown}>
                <TextInput
                  style={styles.upiInput}
                  placeholder="Enter UTR / UPI Transaction ID"
                  placeholderTextColor={Colors.textMuted}
                  value={upiRef}
                  onChangeText={setUpiRef}
                  autoCapitalize="characters"
                />
                <Text style={styles.upiHint}>
                  Make payment to UPI ID: picoso@upi, then enter transaction ID above
                </Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Order Summary */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryCard}>
              {items.map((item) => (
                <View key={item.key} style={styles.orderItem}>
                  <Text style={styles.orderItemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.orderItemQty}>×{item.quantity}</Text>
                  <Text style={styles.orderItemPrice}>₹{item.price * item.quantity}</Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₹{subtotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text style={[styles.summaryValue, deliveryFee === 0 && styles.freeText]}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>₹{totalAmount}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special requests for your order..."
              placeholderTextColor={Colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Place Order */}
      <View style={styles.placeOrderBar}>
        <View>
          <Text style={styles.placeOrderTotal}>₹{totalAmount}</Text>
          <Text style={styles.placeOrderSub}>
            {paymentMethod === 'cod' ? 'Pay on delivery' : 'UPI payment'}
          </Text>
        </View>
        <Button
          title="Place Order"
          onPress={handlePlaceOrder}
          loading={loading}
          size="md"
          style={styles.placeOrderBtn}
          icon={<Ionicons name="checkmark" size={18} color={Colors.white} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
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
  scrollContent: { padding: Spacing.xl, paddingBottom: 120 },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  sectionLink: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  noAddressBox: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  noAddressText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
  },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
  },
  addAddressBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  addAddressForm: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  addAddressTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  typeBtn: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceGreen },
  typeBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textMuted },
  typeBtnTextActive: { color: Colors.primaryDark },
  textInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceGreen,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  flex1: { flex: 1 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceGreen,
  },
  paymentInfo: { flex: 1 },
  paymentLabel: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  paymentLabelActive: { color: Colors.primaryDark },
  paymentDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  upiInput: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceGreen,
    marginBottom: 6,
    letterSpacing: 1,
  },
  upiHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    lineHeight: 17,
    marginBottom: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderItemName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  orderItemQty: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginHorizontal: Spacing.sm,
  },
  orderItemPrice: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
  totalLabel: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  totalAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  notesInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  placeOrderBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.xl,
  },
  placeOrderTotal: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  placeOrderSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  placeOrderBtn: { minWidth: 160 },
});
