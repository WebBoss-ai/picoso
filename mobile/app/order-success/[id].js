import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import Button from '../../components/ui/Button';

const CONFETTI_COLORS = ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#dcfce7', '#86efac', '#22c55e'];

function ConfettiPiece({ color, delay, size }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 700,
        duration: 2000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2500,
        delay: delay + 1000,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() > 0.5 ? 1 : -1,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotateVal = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: `${Math.random() * 100}%`,
        width: size,
        height: size * 0.5,
        borderRadius: 2,
        backgroundColor: color,
        transform: [{ translateY }, { rotate: rotateVal }],
        opacity,
      }}
    />
  );
}

export default function OrderSuccess() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.delay(300),
      Animated.spring(checkScale, {
        toValue: 1,
        damping: 12,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(600),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const confetti = Array.from({ length: 20 }).map((_, i) => ({
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: i * 100,
    size: 8 + Math.random() * 8,
  }));

  return (
    <LinearGradient colors={Colors.gradientHero} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Confetti */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confetti.map((c, i) => (
            <ConfettiPiece key={i} color={c.color} delay={c.delay} size={c.size} />
          ))}
        </View>

        {/* Check Animation */}
        <Animated.View
          style={[styles.checkCircle, { transform: [{ scale: checkScale }] }]}
        >
          <View style={styles.checkInner}>
            <Ionicons name="checkmark" size={52} color={Colors.primary} />
          </View>
        </Animated.View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>
            Your delicious meal is being prepared with love. Sit back and relax!
          </Text>

          <View style={styles.orderIdCard}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderIdValue}>#{id.slice(-8).toUpperCase()}</Text>
          </View>

          {/* Timeline */}
          <View style={styles.timeline}>
            {[
              { icon: 'checkmark-circle', label: 'Order Confirmed', done: true },
              { icon: 'restaurant-outline', label: 'Being Prepared', done: false },
              { icon: 'bicycle-outline', label: 'Out for Delivery', done: false },
              { icon: 'home-outline', label: 'Delivered', done: false },
            ].map((step, i, arr) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Ionicons
                    name={step.icon}
                    size={18}
                    color={step.done ? Colors.primary : 'rgba(255,255,255,0.3)'}
                  />
                  {i < arr.length - 1 && (
                    <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} />
                  )}
                </View>
                <Text style={[styles.timelineLabel, step.done && styles.timelineLabelDone]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          {/* ETD */}
          <View style={styles.etdCard}>
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.etdText}>Estimated delivery: <Text style={styles.etdBold}>30-45 minutes</Text></Text>
          </View>

          {/* Actions */}
          <Button
            title="Track Order"
            onPress={() => router.replace(`/order/${id}`)}
            fullWidth
            size="lg"
            style={styles.trackBtn}
          />
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.homeBtn}
          >
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  checkInner: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', width: '100%' },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  orderIdCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  orderIdLabel: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  orderIdValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 2,
  },
  timeline: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 2,
  },
  timelineLineDone: { backgroundColor: Colors.primary },
  timelineLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    paddingTop: 2,
    paddingBottom: Spacing.md,
  },
  timelineLabelDone: {
    color: Colors.white,
    fontWeight: '700',
  },
  etdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    marginBottom: Spacing.xl,
    gap: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  etdText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  etdBold: {
    fontWeight: '700',
    color: Colors.primary,
  },
  trackBtn: { marginBottom: Spacing.md },
  homeBtn: { paddingVertical: Spacing.md },
  homeBtnText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
});
