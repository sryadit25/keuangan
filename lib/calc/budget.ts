import type { Budget, Category, Transaction } from '@/lib/db/types';

export interface BudgetStatus {
  budget: Budget;
  category: Category | null;
  spent: number;
  remaining: number;
  ratio: number;
  state: 'under' | 'near' | 'over';
}

const NEAR_THRESHOLD = 0.85;

export function spentByCategory(
  transactions: Transaction[],
  period: string,
): Map<string | null, number> {
  const totals = new Map<string | null, number>();

  for (const tx of transactions) {
    if (tx.kind === 'transfer') continue;
    if (!tx.occurred_on.startsWith(period)) continue;
    if (tx.amount >= 0) continue;
    const key = tx.category_id ?? null;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amount));
  }

  return totals;
}

export function budgetStatuses(
  budgets: Budget[],
  categories: Category[],
  transactions: Transaction[],
  period: string,
): BudgetStatus[] {
  const spent = spentByCategory(transactions, period);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return budgets
    .filter((b) => b.period === period)
    .map((budget) => {
      const used = spent.get(budget.category_id) ?? 0;
      const limit = Number(budget.limit_amount);
      const ratio = limit > 0 ? used / limit : 0;
      return {
        budget,
        category: categoryById.get(budget.category_id) ?? null,
        spent: used,
        remaining: limit - used,
        ratio,
        state: (ratio > 1 ? 'over' : ratio >= NEAR_THRESHOLD ? 'near' : 'under') as BudgetStatus['state'],
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

export function totalBudget(budgets: Budget[], period: string): number {
  return budgets
    .filter((b) => b.period === period)
    .reduce((sum, b) => sum + Number(b.limit_amount), 0);
}
