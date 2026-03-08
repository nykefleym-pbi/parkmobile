export function today() { return new Date(); }

export function addDays(d: Date | string, n: number) {
  const r = new Date(typeof d === 'string' ? d + 'T00:00:00' : d);
  r.setDate(r.getDate() + n);
  return r;
}

export function fmtDate(d: Date | string) {
  if (typeof d === 'string') d = new Date(d + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtMonthYear(d: Date | string) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
}

export function fmtShortMonth(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'short' });
}

export function daysBetween(a: Date | string, b: Date | string) {
  if (typeof a === 'string') a = new Date(a + 'T00:00:00');
  if (typeof b === 'string') b = new Date(b + 'T00:00:00');
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getInitials(n: string) {
  return (n || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

export function isoDate(d: Date | string) {
  return d instanceof Date ? d.toISOString().split('T')[0] : d;
}

export function autoPrefix(name: string) {
  return name.split(/\s+/).map(w => (w[0] || '')).join('').toUpperCase().substring(0, 4);
}

export function formatPeso(n: number, decimals = 2) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
