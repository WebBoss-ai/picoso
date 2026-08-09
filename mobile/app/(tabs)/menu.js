import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { bowlsAPI } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import Colors, { MENU_CATEGORIES } from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import BowlCard from '../../components/BowlCard';
import MenuCategoryPopup from '../../components/MenuCategoryPopup';
import { OfferStrip, CartBar } from '../../components/PromoBanner';
import { BowlCardSkeleton } from '../../components/ui/Skeleton';

export default function MenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { totalItems, totalAmount, items } = useCart();
  const listRef = useRef(null);

  const [bowls, setBowls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(params.q || '');
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState(params.category || 'all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [specialFilter, setSpecialFilter] = useState(params.filter || null);

  const fetchBowls = useCallback(async () => {
    try {
      const res = await bowlsAPI.getAll();
      const raw = res.data;
      const all = Array.isArray(raw) ? raw
        : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw?.bowls) ? raw.bowls
        : [];
      setBowls(all);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBowls(); }, []);

  useEffect(() => {
    if (params.category) setActiveCategory(params.category);
    if (params.filter) setSpecialFilter(params.filter);
    if (params.q) setSearch(params.q);
  }, [params.category, params.filter, params.q]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBowls();
  }, [fetchBowls]);

  const filtered = useMemo(() => {
    let list = bowls;
    if (vegOnly) list = list.filter((b) => b.isVeg !== false);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    if (specialFilter === 'bestsellers') list = list.filter((b) => b.isBestseller);
    else if (specialFilter === 'under99') list = list.filter((b) => b.price <= 99);
    else if (specialFilter === 'new') list = list.filter((b) => b.isNew);

    if (activeCategory !== 'all' && !specialFilter) {
      list = list.filter(
        (b) =>
          b.pfCategory?.toLowerCase() === activeCategory ||
          b.category?.toLowerCase() === activeCategory
      );
    }
    return list;
  }, [bowls, vegOnly, search, activeCategory, specialFilter]);

  // Build sections grouped by category for "all" view
  const sections = useMemo(() => {
    if (activeCategory !== 'all' || specialFilter || search.trim()) {
      const label =
        specialFilter === 'bestsellers' ? 'Bestsellers'
          : specialFilter === 'under99' ? 'Under ₹99'
            : specialFilter === 'new' ? 'Fresh Arrivals'
              : activeCategory === 'all'
                ? 'All Items'
                : MENU_CATEGORIES.find((c) => c.id === activeCategory)?.label || activeCategory;

      // Pair items into rows of 2 for grid
      const rows = [];
      for (let i = 0; i < filtered.length; i += 2) {
        rows.push({ key: `row-${i}`, items: filtered.slice(i, i + 2) });
      }
      return [{ title: label, count: filtered.length, data: rows, sampleImage: filtered[0]?.image }];
    }

    // Group by category
    const groups = {};
    filtered.forEach((b) => {
      const cat = (b.pfCategory || b.category || 'pf-meals').toLowerCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    });

    const catSections = Object.entries(groups)
      .map(([cat, items]) => {
        const meta = MENU_CATEGORIES.find((c) => c.id === cat);
        const rows = [];
        for (let i = 0; i < items.length; i += 2) {
          rows.push({ key: `row-${cat}-${i}`, items: items.slice(i, i + 2) });
        }
        return {
          title: meta?.label || cat.charAt(0).toUpperCase() + cat.slice(1),
          id: cat,
          count: items.length,
          data: rows,
          sampleImage: items[0]?.image,
        };
      })
      .filter((s) => s.count > 0);

    // Food in minutes at the top (before Bowls)
    const express = filtered.filter((b) => b.isFoodInMinutes);
    if (express.length > 0) {
      const rows = [];
      for (let i = 0; i < express.length; i += 2) {
        rows.push({ key: `row-fim-${i}`, items: express.slice(i, i + 2) });
      }
      catSections.unshift({
        title: 'Food in minutes',
        id: 'food-in-minutes',
        count: express.length,
        data: rows,
        sampleImage: express[0]?.image,
        isFoodInMinutes: true,
        deliveryEta: '12 to 16 minutes',
      });
    }

    return catSections;
  }, [filtered, activeCategory, specialFilter, search]);

  const categoryCounts = useMemo(() => {
    return MENU_CATEGORIES.map((cat) => ({
      ...cat,
      count:
        cat.id === 'all'
          ? bowls.length
          : bowls.filter(
              (b) =>
                b.pfCategory?.toLowerCase() === cat.id ||
                b.category?.toLowerCase() === cat.id
            ).length,
    })).filter((c) => c.id === 'all' || c.count > 0);
  }, [bowls]);

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    setSpecialFilter(null);
    setSearch('');
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  };

  const cartThumb = items[0]?.image;

  const renderSectionHeader = ({ section }) => (
    <View style={[styles.sectionHeader, section.isFoodInMinutes && styles.expressHeader]}>
      {section.isFoodInMinutes ? (
        <View style={styles.expressIcon}>
          <Ionicons name="flash" size={18} color="#3f6212" />
        </View>
      ) : section.sampleImage ? (
        <Image
          source={{ uri: section.sampleImage }}
          style={styles.sectionThumb}
          contentFit="cover"
        />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, section.isFoodInMinutes && styles.expressTitle]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, section.isFoodInMinutes && styles.expressCount]}>
          {section.isFoodInMinutes
            ? `${section.deliveryEta || '12 to 16 minutes'} · quick delivery`
            : `${section.count} items`}
        </Text>
      </View>
    </View>
  );

  const renderRow = ({ item, section }) => (
    <View style={styles.gridRow}>
      {item.items.map((bowl) => (
        <View key={bowl._id} style={styles.gridItem}>
          <BowlCard
            bowl={bowl}
            deliveryEta={section?.isFoodInMinutes ? (section.deliveryEta || '12 to 16 minutes') : null}
          />
        </View>
      ))}
      {item.items.length === 1 && <View style={styles.gridItem} />}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Sticky Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search "${bowls[0]?.name || 'Bhel Puri'}"`}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setSpecialFilter(null);
            }}
            returnKeyType="search"
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

        {/* Promo mini banner */}
        <TouchableOpacity
          style={styles.promoMini}
          onPress={() => router.push('/platinum')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.promoMiniInner}
          >
            <Text style={styles.promoMiniText}>NEW ON{'\n'}PICOSO</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Explore Menu Banner */}
      {!search && !specialFilter && activeCategory === 'all' && (
        <View style={styles.exploreBanner}>
          <LinearGradient
            colors={['#E8F8F1', '#D1F2E4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.exploreInner}
          >
            <Ionicons name="book-outline" size={28} color={Colors.primary} />
            <Text style={styles.exploreText}>explore menu</Text>
          </LinearGradient>
        </View>
      )}

      {/* Active filter chips */}
      {(specialFilter || activeCategory !== 'all') && (
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => {
              setActiveCategory('all');
              setSpecialFilter(null);
            }}
          >
            <Ionicons name="close" size={12} color={Colors.primary} />
            <Text style={styles.filterChipText}>
              {specialFilter === 'bestsellers'
                ? 'Bestsellers'
                : specialFilter === 'under99'
                  ? 'Under ₹99'
                  : specialFilter === 'new'
                    ? 'Fresh Arrivals'
                    : MENU_CATEGORIES.find((c) => c.id === activeCategory)?.label || activeCategory}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.loadingGrid} showsVerticalScrollIndicator={false}>
          <View style={styles.gridRow}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.gridItem}>
                <BowlCardSkeleton />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : sections.length === 0 || (sections[0]?.data?.length === 0) ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search-outline" size={30} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearch('');
              setActiveCategory('all');
              setSpecialFilter(null);
              setVegOnly(false);
            }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: totalItems > 0 ? 160 : 100 },
          ]}
          onScroll={(e) => {
            setShowBackToTop(e.nativeEvent.contentOffset.y > 400);
          }}
          scrollEventThrottle={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* Back to top */}
      {showBackToTop && (
        <TouchableOpacity
          style={styles.backToTop}
          onPress={() => listRef.current?.scrollToLocation?.({ sectionIndex: 0, itemIndex: 0, animated: true })}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-up" size={14} color={Colors.white} />
          <Text style={styles.backToTopText}>Back to top</Text>
        </TouchableOpacity>
      )}

      {/* Floating Menu FAB */}
      <TouchableOpacity
        style={[styles.menuFab, totalItems > 0 && styles.menuFabRaised]}
        onPress={() => setMenuOpen(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="restaurant" size={16} color={Colors.white} />
        <Text style={styles.menuFabText}>Menu</Text>
      </TouchableOpacity>

      {/* Offer + Cart */}
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

      <MenuCategoryPopup
        visible={menuOpen}
        categories={categoryCounts}
        activeCategory={activeCategory}
        onSelect={handleCategorySelect}
        onClose={() => setMenuOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  searchDivider: {
    width: 1,
    height: 22,
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

  promoMini: {
    width: 56,
    height: 44,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  promoMiniInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoMiniText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 11,
  },

  exploreBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  exploreInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  exploreText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryDarker,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  filterBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primary,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  sectionThumb: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  expressHeader: {
    backgroundColor: '#ecfccb',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#bef264',
    paddingTop: Spacing.md,
  },
  expressIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: '#d9f99d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expressTitle: {
    color: '#14532d',
  },
  expressCount: {
    color: '#3f6212',
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: Spacing.sm,
  },
  loadingGrid: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.base,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridItem: {
    width: '50%',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  clearBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  clearBtnText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },

  backToTop: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cartBarBg,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 5,
    zIndex: 25,
    ...Shadow.md,
  },
  backToTopText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: '600',
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
  menuFabRaised: { bottom: 140 },
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
