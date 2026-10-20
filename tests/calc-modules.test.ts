import { describe, expect, it } from 'vitest';
import { budgetStatuses, totalBudget } from '@/lib/calc/budget';
import { goalProgress, goalProgressList, savedForGoal } from '@/lib/calc/goals';
import { businessPnl, campaignRoas, platformTotals } from '@/lib/calc/business';
import type { Budget, Business, BusinessExpense, Campaign, Category, Goal, GoalContribution, Transaction } from '@/lib/db/types';

const categories: Category[] = [
  { id: 'c1', user_id: 'u1', name: 'Makan', kind: 'expense', scope: 'personal', parent_id: null, icon: null },
  { id: 'c2', user_id: 'u1', name: 'Transport', kind: 'expense', scope: 'personal', parent_id: null, icon: null },
];

function tx(id: string, occurred_on: string, amount: number, category_id: string | null): Transaction {
  return {
    id,
    user_id: 'u1',
    occurred_on,
    amount,
    kind: amount >= 0 ? 'income' : 'expense',
    account_id: 'a1',
    to_account_id: null,
    category_id,
    description: null,
    merchant: null,
    notes: null,
    source: 'manual',
    import_batch_id: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('budgetStatuses', () => {
  const budgets: Budget[] = [
    { id: 'b1', user_id: 'u1', period: '2026-01', category_id: 'c1', limit_amount: 1_000_000 },
    { id: 'b2', user_id: 'u1', period: '2026-01', category_id: 'c2', limit_amount: 500_000 },
  ];

  it('menandai anggaran yang lewat dan hampir habis', () => {
    const transactions = [
      tx('1', '2026-01-05', -1_200_000, 'c1'),
      tx('2', '2026-01-06', -450_000, 'c2'),
    ];

    const statuses = budgetStatuses(budgets, categories, transactions, '2026-01');
    const makan = statuses.find((s) => s.budget.id === 'b1');
    const transport = statuses.find((s) => s.budget.id === 'b2');

    expect(makan?.state).toBe('over');
    expect(makan?.remaining).toBe(-200_000);
    expect(transport?.state).toBe('near');
    expect(transport?.remaining).toBe(50_000);
  });

  it('mengabaikan transaksi dari periode lain', () => {
    const statuses = budgetStatuses(budgets, categories, [tx('1', '2025-12-05', -900_000, 'c1')], '2026-01');
    expect(statuses.find((s) => s.budget.id === 'b1')?.spent).toBe(0);
  });

  it('menjumlahkan total limit periode', () => {
    expect(totalBudget(budgets, '2026-01')).toBe(1_500_000);
    expect(totalBudget(budgets, '2026-02')).toBe(0);
  });
});

const goal: Goal = {
  id: 'g1',
  user_id: 'u1',
  name: 'Dana darurat',
  type: 'dana_darurat',
  target_amount: 6_000_000,
  target_date: '2026-06-30',
  priority: 1,
  status: 'active',
  notes: null,
};

const contributions: GoalContribution[] = [
  { id: 'g1c1', user_id: 'u1', goal_id: 'g1', amount: 1_500_000, occurred_on: '2026-01-10', note: null },
  { id: 'g1c2', user_id: 'u1', goal_id: 'g1', amount: 500_000, occurred_on: '2026-02-10', note: null },
];

describe('goalProgress', () => {
  it('menghitung sisa, rasio, dan setoran per bulan', () => {
    const progress = goalProgress(goal, contributions, '2026-03');
    expect(progress.saved).toBe(2_000_000);
    expect(progress.remaining).toBe(4_000_000);
    expect(progress.ratio).toBeCloseTo(1 / 3);
    expect(progress.monthsLeft).toBe(3);
    expect(progress.monthlyNeeded).toBeCloseTo(4_000_000 / 3);
  });

  it('menghitung total setoran per target', () => {
    expect(savedForGoal('g1', contributions)).toBe(2_000_000);
  });

  it('mengurutkan target aktif berdasarkan prioritas', () => {
    const goals: Goal[] = [
      { ...goal, id: 'g2', name: 'Modal bisnis', priority: 2 },
      { ...goal, id: 'g3', name: 'Sudah tercapai', priority: 1, status: 'reached' },
      { ...goal, id: 'g4', name: 'Investasi', priority: 1 },
    ];
    const list = goalProgressList(goals, contributions, '2026-03');
    expect(list.map((item) => item.goal.name)).toEqual(['Investasi', 'Modal bisnis']);
  });
});

const business: Business = {
  id: 'b1',
  user_id: 'u1',
  name: 'Space Parfume',
  kind: 'own_brand',
  status: 'active',
  notes: null,
};

const campaigns: Campaign[] = [
  {
    id: 'k1',
    user_id: 'u1',
    business_id: 'b1',
    platform: 'shopee',
    period_start: '2026-01-01',
    period_end: '2026-01-31',
    spend: 10_000_000,
    revenue: 150_000_000,
    orders: 3_000,
    ctr: null,
    cvr: null,
    notes: null,
  },
  {
    id: 'k2',
    user_id: 'u1',
    business_id: 'b1',
    platform: 'meta',
    period_start: '2026-02-01',
    period_end: '2026-02-28',
    spend: 5_000_000,
    revenue: 20_000_000,
    orders: 500,
    ctr: null,
    cvr: null,
    notes: null,
  },
];

const businessExpenses: BusinessExpense[] = [
  {
    id: 'e1',
    user_id: 'u1',
    business_id: 'b1',
    occurred_on: '2026-01-15',
    amount: 5_000_000,
    category_id: null,
    description: 'COGS',
    source: 'manual',
  },
];

describe('businessPnl', () => {
  it('menghitung revenue, profit, ROAS, dan margin', () => {
    const pnl = businessPnl(business, campaigns, businessExpenses);
    expect(pnl.revenue).toBe(170_000_000);
    expect(pnl.adSpend).toBe(15_000_000);
    expect(pnl.operatingExpense).toBe(5_000_000);
    expect(pnl.profit).toBe(150_000_000);
    expect(pnl.roas).toBeCloseTo(170 / 15);
    expect(pnl.margin).toBeCloseTo(150 / 170);
    expect(pnl.orders).toBe(3_500);
  });

  it('menghitung ROAS per kampanye', () => {
    expect(campaignRoas(campaigns[0])).toBe(15);
  });

  it('mengelompokkan performa per platform', () => {
    const totals = platformTotals(campaigns);
    expect(totals).toHaveLength(2);
    expect(totals[0].platform).toBe('shopee');
    expect(totals[0].roas).toBe(15);
  });
});
