import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing } from '../constants/theme';
import Button from '../components/ui/Button';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'restaurant',
    iconColor: '#22c55e',
    title: 'Eat Healthy,\nFeel Amazing',
    subtitle:
      'Freshly crafted power bowls, salads and wraps — made with the finest ingredients, designed for your wellness.',
    bg: ['#0a2e12', '#166534'],
    accent: '#22c55e',
  },
  {
    id: '2',
    icon: 'flash',
    iconColor: '#4ade80',
    title: 'Fuel Your\nActive Life',
    subtitle:
      'Track calories, protein, and macros with every meal. Know exactly what goes into your body.',
    bg: ['#0f3d1a', '#1a7a3c'],
    accent: '#4ade80',
  },
  {
    id: '3',
    icon: 'bicycle',
    iconColor: '#86efac',
    title: 'Delivered to\nYour Door',
    subtitle:
      'Fast, fresh, and eco-friendly delivery. Your perfect meal, at your doorstep in 30 minutes.',
    bg: ['#14532d', '#22c55e'],
    accent: '#86efac',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = async () => {
    Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await completeOnboarding();
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = async () => {
    await completeOnboarding();
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item, index }) => (
    <LinearGradient colors={item.bg} style={styles.slide}>
      <SafeAreaView style={styles.safeSlide}>
        {index < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Icon Illustration */}
        <View style={styles.illustrationWrap}>
          <View style={[styles.outerRing, { borderColor: item.accent + '33' }]}>
            <View style={[styles.innerRing, { borderColor: item.accent + '55', backgroundColor: item.accent + '0d' }]}>
              <Ionicons name={item.icon} size={72} color={item.accent} />
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>

          {/* Progress Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => {
              const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 28, 8],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[styles.dot, { width: dotWidth, opacity, backgroundColor: item.accent }]}
                />
              );
            })}
          </View>

          <Button
            title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            onPress={handleNext}
            size="lg"
            fullWidth
            style={styles.ctaBtn}
          />

          {currentIndex === SLIDES.length - 1 && (
            <TouchableOpacity onPress={handleSkip} style={styles.loginLink} activeOpacity={0.7}>
              <Text style={styles.loginLinkText}>
                Already have an account?{' '}
                <Text style={styles.loginLinkBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, height },
  safeSlide: { flex: 1, paddingHorizontal: Spacing.lg },

  skipBtn: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },

  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 42,
    marginBottom: Spacing.md,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    fontWeight: '400',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },
  ctaBtn: { marginBottom: Spacing.md },
  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  loginLinkText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  loginLinkBold: {
    color: Colors.white,
    fontWeight: '700',
  },
});
