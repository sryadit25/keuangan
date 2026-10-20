import Papa from 'papaparse';
import { detectColumns, normalizeHeaders, parseAmount, parseDate } from '@/lib/csv/detect';
import type {
  AccountRow,
  AdsRow,
  ColumnMap,
  InstitutionProfile,
  ParsedFile,
} from '@/lib/csv/types';

export const INSTITUTIONS: InstitutionProfile[] = [
  // --- Bank ---
  { id: 'bca', label: 'BCA', kind: 'account', keywords: ['bca'] },
  { id: 'mandiri', label: 'Bank Mandiri', kind: 'account', keywords: ['mandiri'] },
  { id: 'bni', label: 'BNI', kind: 'account', keywords: ['bni', 'banknni'] },
  { id: 'bri', label: 'BRI', kind: 'account', keywords: ['bri', 'bankbri'] },
  { id: 'permata', label: 'Permata', kind: 'account', keywords: ['permata'] },
  { id: 'danamon', label: 'Danamon', kind: 'account', keywords: ['danamon'] },
  { id: 'cimb', label: 'CIMB Niaga', kind: 'account', keywords: ['cimb'] },
  { id: 'bank_syariah', label: 'Bank Syariah (BSI/MBS/BSN)', kind: 'account', keywords: ['bsi', 'bankbsi', 'syariah'] },
  // --- E-wallet & marketplace ---
  { id: 'gopay', label: 'GoPay', kind: 'account', keywords: ['gopay'] },
  { id: 'ovo', label: 'OVO', kind: 'account', keywords: ['ovo'] },
  { id: 'dana', label: 'DANA', kind: 'account', keywords: ['dana'] },
  { id: 'shopeepay', label: 'ShopeePay', kind: 'account', keywords: ['shopeepay'] },
  { id: 'tokopedia', label: 'Tokopedia', kind: 'account', keywords: ['tokopedia'] },
  // --- Ads ---
  { id: 'meta_ads', label: 'Meta Ads', kind: 'ads', platform: 'meta', keywords: ['metaads', 'facebookads', 'adsmanager'] },
  { id: 'google_ads', label: 'Google Ads', kind: 'ads', platform: 'google', keywords: ['googleads', 'adwords'] },
  { id: 'tiktok_ads', label: 'TikTok Ads', kind: 'ads', platform: 'tiktok', keywords: ['tiktokads'] },
  { id: 'shopee_ads', label: 'Shopee Ads', kind: 'ads', platform: 'shopee', keywords: ['shopeeads'] },
  { id: 'tiktok_shop_ads', label: 'TikTok Shop Ads', kind: 'ads', platform: 'tiktok_shop', keywords: ['tiktokadsbusiness', 'tiktokcommerce'] },
];

export function detectInstitution(headers: string[]): InstitutionProfile | null {
  const normalized = normalizeHeaders(headers);
  const haystack = normalized.join(' ');

  for (const profile of INSTITUTIONS) {
    if (!profile.keywords) continue;
    if (profile.keywords.some((keyword) => haystack.includes(normalizeHeaders([keyword])[0]))) {
      return profile;
    }
  }

  // Tidak ada nama institutions di header: nebak dari struktur kolom
  // (file iklan biasanya punya kolom spend + campaign/impressions).
  if (looksLikeAds(headers)) {
    return {
      id: 'ads_auto',
      label: 'Laporan iklan (auto-detect)',
      kind: 'ads',
      platform: guessPlatform(headers),
    };
  }

  return null;
}

function looksLikeAds(headers: string[]): boolean {
  const haystack = normalizeHeaders(headers).join(' ');
  const hasSpend = /spend|spent|cost|biaya|pengeluaran/.test(haystack);
  const hasCampaignSignal = /campaign|iklan|impression|result|click/.test(haystack);
  return hasSpend && hasCampaignSignal;
}

function guessPlatform(headers: string[]): AdsRow['platform'] {
  const haystack = normalizeHeaders(headers).join(' ');
  if (haystack.includes('amountspent')) return 'meta';
  if (haystack.includes('reportingstarts')) return 'meta';
  if (haystack.includes('googleads')) return 'google';
  if (haystack.includes('tiktokads')) return 'tiktok';
  if (haystack.includes('shopeeads')) return 'shopee';
  return 'lainnya';
}

function value(row: Record<string, string>, column: string | null): string | null {
  if (!column) return null;
  return row[column] ?? null;
}

function buildAccountRows(
  rawRows: Record<string, string>[],
  map: ColumnMap,
  convention: InstitutionProfile['valueConvention'],
): { rows: AccountRow[]; warnings: string[] } {
  const rows: AccountRow[] = [];
  const warnings: string[] = [];

  if (!map.dateColumn) {
    return { rows, warnings: ['Kolom tanggal tidak terdeteksi.'] };
  }

  for (const raw of rawRows) {
    const date = parseDate(value(raw, map.dateColumn) ?? '');
    if (!date) {
      warnings.push(`Tanggal tidak terbaca: ${value(raw, map.dateColumn) ?? '(kosong)'}`);
      continue;
    }

    let amount = 0;
    if (map.debitColumn || map.creditColumn) {
      // Konvensi mutasi Indonesia: kolom Debit = keluar (negatif), Kredit = masuk (positif).
      const debit = parseAmount(value(raw, map.debitColumn));
      const credit = parseAmount(value(raw, map.creditColumn));
      amount = credit - debit;
    } else if (map.amountColumn) {
      const rawAmount = parseAmount(value(raw, map.amountColumn));
      const typeValue = (value(raw, map.typeColumn) ?? '').toLowerCase();
      const isDebit = /debit|debet|keluar|pengeluaran|paid|pembayaran|penarikan/.test(typeValue);
      const isCredit = /credit|kredit|masuk|pemasukan|income|terima|received|deposit/.test(typeValue);

      if (isDebit) amount = -Math.abs(rawAmount);
      else if (isCredit) amount = Math.abs(rawAmount);
      else amount = convention === 'signed' ? rawAmount : -Math.abs(rawAmount);
    } else {
      continue;
    }

    if (amount === 0) continue;

    const description = (value(raw, map.descriptionColumn) ?? '').trim();
    rows.push({
      occurred_on: date,
      amount,
      description: description || '(tanpa keterangan)',
      merchant: extractMerchant(description),
      balance: map.balanceColumn ? parseAmount(value(raw, map.balanceColumn)) : null,
    });
  }

  return { rows, warnings };
}

const MERCHANT_HINTS = [
  'shopee', 'tokopedia', 'tiktok shop', 'lazada', 'bukalapak', 'blibli',
  'gojek', 'grab', 'uber', 'mcdonald', 'kfc', 'starbucks', 'indomaret',
  'alfamart', 'spay', 'gopay', 'dana', 'ovo', 'shopeepay',
];

export function extractMerchant(description: string): string | null {
  const lower = description.toLowerCase();
  const found = MERCHANT_HINTS.find((hint) => lower.includes(hint));
  return found ? found.charAt(0).toUpperCase() + found.slice(1) : null;
}

function buildAdsRows(
  rawRows: Record<string, string>[],
  headers: string[],
  platform: AdsRow['platform'],
): { rows: AdsRow[]; warnings: string[] } {
  const map = detectColumns(headers);
  const rows: AdsRow[] = [];
  const warnings: string[] = [];

  const spendColumn = findHeader(headers, ['spend', 'amountspent', 'biaya', 'cost', 'pengeluaran', 'jumlah']);
  const revenueColumn = findHeader(headers, ['conversionvalue', 'pendapatan', 'revenue', 'penjualan', 'nilai', 'gmv']);
  const campaignColumn = findHeader(headers, ['campaignname', 'namaiklan', 'campaign', 'iklan']);
  const clicksColumn = findHeader(headers, ['clicks', 'klik', 'click']);
  const impressionsColumn = findHeader(headers, ['impressions', 'impresi', 'tayang', 'views', 'view']);
  const ordersColumn = findHeader(headers, ['results', 'conversion', 'purchases', 'transaksi', 'orders', 'pesanan']);
  const dateColumn = map.dateColumn ?? findHeader(headers, ['day', 'date', 'tanggal', 'periode']);

  if (!dateColumn || !spendColumn) {
    return { rows, warnings: ['Kolom tanggal atau spend tidak terdeteksi pada file iklan.'] };
  }

  for (const raw of rawRows) {
    const date = parseDate(value(raw, dateColumn) ?? '');
    if (!date) {
      warnings.push(`Tanggal iklan tidak terbaca: ${value(raw, dateColumn) ?? '(kosong)'}`);
      continue;
    }

    const spend = Math.abs(parseAmount(value(raw, spendColumn)));
    const revenue = Math.abs(parseAmount(value(raw, revenueColumn)));
    const clicks = clicksColumn ? parseAmount(value(raw, clicksColumn)) : null;
    const impressions = impressionsColumn ? parseAmount(value(raw, impressionsColumn)) : null;
    const orders = ordersColumn ? parseAmount(value(raw, ordersColumn)) : null;

    rows.push({
      date,
      platform,
      campaignName: (value(raw, campaignColumn) ?? '').trim() || '(tanpa nama)',
      spend,
      revenue,
      orders,
      clicks,
      impressions,
      ctr: impressions && clicks !== null ? clicks / impressions : null,
      cvr: clicks && orders ? orders / clicks : null,
    });
  }

  return { rows, warnings };
}

function findHeader(headers: string[], keywords: string[]): string | null {
  const normalized = normalizeHeaders(headers);
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeHeaders([keyword])[0];
    const index = normalized.findIndex((h) => h.includes(normalizedKeyword));
    if (index !== -1) return headers[index];
  }
  return null;
}

/**
 * Parse file CSV mutasi rekening/e-wallet atau laporan iklan.
 * Bila institutions tidak dikenali, jatuh ke auto-detect generik.
 */
export function parseCsv(csvText: string, forcedProfile?: InstitutionProfile): ParsedFile {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const rawRows = parsed.data ?? [];
  const profile = forcedProfile ?? detectInstitution(headers);
  const map = { ...detectColumns(headers), ...(profile?.overrides ?? {}) };
  const warnings: string[] = [];

  if (profile?.kind === 'ads') {
    const ads = buildAdsRows(rawRows, headers, profile.platform ?? 'lainnya');
    return {
      institution: profile.label,
      kind: 'ads',
      rows: [],
      adsRows: ads.rows,
      warnings: ads.warnings,
      unmappedColumns: headers.filter((h) => !Object.values(map).includes(h)),
    };
  }

  const account = buildAccountRows(rawRows, map, profile?.valueConvention ?? 'debit-negative');
  warnings.push(...account.warnings);

  return {
    institution: profile?.label ?? 'Umum (auto-detect)',
    kind: 'account',
    rows: account.rows,
    adsRows: [],
    warnings,
    unmappedColumns: headers.filter((h) => !Object.values(map).includes(h)),
  };
}
