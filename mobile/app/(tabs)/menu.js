import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { bowlsAPI } from '../../lib/api';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import BowlCard from '../../components/BowlCard';
import CategoryChip from '../../components/CategoryChip';
import { BowlCardSkeleton } from '../../components/ui/Skeleton';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'meals', label: 'Meals' },
  { id: 'salads', label: 'Salads' },
  { id: 'beverages', label: 'Beverages' },
  { id: 'wraps', label: 'Wraps' },
  { id: 'sandwiches', label: 'Sandwiches' },
];

export default function MenuScreen() {
  const [bowls, setBowls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const searchRef = useRef(null);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBowls();
  }, [fetchBowls]);

  const filtered = bowls.filter((b) => {
    const matchesCategory =
      activeCategory === 'all' || b.pfCategory?.toLowerCase() === activeCategory;
    const matchesSearch =
      !search || b.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item }) => (
    <View style={viewMode === 'grid' ? styles.gridItem : styles.listItem}>
      <BowlCard bowl={item} horizontal={viewMode === 'list'} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity
          onPress={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
          style={styles.viewToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={viewMode === 'grid' ? 'list' : 'grid'}
            size={20}
            color={Colors.primaryDark}
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Search bowls, salads, wraps..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categories}
        style={styles.categoriesScroll}
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

      {/* Results Count */}
      {!loading && (
        <Text style={styles.resultCount}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </Text>
      )}

      {/* Bowl List */}
      {loading ? (
        <ScrollView
          contentContainerStyle={styles.loadingGrid}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3, 4].map((i) => <BowlCardSkeleton key={i} />)}
        </ScrollView>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search-outline" size={30} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or category filter
          </Text>
          <TouchableOpacity
            onPress={() => { setSearch(''); setActiveCategory('all'); }}
            style={styles.clearFiltersBtn}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={renderItem}
          estimatedItemSize={viewMode === 'grid' ? 220 : 110}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  categoriesScroll: { maxHeight: 52 },
  categories: {
    paddingHorizontal: Spacing.lg,
    paddingRight: Spacing.xl,
    paddingBottom: 4,
  },
  resultCount: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '500',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  loadingGrid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: 100,
  },
  gridItem: { flex: 1, padding: 6 },
  listItem: { paddingHorizontal: Spacing.sm },
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
    backgroundColor: '#f8fafb',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
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
  clearFiltersBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  clearFiltersText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
});
