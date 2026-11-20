export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '—';
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  if (!sy || !sm || !sd || !ey || !em || !ed) return `${startDate} – ${endDate}`;

  const start = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));

  const startFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: sy !== ey ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(start);

  const endFmt = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(end);

  return `${startFmt} – ${endFmt}`;
}

export function getTripDurationDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function isUpcomingTrip(endDate: string): boolean {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;
  return endDate >= todayIso;
}

export function formatCurrency(amount: number, currency: string): string {
  const safeCurrency = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toLocaleString('en-US')}`;
  }
}

export function getDateForTripDay(startDate: string, day: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  if (!y || !m || !d) return `Day ${day}`;
  const date = new Date(Date.UTC(y, m - 1, d + (day - 1)));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Converts common time strings ("9:30 AM", "14:00", "09:00") to 24-hour "HH:MM" for <input type="time">.
 */
export function normalizeTimeForInput(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return '';
}

export function timeToSortMinutes(value: string): number {
  const normalized = normalizeTimeForInput(value);
  if (!normalized) return 9999;
  const [h, m] = normalized.split(':').map(Number);
  return h * 60 + m;
}

export function formatDisplayTime(value: string): string {
  if (!value) return 'Unscheduled';
  const normalized = normalizeTimeForInput(value);
  if (!normalized) return value;
  const [h, m] = normalized.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
