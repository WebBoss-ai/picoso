import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { profileAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../constants/theme';
import AddressCard from '../components/AddressCard';
import Button from '../components/ui/Button';

const ADDRESS_TYPES = ['Home', 'Work', 'Other'];

export default function Addresses() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [addresses, setAddresses] = useState(user?.savedAddresses || []);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: 'Home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  const resetForm = () => {
    setForm({ type: 'Home', line1: '', line2: '', city: '', state: '', pincode: '' });
  };

  const handleSave = async () => {
    if (!form.line1.trim() || !form.city.trim() || !form.pincode.trim()) {
      Alert.alert('Required Fields', 'Please fill in address, city, and pincode.');
      return;
    }
    if (form.pincode.length !== 6) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }
    setSaving(true);
    try {
      const updated = [...addresses, { ...form }];
      await profileAPI.updateAddresses(updated);
      setAddresses(updated);
      await refreshProfile();
      setShowModal(false);
      resetForm();
    } catch {
      Alert.alert('Error', 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (idx) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = addresses.filter((_, i) => i !== idx);
            try {
              await profileAPI.updateAddresses(updated);
              setAddresses(updated);
              await refreshProfile();
            } catch {
              Alert.alert('Error', 'Could not delete address.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
        <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="location-outline" size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtitle}>
              Add your home, work, or other delivery locations
            </Text>
            <Button
              title="Add Address"
              onPress={() => setShowModal(true)}
              icon={<Ionicons name="add-circle-outline" size={18} color={Colors.white} />}
              style={{ marginTop: Spacing.xl }}
            />
          </View>
        ) : (
          addresses.map((addr, idx) => (
            <Animated.View key={idx} entering={FadeInDown.delay(idx * 80)}>
              <AddressCard
                address={addr}
                onDelete={() => handleDelete(idx)}
              />
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Add Address Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setShowModal(false); resetForm(); }}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Address</Text>
            <TouchableOpacity
              onPress={() => { setShowModal(false); resetForm(); }}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Address Type */}
            <Text style={styles.fieldLabel}>Address Type</Text>
            <View style={styles.typeRow}>
              {ADDRESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setForm((f) => ({ ...f, type }))}
                  style={[styles.typeChip, form.type === type && styles.typeChipActive]}
                >
                  <Ionicons
                    name={type === 'Home' ? 'home' : type === 'Work' ? 'briefcase' : 'location'}
                    size={14}
                    color={form.type === type ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.typeChipText, form.type === type && styles.typeChipTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="House no, Building, Street..."
              placeholderTextColor={Colors.textMuted}
              value={form.line1}
              onChangeText={(t) => setForm((f) => ({ ...f, line1: t }))}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Landmark / Floor (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Near temple, 2nd floor..."
              placeholderTextColor={Colors.textMuted}
              value={form.line2}
              onChangeText={(t) => setForm((f) => ({ ...f, line2: t }))}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={Colors.textMuted}
                  value={form.city}
                  onChangeText={(t) => setForm((f) => ({ ...f, city: t }))}
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.flex1, { marginLeft: 10 }]}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  placeholderTextColor={Colors.textMuted}
                  value={form.state}
                  onChangeText={(t) => setForm((f) => ({ ...f, state: t }))}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Pincode *</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit pincode"
              placeholderTextColor={Colors.textMuted}
              value={form.pincode}
              onChangeText={(t) => setForm((f) => ({ ...f, pincode: t.replace(/\D/g, '').slice(0, 6) }))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title="Save Address"
              onPress={handleSave}
              loading={saving}
              fullWidth
              size="lg"
              style={styles.saveBtn}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
    padding: Spacing.base,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceGray,
    gap: 5,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  typeChipTextActive: { color: Colors.primaryDark },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceGray,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex1: { flex: 1 },
  saveBtn: {
    marginTop: Spacing.xl,
    marginBottom: Spacing['2xl'],
  },
});
