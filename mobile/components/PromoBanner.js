import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 140;

const DEFAULT_BANNERS = [
  {
    id: 'offer',
    type: 'gradient',
    colors: ['#1BA672', '#0F7A52'],
    title: '50% OFF UNLOCKED',
    subtitle: '~ FREE DELIVERY ~',
    cta: 'Use Code: TRY50',
    icon: 'flash',
  },
  {
    id: 'referral',
    type: 'gradient',
    colors: ['#0B3D2E', '#1BA672'],
    title: 'GET ₹250 + FREE Coffee',
    subtitle: 'Invite your friends & earn',
    cta: 'Invite Now',
    icon: 'gift',
  },
];

export default function PromoBanner({
  banners = DEFAULT_BANNERS,
  onPress,
  style,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 12));
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  return (
    <View style={[styles.wrapper, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={BANNER_WIDTH + 12}
        contentContainerStyle={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={() => onPress?.(banner)}
            style={styles.bannerWrap}
          >
            {banner.type === 'image' && banner.image ? (
              <Image
                source={{ uri: banner.image }}
                style={styles.bannerImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={banner.colors || Colors.gradientOffer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
              >
                <View style={styles.bannerContent}>
                  <Text style={styles.bannerTitle}>{banner.title}</Text>
                  {banner.subtitle ? (
                    <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  ) : null}
                  {banner.cta ? (
                    <View style={styles.ctaPill}>
                      <Text style={styles.ctaText}>{banner.cta}</Text>
                    </View>
                  ) : null}
                </View>
                {banner.icon && (
                  <View style={styles.iconWrap}>
                    <Ionicons name={banner.icon} size={48} color="rgba(255,255,255,0.2)" />
                  </View>
                )}
              </LinearGradient>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/** Thin sticky offer strip shown above cart bar */
export function OfferStrip({ text = 'You unlocked a sweet deal! 50% upto ₹150 Off', onPress }) {
  return (
    <TouchableOpacity
      style={styles.offerStrip}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.offerIcon}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
      </View>
      <Text style={styles.offerText} numberOfLines={1}>{text}</Text>
      <View style={styles.offerProgress}>
        <View style={styles.offerProgressFill} />
      </View>
    </TouchableOpacity>
  );
}

/** Sticky bottom cart bar matching Swiggy design */
export function CartBar({ totalItems, totalAmount, thumbnail, onPress }) {
  if (!totalItems || totalItems <= 0) return null;

  return (
    <TouchableOpacity style={styles.cartBar} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.cartBarLeft}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.cartThumb} contentFit="cover" />
        ) : (
          <View style={[styles.cartThumb, styles.cartThumbPlaceholder]}>
            <Ionicons name="bag" size={16} color={Colors.white} />
          </View>
        )}
        <View>
          <Text style={styles.cartItemCount}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </Text>
          <Text style={styles.cartAmount}>₹{totalAmount}</Text>
        </View>
      </View>
      <View style={styles.viewCartBtn}>
        <Text style={styles.viewCartText}>View Cart</Text>
        <Ionicons name="arrow-forward" size={16} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.sm },
  scroll: {
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  bannerWrap: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  banner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerContent: { flex: 1 },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  ctaText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  iconWrap: {
    marginLeft: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderMedium,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 16,
  },

  // Offer strip
  offerStrip: {
    backgroundColor: Colors.offerBg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGreen,
  },
  offerIcon: {},
  offerText: {
    flex: 1,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primaryDarker,
  },
  offerProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.borderGreen,
  },
  offerProgressFill: {
    width: '65%',
    height: '100%',
    backgroundColor: Colors.primary,
  },

  // Cart bar
  cartBar: {
    backgroundColor: Colors.cartBarBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    ...Shadow.lg,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartThumb: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: '#333',
  },
  cartThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  cartItemCount: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  cartAmount: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  viewCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cartBarGreen,
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  viewCartText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
});
