import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../../lib/api';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import Button from '../../components/ui/Button';

export default function Login() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const isValid = phone.replace(/\s/g, '').length === 10;

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!isValid) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.sendOtp(cleanPhone);
      router.push({ pathname: '/(auth)/verify', params: { phone: cleanPhone } });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (text) => {
    const clean = text.replace(/\D/g, '').slice(0, 10);
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  };

  return (
    <LinearGradient colors={Colors.gradientHero} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand */}
            <Animated.View entering={FadeInDown.delay(80).duration(550)} style={styles.brand}>
              <View style={styles.logoWrap}>
                <Ionicons name="restaurant" size={34} color={Colors.primary} />
              </View>
              <Text style={styles.brandName}>picoso</Text>
              <Text style={styles.brandTagline}>Nourish your day, every day</Text>
            </Animated.View>

            {/* Card */}
            <Animated.View entering={FadeInUp.delay(250).duration(550)} style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSubtitle}>
                Enter your mobile number to receive a one-time password
              </Text>

              {/* Phone Input */}
              <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
                <View style={styles.countryCode}>
                  <Ionicons name="call-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.dialCode}>+91</Text>
                  <View style={styles.separator} />
                </View>
                <TextInput
                  ref={inputRef}
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(formatPhone(t));
                    setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={11}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  autoFocus
                />
                {phone.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setPhone('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={19} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                disabled={!isValid}
                fullWidth
                size="lg"
                style={styles.sendBtn}
              />

              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>

              <View style={styles.devNote}>
                <Ionicons name="information-circle-outline" size={13} color={Colors.primary} />
                <Text style={styles.devNoteText}>
                  Use OTP <Text style={styles.devNoteBold}>0000</Text> in development mode
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing['2xl'],
  },
  brand: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brandName: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.2,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.52)',
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    ...Shadow.xl,
  },
  cardTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafb',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.md,
    height: 56,
    overflow: 'hidden',
  },
  inputWrapError: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.md,
    paddingRight: 10,
    gap: 6,
  },
  dialCode: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  separator: {
    width: 1.5,
    height: 22,
    backgroundColor: '#e2e8f0',
    marginLeft: 4,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 1.5,
  },
  clearBtn: { paddingRight: 14 },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
    marginTop: -4,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    flex: 1,
    fontWeight: '500',
  },

  sendBtn: { marginBottom: Spacing.base },

  termsText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '700',
  },

  devNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGreen,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  devNoteText: {
    fontSize: FontSizes.xs,
    color: Colors.primaryDark,
    fontWeight: '500',
  },
  devNoteBold: { fontWeight: '800' },
});
