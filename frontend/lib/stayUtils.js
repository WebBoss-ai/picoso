export const COMMISSION_RATE = 0.1;

export function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

export function hashOtp(otp) {
  let h = 0;
  const s = String(otp);
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  return `sha256:${hex}…${hex.slice(-4)}`;
}

export function bookingStatusLabel(status) {
  const map = {
    confirmed: 'Confirmed',
    checked_in: 'Checked in',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}
