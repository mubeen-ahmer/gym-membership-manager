// Normalize Pakistani phone numbers to +92 format
export function normalizePhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // 03001234567 → +923001234567
  if (/^0[3-9]\d{9}$/.test(cleaned)) {
    return '+92' + cleaned.slice(1);
  }
  // 923001234567 → +923001234567
  if (/^92[3-9]\d{9}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  // Already +923001234567
  if (/^\+92[3-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}

// Format phone for display: +92 300 1234567
export function formatPhoneDisplay(phone) {
  const normalized = normalizePhone(phone);
  if (/^\+92\d{10}$/.test(normalized)) {
    return `+92 ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
  }
  return phone;
}

// Validate Pakistani phone number
export function isValidPakistaniPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^\+92[3-9]\d{9}$/.test(normalized);
}
