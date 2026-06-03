import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { platinumAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import Button from '../components/ui/Button';

const PERKS = [
  { icon: 'bicycle-outline', title: 'Free Delivery', desc: 'No delivery charges on every order' },
  { icon: 'pricetag-outline', title: '10% Off Everything', desc: 'Discount on all menu items' },
  { icon: 'flash-outline', title: 'Priority Orders', desc: 'Your orders jump the queue' },
  { icon: 'gift-outline', title: 'Exclusive Offers', desc: 'Members-only deals and discounts' },
  { icon: 'restaurant-outline', title: 'New Dishes First', desc: 'Early access to new menu items' },
];

export default function Platinum() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [upiRef, setUpiRef] = useState('');
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await platinumAPI.getStatus();
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!upiRef.trim()) {
      Alert.alert('Required', 'Please enter the UPI transaction reference after paying.');
      return;
    }
    setSubscribing(true);
    try {
      await platinumAPI.subscribe({ upiTransactionRef: upiRef });
      await refreshProfile();
      Alert.alert(
        'Submitted!',
        'Your Platinum subscription is being reviewed. You\'ll be activated within 2 hours.',
        [{ text: 'OK', onPress: () => { setShowPayment(false); fetchStatus(); } }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Subscription failed.');
    } finally {
      setSubscribing(false);
    }
  };

  const isActive = status?.isActive;
  const isPending = status?.paymentStatus === 'pending';

  return (
    <View style={styles.container}>
      {/* Hero */}
      <LinearGradient colors={['#f97316', '#c2410c']} style={styles.hero}>
        <SafeAreaView>
          <View style={styles.heroTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="star" size={28} color="#fbbf24" />
          </View>
          <Text style={styles.heroTitle}>Picoso Platinum</Text>
          <Text style={styles.heroSubtitle}>
            Upgrade your experience with exclusive member benefits
          </Text>
          <View style={styles.priceBadge}>
            <Text style={styles.price}>₹299</Text>
            <Text style={styles.priceLabel}>/month</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Banner */}
        {isActive && (
          <Animated.View entering={FadeInDown} style={styles.activeBanner}>
            <Ionicons name="star" size={20} color="#f97316" />
            <View style={styles.activeBannerInfo}>
              <Text style={styles.activeBannerTitle}>You're a Platinum Member!</Text>
              <Text style={styles.activeBannerSub}>
                Valid till {status?.endDate ? new Date(status.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          </Animated.View>
        )}

        {isPending && (
          <Animated.View entering={FadeInDown} style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={20} color={Colors.warning} />
            <Text style={styles.pendingText}>
              Your subscription is under review. We'll activate it within 2 hours.
            </Text>
          </Animated.View>
        )}

        {/* Perks */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionTitle}>What you get</Text>
          {PERKS.map((perk, i) => (
            <Animated.View
              key={perk.title}
              entering={FadeInDown.delay(i * 80 + 150)}
              style={styles.perkItem}
            >
              <View style={styles.perkIcon}>
                <Ionicons name={perk.icon} size={20} color={Colors.primary} />
              </View>
              <View style={styles.perkContent}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkDesc}>{perk.desc}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Comparison */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.comparison}>
          <Text style={styles.sectionTitle}>Free vs Platinum</Text>
          <View style={styles.compTable}>
            <View style={styles.compHeader}>
              <Text style={styles.compHeaderLabel}>Feature</Text>
              <Text style={styles.compHeaderFree}>Free</Text>
              <Text style={styles.compHeaderPlatinum}>Platinum</Text>
            </View>
            {[
              ['Delivery Fee', '₹49', 'FREE'],
              ['Discount', 'None', '10% off'],
              ['Order Priority', 'Normal', 'High'],
              ['Early Access', 'No', 'Yes'],
            ].map(([feature, free, platinum]) => (
              <View key={feature} style={styles.compRow}>
                <Text style={styles.compFeature}>{feature}</Text>
                <Text style={styles.compFreeVal}>{free}</Text>
                <Text style={styles.compPlatVal}>{platinum}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* How to Subscribe */}
        {!isActive && !isPending && (
          <Animated.View entering={FadeInDown.delay(500)} style={styles.howTo}>
            <Text style={styles.sectionTitle}>How to Subscribe</Text>
            {[
              'Pay ₹299 via UPI to picoso@upi',
              'Copy the transaction ID (UTR number)',
              'Enter it below and submit',
              'We\'ll activate within 2 hours!',
            ].map((step, i) => (
              <View key={i} style={styles.howToStep}>
                <View style={styles.howToNum}>
                  <Text style={styles.howToNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.howToText}>{step}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Payment Form */}
        {!isActive && !isPending && showPayment && (
          <Animated.View entering={FadeInDown} style={styles.paymentForm}>
            <View style={styles.upiIdBox}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
              <Text style={styles.upiIdText}>Pay to: </Text>
              <Text style={styles.upiId}>picoso@upi</Text>
            </View>
            <TextInput
              style={styles.upiInput}
              placeholder="Enter UTR / Transaction ID"
              placeholderTextColor={Colors.textMuted}
              value={upiRef}
              onChangeText={setUpiRef}
              autoCapitalize="characters"
            />
            <View style={styles.formBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setShowPayment(false)}
                style={styles.flex1}
              />
              <Button
                title="Submit"
                onPress={handleSubscribe}
                loading={subscribing}
                style={[styles.flex1, { marginLeft: 8 }]}
              />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* CTA */}
      {!isActive && !isPending && (
        <View style={styles.ctaBar}>
          <Button
            title={showPayment ? 'Cancel' : 'Subscribe for ₹299/mo'}
            onPress={() => setShowPayment(!showPayment)}
            variant={showPayment ? 'outline' : 'platinum'}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  hero: {
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  heroTop: {
    paddingTop: Spacing.base,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  price: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
  },
  priceLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    gap: Spacing.md,
  },
  activeBannerInfo: { flex: 1 },
  activeBannerTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  activeBannerSub: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#92400e',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
    letterSpacing: -0.3,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  perkIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.platinumLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkEmoji: { fontSize: 22 },
  perkContent: { flex: 1 },
  perkTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  perkDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  comparison: { marginTop: Spacing.xl },
  compTable: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  compHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  compHeaderLabel: { flex: 1, color: Colors.white, fontWeight: '700', fontSize: FontSizes.sm },
  compHeaderFree: { width: 70, color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: FontSizes.sm, textAlign: 'center' },
  compHeaderPlatinum: { width: 80, color: Colors.white, fontWeight: '700', fontSize: FontSizes.sm, textAlign: 'center' },
  compRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  compFeature: { flex: 1, fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  compFreeVal: { width: 70, fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center' },
  compPlatVal: { width: 80, fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '700', textAlign: 'center' },
  howTo: { marginTop: Spacing.xl },
  howToStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  howToNum: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.platinumLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
  },
  howToNumText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.platinum,
  },
  howToText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  paymentForm: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginTop: Spacing.base,
    ...Shadow.md,
  },
  upiIdBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  upiIdText: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  upiId: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.primaryDark,
    letterSpacing: 0.5,
  },
  upiInput: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  formBtns: {
    flexDirection: 'row',
  },
  flex1: { flex: 1 },
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.xl,
  },
});
