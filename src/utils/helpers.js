// Generate member ID: GYM-MEMBER-000001
export function generateMemberId(sequenceNumber) {
  const padded = String(sequenceNumber).padStart(6, '0');
  return `GYM-MEMBER-${padded}`;
}

// Extract sequence number from member ID
export function extractSequence(memberId) {
  const match = memberId.match(/GYM-MEMBER-(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Format currency in PKR
export function formatPKR(amount) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Get today's date as YYYY-MM-DD (local time, not UTC)
export function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Calculate days between two dates
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Generate monthly segments for a subscription
export function generateMonthlySegments(startDate, durationMonths) {
  const segments = [];
  let current = new Date(startDate);
  for (let i = 0; i < durationMonths; i++) {
    const monthStart = new Date(current);
    const monthEnd = new Date(current);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(monthEnd.getDate() - 1);
    segments.push({
      month_reference: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      start: monthStart.toISOString().split('T')[0],
      end: monthEnd.toISOString().split('T')[0],
    });
    current.setMonth(current.getMonth() + 1);
  }
  return segments;
}
