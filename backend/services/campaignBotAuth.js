/**
 * In-process CampaignBot login gate.
 * Playwright waits here; the WP Marketing page submits phone + OTP.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = {
  phase: 'idle', // idle | launching | phone | otp | ready | error
  message: '',
  experimentId: null,
  phoneHint: '',
};

let pendingPhone = null;
let pendingOtp = null;

export function getCbAuthPublic() {
  return {
    phase: state.phase,
    message: state.message,
    experimentId: state.experimentId,
    phoneHint: state.phoneHint,
    needsPhone: state.phase === 'phone',
    needsOtp: state.phase === 'otp',
  };
}

export function setCbAuth(patch) {
  Object.assign(state, patch);
}

export function resetCbAuth() {
  state.phase = 'idle';
  state.message = '';
  state.experimentId = null;
  // Keep pending phone/OTP so values already submitted on the WP Marketing page
  // are not lost if the publish job restarts.
}

export function submitCbPhone(raw) {
  const phone = String(raw || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  pendingPhone = phone;
  state.phoneHint = phone;
  state.phase = state.phase === 'otp' ? 'otp' : 'phone';
  state.message = 'Sending OTP on CampaignBot';
}

export function submitCbOtp(raw) {
  const otp = String(raw || '').replace(/\D/g, '');
  if (otp.length < 4) throw new Error('Enter the OTP sent to your CampaignBot number');
  pendingOtp = otp;
  state.phase = 'otp';
  state.message = 'Verifying OTP';
}

export async function waitForPhone(timeoutMs = 8 * 60 * 1000) {
  const envPhone = String(process.env.CB_PHONE || '').replace(/\D/g, '').slice(-10);
  if (envPhone.length === 10) return envPhone;
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pendingPhone) {
      const p = pendingPhone;
      pendingPhone = null;
      return p;
    }
    await sleep(400);
  }
  return null;
}

export async function waitForOtp(timeoutMs = 8 * 60 * 1000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pendingOtp) {
      const o = pendingOtp;
      pendingOtp = null;
      return o;
    }
    await sleep(400);
  }
  return null;
}
