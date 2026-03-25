export const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const sendOTP = async (phone, otp) => {
  try {
    console.log(`📱 OTP for ${phone}: ${otp}`);
    // TODO: Integrate SMS provider (Fast2SMS / Twilio / AWS SNS)
    return { success: true, message: `OTP sent to ${phone}` };
  } catch (error) {
    console.error('OTP Send Error:', error);
    return { success: false, message: 'Failed to send OTP' };
  }
};

export const verifyOTP = (inputOTP, storedOTP, expiresAt) => {
  if (new Date() > new Date(expiresAt)) {
    return { valid: false, message: 'OTP expired' };
  }
  if (inputOTP !== storedOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  return { valid: true, message: 'OTP verified' };
};
