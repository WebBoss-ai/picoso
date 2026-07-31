import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { bowlsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import Colors, { MENU_CATEGORIES } from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import BowlCard from '../../components/BowlCard';
import CategoryGrid from '../../components/CategoryGrid';
import PromoBanner, { OfferStrip, CartBar } from '../../components/PromoBanner';
import MenuCategoryPopup from '../../components/MenuCategoryPopup';
import { BowlCardSkeleton } from '../../components/ui/Skeleton';

const QUICK_CARDS = [
  { id: 'bestsellers', title: 'Bestsellers', subtitle: 'Most loved', colors: ['#E8F8F1', '#B8E6D4'], accent: Colors.primary, icon: 'star' },
  { id: 'under99', title: 'Under ₹99', subtitle: 'Budget bites', colors: ['#FFF7E6', '#FDE68A'], accent: '#D97706', icon: 'pricetag' },
  { id: 'new', title: 'Fresh Arrivals', subtitle: 'Just in', colors: ['#F3E8FF', '#DDD6FE'], accent: '#7C3AED', icon: 'sparkles' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { totalItems, totalAmount, items } = useCart();
  const [bowls, setBowls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await bowlsAPI.getAll();
      const raw = res.data;
      const all = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.bowls) ? raw.bowls
        : [];
      setBowls(all);
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

  const filtered = useMemo(() => {
    let list = bowls;
    if (vegOnly) list = list.filter((b) => b.isVeg !== false);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => b.name?.toLowerCase().includes(q));
    }
    return list;
  }, [bowls, vegOnly, search]);

  const bestsellers = useMemo(
    () => filtered.filter((b) => b.isBestseller).slice(0, 6),
    [filtered]
  );
  const under99 = useMemo(
    () => filtered.filter((b) => b.price <= 99).slice(0, 6),
    [filtered]
  );
  const freshArrivals = useMemo(
    () => filtered.filter((b) => b.isNew).slice(0, 6),
    [filtered]
  );

  const categoryCounts = useMemo(() => {
    return MENU_CATEGORIES.map((cat) => ({
      ...cat,
      count: cat.id === 'all'
        ? bowls.length
        : bowls.filter(
            (b) =>
              b.pfCategory?.toLowerCase() === cat.id ||
              b.category?.toLowerCase() === cat.id
          ).length,
    })).filter((c) => c.id === 'all' || c.count > 0);
  }, [bowls]);

  const deliveryMins = user?.platinumStatus ? '10' : '25';
  const cartThumb = items[0]?.image;

  const handleQuickCard = (id) => {
    if (id === 'bestsellers') router.push({ pathname: '/(tabs)/menu', params: { filter: 'bestsellers' } });
    else if (id === 'under99') router.push({ pathname: '/(tabs)/menu', params: { filter: 'under99' } });
    else router.push({ pathname: '/(tabs)/menu', params: { filter: 'new' } });
  };

  const handleCategorySelect = (catId) => {
    router.push({ pathname: '/(tabs)/menu', params: { category: catId } });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
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
        {/* ── Hero Header ── */}
        <LinearGradient colors={Colors.gradientHero} style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.locationWrap}
                onPress={() => router.push('/addresses')}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryTime}>{deliveryMins} Minutes</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {user?.savedAddresses?.[0]?.city || user?.savedAddresses?.[0]?.line1 || 'Set delivery location'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
                </View>
              </TouchableOpacity>

              <View style={styles.topActions}>
                {!user?.platinumStatus && (
                  <TouchableOpacity
                    style={styles.earnPill}
                    onPress={() => router.push('/platinum')}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cafe" size={12} color="#FED7AA" />
                    <Text style={styles.earnText}>EARN ₹250</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.profileBtn}
                  onPress={() => router.push('/(tabs)/profile')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search + VEG toggle */}
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={Colors.primary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search "${bowls[0]?.name || 'Bhel Puri'}"`}
                  placeholderTextColor={Colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  onSubmitEditing={() => {
                    if (search.trim()) router.push({ pathname: '/(tabs)/menu', params: { q: search } });
                  }}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
                <View style={styles.searchDivider} />
                <TouchableOpacity
                  style={styles.vegToggle}
                  onPress={() => setVegOnly((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.vegLabel, vegOnly && styles.vegLabelOn]}>VEG</Text>
                  <View style={[styles.vegSwitch, vegOnly && styles.vegSwitchOn]}>
                    <View style={[styles.vegKnob, vegOnly && styles.vegKnobOn]} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Promo Banner */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.promoWrap}>
          <PromoBanner />
        </Animated.View>

        {/* Category Grid */}
        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What's on your mind?</Text>
          </View>
          {loading ? (
            <View style={styles.catSkeleton}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.catSkelItem} />
              ))}
            </View>
          ) : (
            <CategoryGrid
              bowls={bowls}
              onSelect={handleCategorySelect}
            />
          )}
        </Animated.View>

        {/* Quick Access Cards */}
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRow}
          >
            {QUICK_CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.quickCard}
                onPress={() => handleQuickCard(card.id)}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={card.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.quickGradient}
                >
                  <Text style={[styles.quickTitle, { color: card.accent }]}>{card.title}</Text>
                  <Text style={styles.quickSub}>{card.subtitle}</Text>
                  <View style={[styles.quickArrow, { backgroundColor: card.accent }]}>
                    <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Bestsellers horizontal */}
        {bestsellers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Bestsellers</Text>
              <TouchableOpacity onPress={() => handleQuickCard('bestsellers')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {bestsellers.map((bowl, i) => (
                <Animated.View
                  key={bowl._id}
                  entering={FadeInRight.delay(i * 60).duration(350)}
                  style={styles.hCard}
                >
                  <BowlCard bowl={bowl} />
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Under ₹99 */}
        {under99.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Under ₹99</Text>
              <TouchableOpacity onPress={() => handleQuickCard('under99')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {under99.map((bowl) => (
                <View key={bowl._id} style={styles.hCard}>
                  <BowlCard bowl={bowl} />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Fresh Arrivals */}
        {freshArrivals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Fresh Arrivals</Text>
              <TouchableOpacity onPress={() => handleQuickCard('new')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.grid}>
              {freshArrivals.slice(0, 4).map((bowl) => (
                <View key={bowl._id} style={styles.gridItem}>
                  <BowlCard bowl={bowl} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Platinum / Referral banner */}
        {!user?.platinumStatus && (
          <TouchableOpacity
            onPress={() => router.push('/platinum')}
            activeOpacity={0.9}
            style={styles.referralWrap}
          >
            <LinearGradient
              colors={['#1BA672', '#0B3D2E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.referralBanner}
            >
              <View style={styles.referralContent}>
                <Text style={styles.referralTitle}>GET ₹250 + FREE Cold Coffee</Text>
                <Text style={styles.referralSub}>Invite your friends & earn rewards</Text>
              </View>
              <View style={styles.referralRight}>
                <Text style={styles.referralAmount}>₹250</Text>
                <View style={styles.referralArrow}>
                  <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* For You grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For You</Text>
          {loading ? (
            <View style={styles.grid}>
              {[1, 2, 3, 4].map((i) => <BowlCardSkeleton key={i} />)}
            </View>
          ) : filtered.length > 0 ? (
            <View style={styles.grid}>
              {filtered.slice(0, 8).map((bowl) => (
                <View key={bowl._id} style={styles.gridItem}>
                  <BowlCard bowl={bowl} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          )}
        </View>

        <View style={{ height: totalItems > 0 ? 160 : 100 }} />
      </ScrollView>

      {/* Floating Menu FAB */}
      <TouchableOpacity
        style={[styles.menuFab, totalItems > 0 && styles.menuFabRaised]}
        onPress={() => setMenuOpen(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="restaurant" size={16} color={Colors.white} />
        <Text style={styles.menuFabText}>Menu</Text>
      </TouchableOpacity>

      {/* Offer strip + Cart bar */}
      {totalItems > 0 && (
        <View style={styles.bottomBars}>
          <OfferStrip />
          <CartBar
            totalItems={totalItems}
            totalAmount={totalAmount}
            thumbnail={cartThumb}
            onPress={() => router.push('/(tabs)/cart')}
          />
        </View>
      )}

      {/* Category popup */}
      <MenuCategoryPopup
        visible={menuOpen}
        categories={categoryCounts}
        activeCategory="all"
        onSelect={handleCategorySelect}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { paddingBottom: 16 },

  hero: {
    paddingBottom: Spacing.base,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  locationWrap: { flex: 1, marginRight: 12 },
  deliveryTime: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    maxWidth: 180,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  earnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  earnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FED7AA',
    letterSpacing: 0.3,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  vegToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  vegLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  vegLabelOn: { color: Colors.primary },
  vegSwitch: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.borderMedium,
    padding: 2,
    justifyContent: 'center',
  },
  vegSwitchOn: { backgroundColor: Colors.primary },
  vegKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.white,
  },
  vegKnobOn: { alignSelf: 'flex-end' },

  promoWrap: { marginTop: Spacing.base },

  sectionHeader: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeaderRow: {
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
  section: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },

  catSkeleton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: 12,
  },
  catSkelItem: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
  },

  quickRow: {
    paddingHorizontal: Spacing.base,
    gap: 12,
    marginTop: Spacing.lg,
  },
  quickCard: {
    width: 140,
    height: 100,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  quickGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  quickTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  quickSub: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  quickArrow: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },

  hList: { gap: 4, paddingRight: Spacing.base },
  hCard: { width: 160 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  gridItem: { width: '50%' },

  referralWrap: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  referralBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 16,
    gap: 12,
  },
  referralContent: { flex: 1 },
  referralTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 2,
  },
  referralSub: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  referralRight: {
    alignItems: 'center',
    gap: 6,
  },
  referralAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  referralArrow: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  menuFab: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 6,
    ...Shadow.green,
    zIndex: 20,
  },
  menuFabRaised: {
    bottom: 140,
  },
  menuFabText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },

  bottomBars: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    zIndex: 15,
  },
});
