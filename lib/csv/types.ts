export interface AccountRow {
  occurred_on: string; // YYYY-MM-DD
  amount: number; // bertanda: positif masuk, negatif keluar
  description: string;
  merchant: string | null;
  balance: number | null;
}

export interface AdsRow {
  date: string; // YYYY-MM-DD
  platform: 'shopee' | 'tiktok' | 'meta' | 'tiktok_shop' | 'google' | 'lainnya';
  campaignName: string;
  spend: number;
  revenue: number;
  orders: number | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  cvr: number | null;
}

export interface ColumnMap {
  dateColumn: string | null;
  descriptionColumn: string | null;
  debitColumn: string | null;
  creditColumn: string | null;
  amountColumn: string | null;
  balanceColumn: string | null;
  typeColumn: string | null;
}

export interface ParsedFile {
  institution: string;
  kind: 'account' | 'ads';
  rows: AccountRow[];
  adsRows: AdsRow[];
  warnings: string[];
  unmappedColumns: string[];
}

export interface InstitutionProfile {
  id: string;
  label: string;
  kind: 'account' | 'ads';
  /** Cocok bila header mengandung salah satu keyword ini (sudah dinormalisasi). */
  keywords?: string[];
  /** Override pemetaan kolom bila deteksi generik kurang tepat. */
  overrides?: Partial<ColumnMap>;
  /** Platform untuk file iklan. */
  platform?: AdsRow['platform'];
  /** Penanda nilai: 'debit' = kolom debit = pengeluaran. */
  valueConvention?: 'debit-negative' | 'credit-positive' | 'signed';
}
