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

export function cbLog(msg, extra) {
  const stamp = new Date().toISOString();
  const tail = extra === undefined
    ? ''
    : ` ${typeof extra === 'string' ? extra : JSON.stringify(extra)}`;
  console.log(`[CB Auth ${stamp}] ${msg}${tail}`);
}

export function maskPhone(p) {
  const s = String(p || '');
  if (s.length < 4) return '****';
  return `${s.slice(0, 2)}******${s.slice(-2)}`;
}

export function maskOtp(o) {
  const s = String(o || '');
  if (s.length <= 2) return '******';
  return `${'*'.repeat(Math.max(0, s.length - 2))}${s.slice(-2)}`;
}

export function getCbAuthPublic() {
  return {
    phase: state.phase,
    message: state.message,
    experimentId: state.experimentId,
    phoneHint: state.phoneHint,
    needsPhone: state.phase === 'phone',
    needsOtp: state.phase === 'otp',
    debug: {
      hasPendingPhone: Boolean(pendingPhone),
      hasPendingOtp: Boolean(pendingOtp),
    },
  };
}

export function setCbAuth(patch) {
  Object.assign(state, patch);
  cbLog('state', {
    phase: state.phase,
    message: state.message,
    experimentId: state.experimentId,
    hasPendingPhone: Boolean(pendingPhone),
    hasPendingOtp: Boolean(pendingOtp),
  });
}

export function resetCbAuth() {
  cbLog('resetCbAuth', { hadPendingPhone: Boolean(pendingPhone), hadPendingOtp: Boolean(pendingOtp) });
  state.phase = 'idle';
  state.message = '';
  state.experimentId = null;
}

export function submitCbPhone(raw) {
  const phone = String(raw || '').replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  pendingPhone = phone;
  state.phoneHint = phone;
  state.phase = state.phase === 'otp' ? 'otp' : 'phone';
  state.message = 'Sending OTP on CampaignBot';
  cbLog('submitCbPhone', { phone: maskPhone(phone), phase: state.phase });
}

export function submitCbOtp(raw) {
  const otp = String(raw || '').replace(/\D/g, '');
  if (otp.length !== 6) throw new Error('Enter the 6-digit OTP sent to your CampaignBot number');
  pendingOtp = otp;
  state.phase = 'otp';
  state.message = 'Verifying OTP';
  cbLog('submitCbOtp', { otp: maskOtp(otp), length: otp.length, phase: state.phase });
}

export function peekPendingOtp() {
  return pendingOtp;
}

export async function waitForPhone(timeoutMs = 8 * 60 * 1000) {
  const envPhone = String(process.env.CB_PHONE || '').replace(/\D/g, '').slice(-10);
  if (envPhone.length === 10) {
    cbLog('waitForPhone using CB_PHONE env', { phone: maskPhone(envPhone) });
    return envPhone;
  }
  cbLog('waitForPhone start', { timeoutMs });
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pendingPhone) {
      const p = pendingPhone;
      pendingPhone = null;
      cbLog('waitForPhone received', { phone: maskPhone(p) });
      return p;
    }
    await sleep(400);
  }
  cbLog('waitForPhone TIMEOUT');
  return null;
}

export async function waitForOtp(timeoutMs = 8 * 60 * 1000) {
  cbLog('waitForOtp start', { timeoutMs, alreadyPending: Boolean(pendingOtp) });
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (pendingOtp) {
      const o = pendingOtp;
      pendingOtp = null;
      cbLog('waitForOtp received', { otp: maskOtp(o) });
      return o;
    }
    await sleep(400);
  }
  cbLog('waitForOtp TIMEOUT');
  return null;
}
