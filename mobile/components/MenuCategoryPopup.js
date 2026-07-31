import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Colors from '../constants/colors';
import { Radius, FontSizes, Shadow } from '../constants/theme';

export default function MenuCategoryPopup({
  visible,
  categories = [],
  activeCategory,
  onSelect,
  onClose,
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <Animated.View entering={FadeInUp.duration(220)} style={styles.popup}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.list}
          >
            {categories.map((cat, idx) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    onSelect?.(cat.id);
                    onClose?.();
                  }}
                  style={[
                    styles.row,
                    isActive && styles.rowActive,
                    idx < categories.length - 1 && styles.rowBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  {isActive && <View style={styles.activeBar} />}
                  <Text style={[styles.catName, isActive && styles.catNameActive]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.catCount, isActive && styles.catCountActive]}>
                    {cat.count ?? 0}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(100)}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Ionicons name="close" size={22} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  popup: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    width: '100%',
    maxHeight: 420,
    overflow: 'hidden',
    ...Shadow.popup,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    position: 'relative',
  },
  rowActive: {
    backgroundColor: Colors.primaryBg,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  catName: {
    fontSize: FontSizes.base,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1,
  },
  catNameActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  catCount: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textMuted,
    marginLeft: 12,
  },
  catCountActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    ...Shadow.green,
  },
});
