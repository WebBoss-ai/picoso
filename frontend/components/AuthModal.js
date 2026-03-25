'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Phone, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const { login } = useAuth();

  // ✅ Auto-fill OTP after 3 sec
  useEffect(() => {
    if (step === 'otp') {
      const timer = setTimeout(() => {
        setOtp(['0', '0', '0', '0']);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [step]);

  // ✅ Auto verify ONLY after OTP is actually updated
  useEffect(() => {
    if (step === 'otp' && otp.join('') === '0000') {
      handleVerifyOTP('0000');
    }
  }, [otp, step]);

  // ✅ Clear error when OTP becomes valid
  useEffect(() => {
    if (otp.join('').length === 4) {
      setError('');
    }
  }, [otp]);

  // ✅ Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (phone.length !== 10) {
      setError('Enter a valid 10-digit number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await auth.sendOTP(phone);
      setStep('otp');
      setResendTimer(30);
      setOtp(['', '', '', '']);

      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ✅ Accept custom OTP to avoid stale state issue
  const handleVerifyOTP = async (customOtp) => {
    const finalOtp = customOtp || otp.join('');

    if (finalOtp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await auth.verifyOTP(phone, finalOtp);
      const { token, user } = res.data;

      login(token, user);
      setStep('success');

      setTimeout(() => {
        onSuccess?.(user);
        onClose?.();
      }, 1500);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend with same auto-fill flow
  const handleResend = async () => {
    if (resendTimer > 0) return;

    setError('');
    setOtp(['', '', '', '']);
    setResendTimer(30);

    try {
      await auth.sendOTP(phone);

      // auto-fill again after 3 sec
      setTimeout(() => {
        setOtp(['0', '0', '0', '0']);
      }, 3000);

    } catch (e) {
      setError('Failed to resend OTP');
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal p-8 relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <X size={18} />
        </button>

        {step === 'phone' && (
          <div className="animate-slide-up">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
              <Phone size={22} className="text-brand-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome to Picoso</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your phone number to continue</p>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">+91</span>
              <input
                type="tel"
                className="input-field pl-12"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(v);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                maxLength={10}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <button
              onClick={handleSendOTP}
              disabled={loading || phone.length !== 10}
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Send OTP <ArrowRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="animate-slide-up">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
              <Phone size={22} className="text-brand-600" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Verify OTP</h2>
            <p className="text-sm text-gray-500 mb-1">Sent to +91 {phone}</p>

            <button
              onClick={() => setStep('phone')}
              className="text-xs text-brand-600 font-medium mb-6 hover:underline"
            >
              Change number
            </button>

            <div className="flex gap-3 mb-5 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                />
              ))}
            </div>

            {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}

            <button
              onClick={() => handleVerifyOTP()}
              disabled={loading || otp.join('').length !== 4}
              className="btn-primary w-full mb-4"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Verify & Continue'
              )}
            </button>

            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-xs text-gray-400">
                  Resend OTP in <span className="text-brand-600 font-semibold">{resendTimer}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  className="text-xs text-brand-600 font-medium hover:underline flex items-center gap-1 mx-auto"
                >
                  <RefreshCw size={12} /> Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="animate-slide-up text-center py-4">
            <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Logged In!</h2>
            <p className="text-sm text-gray-500">Welcome back to Picoso</p>
          </div>
        )}
      </div>
    </div>
  );
}