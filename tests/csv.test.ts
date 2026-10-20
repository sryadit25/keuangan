import { describe, expect, it } from 'vitest';
import { detectColumns, normalizeHeader, parseAmount, parseDate } from '@/lib/csv/detect';
import { detectInstitution, parseCsv } from '@/lib/csv/parsers';

describe('parseDate', () => {
  it('membaca format Indonesia dan ISO', () => {
    expect(parseDate('05/03/2026')).toBe('2026-03-05');
    expect(parseDate('05-03-26')).toBe('2026-03-05');
    expect(parseDate('2026-03-05')).toBe('2026-03-05');
    expect(parseDate('05 Mar 2026')).toBe('2026-03-05');
  });

  it('mengembalikan null untuk tanggal tidak valid', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('bukan tanggal')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('membaca format Rupiah dan angka desimal', () => {
    expect(parseAmount('Rp1.234.567')).toBe(1_234_567);
    expect(parseAmount('1.234.567,50')).toBe(1_234_567.5);
    expect(parseAmount('1,234,567.89')).toBe(1_234_567.89);
    expect(parseAmount('-50.000')).toBe(-50_000);
    expect(parseAmount('1.234')).toBe(1_234);
    expect(parseAmount('')).toBe(0);
  });
});

describe('detectColumns', () => {
  it('mengenali kolom mutasi rekening', () => {
    const map = detectColumns(['Tanggal', 'Uraian', 'Debit', 'Kredit', 'Saldo']);
    expect(map.dateColumn).toBe('Tanggal');
    expect(map.descriptionColumn).toBe('Uraian');
    expect(map.debitColumn).toBe('Debit');
    expect(map.creditColumn).toBe('Kredit');
    expect(map.balanceColumn).toBe('Saldo');
  });

  it('menormalisasi header', () => {
    expect(normalizeHeader('Amount Spent (IDR)')).toBe('amountspentidr');
  });
});

describe('detectInstitution', () => {
  it('mengenali file dari bank/e-wallet yang dikenal', () => {
    expect(detectInstitution(['BCA', 'Tgl', 'Uraian'])?.id).toBe('bca');
    expect(detectInstitution(['Tanggal', 'Keterangan'])?.id).toBeUndefined();
  });
});

describe('parseCsv', () => {
  // Fixture sintetis untuk format mutasi rekening gaya BCA/Mandiri.
  const mutasiCsv = [
    'Tanggal,Uraian,Debit,Kredit,Saldo',
    '05/03/2026,"TRX PEMBELIAN - SHOPEE",250000,,9750000',
    '06/03/2026,"GAJI MARET",,5000000,14750000',
  ].join('\n');

  it('menghasilkan baris transaksi dengan arah arus kas benar', () => {
    const result = parseCsv(mutasiCsv);
    expect(result.kind).toBe('account');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].amount).toBe(-250_000);
    expect(result.rows[1].amount).toBe(5_000_000);
    expect(result.rows[0].occurred_on).toBe('2026-03-05');
    expect(result.rows[0].merchant).toBe('Shopee');
    expect(result.rows[1].balance).toBe(14_750_000);
  });

  const adsCsv = [
    'Reporting starts,Campaign name,Amount spent (IDR),Results,Impressions,Clicks',
    '2026-03-01,Promo Ramadan,1000000,120,50000,900',
  ].join('\n');

  it('mengenali file iklan dan menghitung CTR', () => {
    const result = parseCsv(adsCsv);
    expect(result.kind).toBe('ads');
    expect(result.adsRows).toHaveLength(1);
    expect(result.adsRows[0].spend).toBe(1_000_000);
    expect(result.adsRows[0].ctr).toBeCloseTo(900 / 50_000);
    expect(result.adsRows[0].platform).toBe('meta');
  });

  it('menandai baris dengan tanggal tidak terbaca sebagai peringatan', () => {
    const result = parseCsv(['Tanggal,Uraian,Debit', 'bukan tanggal,uji,1000'].join('\n'));
    expect(result.rows).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
