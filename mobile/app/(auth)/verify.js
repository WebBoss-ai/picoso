import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { authAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import Colors from '../../constants/colors';
import { Radius, FontSizes, Spacing, Shadow } from '../../constants/theme';
import Button from '../../components/ui/Button';

const OTP_LENGTH = 4;
const RESEND_TIMEOUT = 30;

export default function Verify() {
  const router = useRouter();
  const { phone } = useLocalSearchParams();
  const { login } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    startResendTimer();
  }, []);

  const startResendTimer = () => {
    setResendTimer(RESEND_TIMEOUT);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === OTP_LENGTH - 1) {
      const filled = [...newOtp.slice(0, -1), digit];
      if (filled.every((d) => d !== '')) {
        handleVerify(filled.join(''));
      }
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async (code = otp.join('')) => {
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the complete OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOtp(phone, code);
      const { token, user } = res.data;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      await login(token, user);
      setTimeout(() => router.replace('/(tabs)'), 700);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(msg);
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await authAPI.sendOtp(phone);
      startResendTimer();
      setOtp(['', '', '', '']);
      setError('');
      inputRefs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new OTP has been sent to your number.');
    } catch {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  const maskedPhone = phone
    ? `+91 ${phone.slice(0, 5)} ${'\u2022'.repeat(5)}`
    : '';

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
            {/* Back */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
            </TouchableOpacity>

            {/* Header */}
            <Animated.View entering={FadeInDown.delay(80).duration(500)} style={styles.header}>
              {success ? (
                <Animated.View entering={ZoomIn.duration(400)} style={styles.successWrap}>
                  <Ionicons name="checkmark-circle" size={68} color={Colors.primary} />
                </Animated.View>
              ) : (
                <View style={styles.iconWrap}>
                  <Ionicons name="phone-portrait-outline" size={34} color={Colors.primary} />
                </View>
              )}
              <Text style={styles.title}>
                {success ? 'Verified!' : 'Verify OTP'}
              </Text>
              <Text style={styles.subtitle}>
                {success
                  ? "You're all set. Welcome to Picoso!"
                  : `We've sent a 4-digit OTP to\n${maskedPhone}`}
              </Text>
            </Animated.View>

            {/* Card */}
            {!success && (
              <Animated.View entering={FadeInUp.delay(260).duration(500)} style={styles.card}>
                {/* OTP Boxes */}
                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.otpBox,
                        digit && styles.otpBoxFilled,
                        error && styles.otpBoxError,
                      ]}
                      value={digit}
                      onChangeText={(t) => handleChange(t, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      textAlign="center"
                    />
                  ))}
                </View>

                {error ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  title="Verify OTP"
                  onPress={() => handleVerify()}
                  loading={loading}
                  disabled={otp.join('').length !== OTP_LENGTH}
                  fullWidth
                  size="lg"
                  style={styles.verifyBtn}
                />

                {/* Resend */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Didn't receive the OTP?</Text>
                  <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendTimer > 0}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={[styles.resendLink, resendTimer > 0 && styles.resendDisabled]}>
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.changeNumber}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil-outline" size={13} color={Colors.primary} />
                  <Text style={styles.changeNumberText}>Change number</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  successWrap: {
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: Spacing.xl,
    ...Shadow.xl,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  otpBox: {
    width: 62,
    height: 70,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceGray,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  otpBoxError: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    fontWeight: '500',
  },
  verifyBtn: { marginBottom: Spacing.base },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  resendText: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  resendLink: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  resendDisabled: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
  changeNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
  },
  changeNumberText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
