import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { bowlsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import BowlCard from '../../components/BowlCard';
import CategoryChip from '../../components/CategoryChip';
import { BowlCardSkeleton } from '../../components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'meals', label: 'Meals' },
  { id: 'salads', label: 'Salads' },
  { id: 'beverages', label: 'Beverages' },
  { id: 'wraps', label: 'Wraps' },
  { id: 'sandwiches', label: 'Sandwiches' },
];

const STATS = [
  { icon: 'restaurant-outline', value: '50+', label: 'Menu Items' },
  { icon: 'flash-outline', value: '30 min', label: 'Avg Delivery' },
  { icon: 'star-outline', value: '4.8', label: 'Rating' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { totalItems, totalAmount } = useCart();
  const [bowls, setBowls] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await bowlsAPI.getAll();
      const raw = res.data;
      const all = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.bowls) ? raw.bowls
        : [];
      setBowls(all);
      setFeatured(all.filter((b) => b.isBestseller || b.isNew).slice(0, 6));
    } catch (e) {
      console.warn('Failed to load bowls', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const filteredBowls = activeCategory === 'all'
    ? bowls.slice(0, 8)
    : bowls.filter((b) => b.pfCategory?.toLowerCase() === activeCategory).slice(0, 8);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Header */}
        <LinearGradient colors={Colors.gradientHero} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topBar}>
              <View>
                <Text style={styles.greeting}>{getGreeting()}</Text>
                <Text style={styles.username}>{firstName}</Text>
              </View>
              <View style={styles.topActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => router.push('/platinum')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="diamond-outline" size={19} color="#fed7aa" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => router.push('/(tabs)/cart')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bag-outline" size={19} color={Colors.white} />
                  {totalItems > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{totalItems}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Hero Banner */}
            <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.heroBanner}>
              <View style={styles.heroBannerContent}>
                <View style={styles.heroPill}>
                  <Ionicons name="leaf" size={11} color={Colors.primary} />
                  <Text style={styles.heroPillText}>Fresh &amp; Healthy</Text>
                </View>
                <Text style={styles.heroTitle}>Power Bowls{'\n'}Built for You</Text>
                <Text style={styles.heroSubtitle}>
                  Wholesome meals delivered to your door in 30 minutes
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/menu')}
                  style={styles.heroBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.heroBtnText}>Order Now</Text>
                  <Ionicons name="arrow-forward" size={15} color={Colors.white} />
                </TouchableOpacity>
              </View>
              <View style={styles.heroBowlIcon}>
                <Ionicons name="restaurant" size={52} color="rgba(34,197,94,0.25)" />
              </View>
            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            {STATS.map((stat, idx) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <Ionicons name={stat.icon} size={18} color={Colors.primary} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {idx < STATS.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Platinum Banner */}
        {!user?.platinumStatus && (
          <TouchableOpacity
            onPress={() => router.push('/platinum')}
            activeOpacity={0.9}
            style={styles.platinumWrapper}
          >
            <LinearGradient
              colors={['#f97316', '#dc2626']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.platinumBanner}
            >
              <View style={styles.platinumIconWrap}>
                <Ionicons name="diamond" size={20} color="#fff" />
              </View>
              <View style={styles.platinumText}>
                <Text style={styles.platinumTitle}>Picoso Platinum</Text>
                <Text style={styles.platinumSubtitle}>Free delivery + 10% off every order</Text>
              </View>
              <View style={styles.platinumCta}>
                <Text style={styles.platinumPrice}>₹299/mo</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Category Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/menu')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                category={cat.id}
                label={cat.label}
                selected={activeCategory === cat.id}
                onPress={() => setActiveCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Bowl Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeCategory === 'all' ? 'For You' : CATEGORIES.find(c => c.id === activeCategory)?.label}
            </Text>
          </View>
          {loading ? (
            <View style={styles.grid}>
              {[1, 2, 3, 4].map((i) => <BowlCardSkeleton key={i} />)}
            </View>
          ) : filteredBowls.length > 0 ? (
            <View style={styles.grid}>
              {filteredBowls.map((bowl, i) => (
                <Animated.View
                  key={bowl._id}
                  entering={FadeInDown.delay(i * 70).duration(400)}
                  style={styles.gridItem}
                >
                  <BowlCard bowl={bowl} />
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="restaurant-outline" size={32} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No items in this category</Text>
            </View>
          )}
        </View>

        {/* Bestsellers / Featured */}
        {featured.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bestsellers</Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/menu')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.seeAll}>View all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            >
              {featured.map((bowl, i) => (
                <Animated.View
                  key={bowl._id}
                  entering={FadeInRight.delay(i * 90).duration(400)}
                >
                  <TouchableOpacity
                    onPress={() => router.push(`/bowl/${bowl._id}`)}
                    activeOpacity={0.9}
                    style={styles.featuredCard}
                  >
                    <Image
                      source={{ uri: bowl.image }}
                      style={styles.featuredImage}
                      contentFit="cover"
                      transition={300}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(10,46,18,0.88)']}
                      style={styles.featuredGradient}
                    >
                      <Text style={styles.featuredName} numberOfLines={1}>{bowl.name}</Text>
                      <Text style={styles.featuredPrice}>₹{bowl.price}</Text>
                    </LinearGradient>
                    {bowl.isBestseller && (
                      <View style={styles.featuredBadge}>
                        <Ionicons name="star" size={9} color="#fff" />
                        <Text style={styles.featuredBadgeText}>Best</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Cart FAB */}
      {totalItems > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/cart')}
          style={styles.cartFab}
          activeOpacity={0.92}
        >
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cartFabInner}
          >
            <View style={styles.cartFabLeft}>
              <Ionicons name="bag" size={17} color={Colors.white} />
              <Text style={styles.cartFabText}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</Text>
            </View>
            <View style={styles.cartFabRight}>
              <Text style={styles.cartFabAmount}>₹{totalAmount}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafb' },
  scrollContent: { paddingBottom: 16 },
  hero: { paddingBottom: Spacing.xl },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  greeting: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  username: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  topActions: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.deepBg,
  },
  cartBadgeText: { fontSize: 9, color: Colors.white, fontWeight: '800' },

  heroBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroBannerContent: { flex: 1 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)',
  },
  heroPillText: { fontSize: 10, fontWeight: '700', color: '#86efac', letterSpacing: 0.3 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 27,
    marginBottom: 7,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.58)',
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    gap: 5,
  },
  heroBtnText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  heroBowlIcon: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statsContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: -1,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  statDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
    backgroundColor: '#f1f5f9',
  },
  statValue: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  platinumWrapper: { marginHorizontal: Spacing.lg, marginTop: Spacing.base },
  platinumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    gap: 12,
  },
  platinumIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  platinumText: { flex: 1 },
  platinumTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  platinumSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.72)',
  },
  platinumCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  platinumPrice: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.white,
  },

  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  categoryList: {
    paddingRight: Spacing.lg,
    paddingBottom: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: { width: '50%' },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: '#f8fafb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  featuredList: { paddingRight: Spacing.lg, gap: 12 },
  featuredCard: {
    width: 148,
    height: 190,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.card,
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 24,
  },
  featuredName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 2,
  },
  featuredPrice: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.primary,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#f59e0b',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
  },

  bottomPad: { height: 90 },

  cartFab: {
    position: 'absolute',
    bottom: 76,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.green,
  },
  cartFabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
  },
  cartFabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartFabText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  cartFabRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartFabAmount: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontWeight: '800',
  },
});
