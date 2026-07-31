import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Radius } from '../../constants/theme';

export function SkeletonBox({ width, height, borderRadius = Radius.md, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function BowlCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <SkeletonBox width="100%" height={160} borderRadius={Radius.lg} />
      <View style={{ padding: 12, gap: 8 }}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="40%" height={12} />
        <View style={styles.rowSkeleton}>
          <SkeletonBox width="30%" height={20} />
          <SkeletonBox width={36} height={36} borderRadius={Radius.full} />
        </View>
      </View>
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.orderSkeleton}>
      <View style={styles.rowSkeleton}>
        <SkeletonBox width={48} height={48} borderRadius={Radius.md} />
        <View style={{ flex: 1, marginLeft: 12, gap: 8 }}>
          <SkeletonBox width="60%" height={14} />
          <SkeletonBox width="40%" height={12} />
        </View>
        <SkeletonBox width={70} height={24} borderRadius={Radius.full} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border,
  },
  cardSkeleton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  orderSkeleton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
  },
  rowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
