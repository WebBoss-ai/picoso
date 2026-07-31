import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';

function ProfileMenuItem({ icon, iconColor, iconBg, label, subtitle, onPress, danger }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuItem}
      activeOpacity={0.72}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: iconBg || Colors.primaryBg }]}>
        <Ionicons
          name={icon}
          size={18}
          color={danger ? Colors.error : (iconColor || Colors.primaryDark)}
        />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color={Colors.borderMedium} />
    </TouchableOpacity>
  );
}

function MenuSection({ title, children }) {
  return (
    <View style={styles.menuSection}>
      {title ? <Text style={styles.sectionLabel}>{title}</Text> : null}
      <View style={styles.menuCard}>{children}</View>
    </View>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>
        <View style={styles.guestState}>
          <View style={styles.guestAvatar}>
            <Ionicons name="person-outline" size={36} color={Colors.textMuted} />
          </View>
          <Text style={styles.guestTitle}>Not signed in</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to access your profile, orders, and more
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={styles.signInBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        <LinearGradient colors={Colors.gradientHero} style={styles.profileHero}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>Profile</Text>
            <TouchableOpacity
              onPress={() => {}}
              style={styles.editBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil-outline" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroBody}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{user?.name || 'User'}</Text>
              <Text style={styles.heroPhone}>+91 {user?.phone}</Text>
              {user?.email && <Text style={styles.heroEmail}>{user.email}</Text>}
            </View>
          </View>
          {user?.platinumStatus && (
            <View style={styles.platinumBadge}>
              <Ionicons name="diamond" size={12} color="#fed7aa" />
              <Text style={styles.platinumBadgeText}>Platinum Member</Text>
            </View>
          )}
        </LinearGradient>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.totalOrders || 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.savedAddresses?.length || 0}</Text>
            <Text style={styles.statLabel}>Addresses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: user?.platinumStatus ? '#f97316' : Colors.textMuted }]}>
              {user?.platinumStatus ? 'Active' : 'None'}
            </Text>
            <Text style={styles.statLabel}>Platinum</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160)}>
          <MenuSection title="Account">
            <ProfileMenuItem
              icon="location-outline"
              iconBg={Colors.primaryBg}
              label="Saved Addresses"
              subtitle={`${user?.savedAddresses?.length || 0} saved`}
              onPress={() => router.push('/addresses')}
            />
            <MenuDivider />
            <ProfileMenuItem
              icon="receipt-outline"
              iconBg={Colors.primaryBg}
              label="My Orders"
              subtitle="View order history"
              onPress={() => router.push('/(tabs)/orders')}
            />
            <MenuDivider />
            <ProfileMenuItem
              icon="diamond-outline"
              iconBg="#fff7ed"
              iconColor="#f97316"
              label="Picoso Platinum"
              subtitle={user?.platinumStatus ? 'Active membership' : 'Subscribe for perks'}
              onPress={() => router.push('/platinum')}
            />
          </MenuSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220)}>
          <MenuSection title="Preferences">
            <ProfileMenuItem
              icon="notifications-outline"
              iconBg={Colors.primaryBg}
              label="Notifications"
              subtitle="Order updates and offers"
              onPress={() => {}}
            />
            <MenuDivider />
            <ProfileMenuItem
              icon="shield-checkmark-outline"
              iconBg={Colors.primaryBg}
              label="Privacy and Security"
              onPress={() => {}}
            />
          </MenuSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280)}>
          <MenuSection title="Support">
            <ProfileMenuItem
              icon="help-circle-outline"
              iconBg={Colors.primaryBg}
              label="Help and FAQ"
              onPress={() => {}}
            />
            <MenuDivider />
            <ProfileMenuItem
              icon="chatbubble-ellipses-outline"
              iconBg={Colors.primaryBg}
              label="Chat with Support"
              onPress={() => {}}
            />
            <MenuDivider />
            <ProfileMenuItem
              icon="star-outline"
              iconBg={Colors.primaryBg}
              label="Rate the App"
              onPress={() => {}}
            />
          </MenuSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340)}>
          <MenuSection>
            <ProfileMenuItem
              icon="log-out-outline"
              iconBg="#fef2f2"
              label="Sign Out"
              onPress={handleLogout}
              danger
            />
          </MenuSection>
        </Animated.View>

        <Text style={styles.versionText}>Picoso v1.0.0</Text>
        <View style={{ height: 90 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  pageHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pageTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  scrollContent: { paddingBottom: 16 },

  profileHero: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
  },
  heroTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.4,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  heroPhone: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  heroEmail: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  platinumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(249,115,22,0.18)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: Spacing.md,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  platinumBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#fed7aa',
  },

  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: -20,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    ...Shadow.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: '70%',
    alignSelf: 'center',
    backgroundColor: Colors.borderLight,
  },
  statValue: {
    fontSize: FontSizes.base,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  menuSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    gap: 12,
    minHeight: 56,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 64,
  },
  dangerText: { color: Colors.error },

  versionText: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.borderMedium,
    fontWeight: '500',
    marginTop: Spacing.xl,
    paddingBottom: 8,
  },

  guestState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  guestTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  guestSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    fontWeight: '500',
  },
  signInBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 13,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    ...Shadow.green,
  },
  signInBtnText: {
    color: Colors.white,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
