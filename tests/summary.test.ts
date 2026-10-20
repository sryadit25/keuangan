import { describe, expect, it } from 'vitest';
import {
  accountBalances,
  burnRate,
  expenseByCategory,
  groupByPeriod,
  liquidBalance,
  netWorth,
  projectBalance,
  runway,
  summarize,
} from '@/lib/calc/summary';
import type { Account, Category, Transaction } from '@/lib/db/types';

function tx(partial: Partial<Transaction> & { id: string; occurred_on: string; amount: number }): Transaction {
  return {
    user_id: 'u1',
    kind: partial.amount >= 0 ? 'income' : 'expense',
    account_id: null,
    to_account_id: null,
    category_id: null,
    description: null,
    merchant: null,
    notes: null,
    source: 'manual',
    import_batch_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

const categories: Category[] = [
  { id: 'c1', user_id: 'u1', name: 'Makan', kind: 'expense', scope: 'personal', parent_id: null, icon: null },
  { id: 'c2', user_id: 'u1', name: 'Transport', kind: 'expense', scope: 'personal', parent_id: null, icon: null },
  { id: 'c3', user_id: 'u1', name: 'Freelance', kind: 'income', scope: 'personal', parent_id: null, icon: null },
];

const accounts: Account[] = [
  {
    id: 'a1',
    user_id: 'u1',
    name: 'BCA',
    type: 'bank',
    institution: 'BCA',
    opening_balance: 1_000_000,
    color: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    user_id: 'u1',
    name: 'Kartu kredit',
    type: 'credit',
    institution: null,
    opening_balance: 0,
    color: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

describe('summarize', () => {
  it('mengabaikan transfer saat menghitung arus kas', () => {
    const transactions = [
      tx({ id: '1', occurred_on: '2026-01-05', amount: 5_000_000, category_id: 'c3' }),
      tx({ id: '2', occurred_on: '2026-01-06', amount: -1_500_000, category_id: 'c1' }),
      tx({ id: '3', occurred_on: '2026-01-07', amount: -500_000, kind: 'transfer', account_id: 'a1' }),
    ];

    const summary = summarize(transactions);
    expect(summary.income).toBe(5_000_000);
    expect(summary.expense).toBe(1_500_000);
    expect(summary.net).toBe(3_500_000);
    expect(summary.savingsRate).toBeCloseTo(0.7);
    expect(summary.transactionCount).toBe(2);
  });
});

describe('groupByPeriod', () => {
  it('mengelompokkan transaksi per bulan dan mengurutkan', () => {
    const transactions = [
      tx({ id: '1', occurred_on: '2026-02-01', amount: 1_000_000 }),
      tx({ id: '2', occurred_on: '2026-01-05', amount: -200_000 }),
      tx({ id: '3', occurred_on: '2026-01-20', amount: -300_000 }),
    ];

    const monthly = groupByPeriod(transactions);
    expect(monthly).toHaveLength(2);
    expect(monthly[0].period).toBe('2026-01');
    expect(monthly[0].expense).toBe(500_000);
    expect(monthly[1].period).toBe('2026-02');
  });
});

describe('expenseByCategory', () => {
  it('menghitung total per kategori beserta porsinya', () => {
    const transactions = [
      tx({ id: '1', occurred_on: '2026-01-05', amount: -600_000, category_id: 'c1' }),
      tx({ id: '2', occurred_on: '2026-01-06', amount: -400_000, category_id: 'c2' }),
      tx({ id: '3', occurred_on: '2026-01-07', amount: -100_000, category_id: null }),
    ];

    const totals = expenseByCategory(transactions, categories);
    expect(totals[0].name).toBe('Makan');
    expect(totals[0].amount).toBe(600_000);
    expect(totals[0].share).toBeCloseTo(6 / 11);
    expect(totals.some((row) => row.name === 'Tanpa kategori')).toBe(true);
  });
});

describe('accountBalances', () => {
  it('menjumlahkan saldo awal dengan seluruh transaksi', () => {
    const transactions = [
      tx({ id: '1', occurred_on: '2026-01-05', amount: 2_000_000, account_id: 'a1' }),
      tx({ id: '2', occurred_on: '2026-01-06', amount: -500_000, account_id: 'a1' }),
    ];

    const balances = accountBalances(accounts, transactions);
    expect(balances[0].balance).toBe(2_500_000);
    expect(balances[1].balance).toBe(0);
    expect(netWorth(accounts, transactions)).toBe(2_500_000);
    expect(liquidBalance(accounts, transactions)).toBe(2_500_000);
  });
});

describe('burnRate & runway', () => {
  it('menghitung burn rate rata-rata 3 bulan terakhir', () => {
    const monthly = groupByPeriod([
      tx({ id: '1', occurred_on: '2026-01-05', amount: -1_000_000 }),
      tx({ id: '2', occurred_on: '2026-02-05', amount: -2_000_000 }),
      tx({ id: '3', occurred_on: '2026-03-05', amount: -3_000_000 }),
      tx({ id: '4', occurred_on: '2025-12-05', amount: -9_000_000 }),
    ]);

    expect(burnRate(monthly, 3)).toBe(2_000_000);
  });

  it('menghitung runway dari net burn', () => {
    expect(runway(10_000_000, 2_000_000, 1_000_000)).toBe(10);
    expect(runway(10_000_000, 1_000_000, 2_000_000)).toBeNull();
    expect(runway(0, 2_000_000, 1_000_000)).toBe(0);
  });
});

describe('projectBalance', () => {
  it('memproyeksikan saldo ke depan', () => {
    const projection = projectBalance(1_000_000, 2_000_000, 1_500_000, 3, '2026-01');
    expect(projection).toEqual([
      { period: '2026-01', balance: 1_500_000 },
      { period: '2026-02', balance: 2_000_000 },
      { period: '2026-03', balance: 2_500_000 },
    ]);
  });

  it('melewati pergantian tahun', () => {
    const projection = projectBalance(0, 1_000_000, 0, 2, '2026-12');
    expect(projection[1].period).toBe('2027-01');
  });
});
