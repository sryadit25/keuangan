const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatRupiah(value: number): string {
  return rupiahFormatter.format(Math.round(value)).replace('IDR', 'Rp');
}

export function formatCompactRupiah(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}Rp${compactFormatter.format(Math.abs(value))}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '-';
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
  return label.format(new Date(year, month - 1, 1));
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(period: string, delta: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(period: string): { start: string; end: string } {
  const [year, month] = period.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
}
