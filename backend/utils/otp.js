import axios from 'axios';

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTP = async (phone, otp) => {
  try {
    console.log(`📱 Sending OTP ${otp} to ${phone}`);
    // Integrate with SMS service like Twilio, AWS SNS, or Fast2SMS
    // Example with Fast2SMS:
    // const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
    //   authorization: process.env.OTP_API_KEY,
    //   route: 'otp',
    //   variables_values: otp,
    //   flash: 0,
    //   numbers: phone
    // });
    
    // For development, just log
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
