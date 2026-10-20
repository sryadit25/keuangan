import type { ColumnMap } from '@/lib/csv/types';

const MONTHS_ID: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
  jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

/** Samakan bentuk header: lowercase, tanpa spasi/pemisah, hanya huruf & angka. */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeHeaders(headers: string[]): string[] {
  return headers.map(normalizeHeader);
}

function findByKeywords(headers: string[], keywords: string[]): string | null {
  const normalized = normalizeHeaders(headers);
  for (const keyword of keywords) {
    const found = normalized.findIndex((h) => h === keyword || h.includes(keyword));
    if (found !== -1) return headers[found];
  }
  return null;
}

export function detectColumns(headers: string[]): ColumnMap {
  return {
    dateColumn: findByKeywords(headers, [
      'tanggal', 'tgl', 'waktu', 'datetime', 'date', 'periode', 'period', 'reportingstarts', 'reportingends',
    ]),
    descriptionColumn: findByKeywords(headers, [
      'uraian', 'deskripsi', 'keterangan', 'remarks', 'description', 'catatan', 'memo', 'nama',
    ]),
    debitColumn: findByKeywords(headers, ['debet', 'debit', 'pengeluaran', 'payout', 'biaya']),
    creditColumn: findByKeywords(headers, ['kredit', 'credit', 'pemasukan', 'income', 'terima']),
    amountColumn: findByKeywords(headers, ['jumlah', 'amount', 'nilai', 'mutasi', 'total', 'spend', 'biayapengeluaran']),
    balanceColumn: findByKeywords(headers, ['saldo', 'balance', 'sisa']),
    typeColumn: findByKeywords(headers, ['tipe', 'type', 'jenis', 'trx']),
  };
}

/** Tanggal Indonesia & ISO: "12/03/2026", "12-03-26", "2026-03-12", "12 Mar 2026". */
export function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return toIso(year, Number(dmy[2]), Number(dmy[1]));
  }

  const textDate = raw.match(/^(\d{1,2})\s+([a-zA-Z]{3,})\s+(\d{4})/);
  if (textDate) {
    const month = MONTHS_ID[textDate[2].slice(0, 3).toLowerCase()];
    if (month) return toIso(Number(textDate[3]), month, Number(textDate[1]));
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  if (!year || !month || !day || month > 12 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "Rp1.234.567,50" / "1,234,567.89" / "1.234.567" / "1234" -> number */
export function parseAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;

  let text = value.toString().trim();
  if (!text) return 0;
  text = text.replace(/rp/gi, '').replace(/\s/g, '').replace(/[^\d,.\-]/g, '');
  if (!text || text === '-') return 0;

  const negative = text.startsWith('-');
  text = text.replace(/-/g, '');

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // Pemisah desimal = tanda baca yang muncul paling akhir.
    if (lastComma > lastDot) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (lastComma > -1) {
    // Hanya koma: desimal bila diikuti tepat 1-2 digit, selain itu thousand separator.
    const decimals = text.length - lastComma - 1;
    text = decimals > 0 && decimals <= 2 ? text.replace(',', '.') : text.replace(/,/g, '');
  } else if (lastDot > -1) {
    const decimals = text.length - lastDot - 1;
    if (decimals === 3) text = text.replace(/\./g, '');
  }

  const number = Number(text);
  if (Number.isNaN(number)) return 0;
  return negative ? -number : number;
}
