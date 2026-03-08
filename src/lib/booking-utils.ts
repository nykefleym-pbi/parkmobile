import { Booking } from './types';
import { daysBetween, addDays } from './helpers';

export function bkRateStored(b: Booking) { return b.rate || 1500; }
export function bkDaily(b: Booking) { return bkRateStored(b) / 30; }

export function baseFee(b: Booking) {
  if (b.status === 'cancelled' && b.cancelledDate) {
    const days = Math.max(1, daysBetween(b.startDate, b.cancelledDate));
    return Math.round((days / 30) * bkRateStored(b) * 100) / 100;
  }
  return bkRateStored(b);
}

export function penaltyAmt(b: Booking) { return b.penalty ? b.penalty.amount : 0; }
export function totalOwed(b: Booking) { return baseFee(b) + penaltyAmt(b); }
export function totalPaid(b: Booking) { return (b.payments || []).reduce((s, p) => s + (+p.amount), 0); }
export function remaining(b: Booking) { return Math.max(0, totalOwed(b) - totalPaid(b)); }
export function isFullyPaid(b: Booking) { return totalPaid(b) >= totalOwed(b); }
export function isPartiallyPaid(b: Booking) { const tp = totalPaid(b); return tp > 0 && tp < totalOwed(b); }
export function hasPaid(b: Booking) { return totalPaid(b) > 0; }

export function coverageDays(b: Booking) {
  const tp = totalPaid(b);
  if (tp <= 0) return 30;
  return Math.min(Math.floor(tp / bkDaily(b)), 30);
}

export function coverageEndDate(b: Booking) {
  if (!hasPaid(b)) return b.endDate;
  const d = addDays(b.startDate, coverageDays(b));
  return typeof d === 'string' ? d : d.toISOString().split('T')[0];
}
