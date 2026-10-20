import type { Account, Category, Transaction } from '@/lib/db/types';

export interface MonthlyPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  amount: number;
  share: number;
}

export interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
}

export interface AccountBalance {
  account: Account;
  balance: number;
}

export interface ProjectionPoint {
  period: string;
  balance: number;
}

export function periodOf(date: string): string {
  return date.slice(0, 7);
}

function isCashflow(tx: Pick<Transaction, 'kind'>): boolean {
  return tx.kind !== 'transfer';
}

/**
 * Transfer antar akun dicatat sebagai dua baris (keluar & masuk), jadi arus kas
 * personal harus mengabaikan `kind = 'transfer'`.
 */
export function summarize(transactions: Transaction[]): CashflowSummary {
  let income = 0;
  let expense = 0;
  let count = 0;

  for (const tx of transactions) {
    if (!isCashflow(tx)) continue;
    count += 1;
    if (tx.amount >= 0) income += tx.amount;
    else expense += Math.abs(tx.amount);
  }

  const net = income - expense;
  return {
    income,
    expense,
    net,
    savingsRate: income > 0 ? net / income : 0,
    transactionCount: count,
  };
}

export function groupByPeriod(transactions: Transaction[]): MonthlyPoint[] {
  const buckets = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    if (!isCashflow(tx)) continue;
    const period = periodOf(tx.occurred_on);
    const bucket = buckets.get(period) ?? { income: 0, expense: 0 };
    if (tx.amount >= 0) bucket.income += tx.amount;
    else bucket.expense += Math.abs(tx.amount);
    buckets.set(period, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { income, expense }]) => {
      const net = income - expense;
      return { period, income, expense, net, savingsRate: income > 0 ? net / income : 0 };
    });
}

export function expenseByCategory(
  transactions: Transaction[],
  categories: Category[],
): CategoryTotal[] {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const totals = new Map<string | null, number>();

  for (const tx of transactions) {
    if (!isCashflow(tx) || tx.amount >= 0) continue;
    const key = tx.category_id ?? null;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(tx.amount));
  }

  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v, 0);

  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryId ? (nameById.get(categoryId) ?? 'Tanpa kategori') : 'Tanpa kategori',
      amount,
      share: grandTotal > 0 ? amount / grandTotal : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function accountBalances(accounts: Account[], transactions: Transaction[]): AccountBalance[] {
  const deltaByAccount = new Map<string, number>();

  for (const tx of transactions) {
    if (!tx.account_id) continue;
    deltaByAccount.set(tx.account_id, (deltaByAccount.get(tx.account_id) ?? 0) + Number(tx.amount));
  }

  return accounts.map((account) => ({
    account,
    balance: Number(account.opening_balance) + (deltaByAccount.get(account.id) ?? 0),
  }));
}

export function liquidBalance(accounts: Account[], transactions: Transaction[]): number {
  return accountBalances(accounts, transactions)
    .filter(({ account }) => account.type !== 'credit')
    .reduce((sum, { balance }) => sum + balance, 0);
}

export function netWorth(accounts: Account[], transactions: Transaction[]): number {
  return accountBalances(accounts, transactions).reduce((sum, { balance }) => sum + balance, 0);
}

/**
 * Burn rate = rata-rata pengeluaran bulanan dari `months` bulan terakhir
 * yang punya data. Dipakai untuk mengestimasi runway.
 */
export function burnRate(monthly: MonthlyPoint[], months = 3): number {
  if (monthly.length === 0) return 0;
  const recent = monthly.slice(-months);
  const total = recent.reduce((sum, m) => sum + m.expense, 0);
  return total / recent.length;
}

export function averageIncome(monthly: MonthlyPoint[], months = 3): number {
  if (monthly.length === 0) return 0;
  const recent = monthly.slice(-months);
  return recent.reduce((sum, m) => sum + m.income, 0) / recent.length;
}

/**
 * Runway = berapa bulan saldo likuid bertahan pada pace saat ini.
 * Null bila surplus (tidak ada dana yang sedang habis).
 */
export function runway(liquid: number, monthlyExpense: number, monthlyIncome: number): number | null {
  const netBurn = monthlyExpense - monthlyIncome;
  if (netBurn <= 0) return null;
  if (liquid <= 0) return 0;
  return liquid / netBurn;
}

export function projectBalance(
  startBalance: number,
  monthlyIncome: number,
  monthlyExpense: number,
  months: number,
  startPeriod: string,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let balance = startBalance;
  let [year, month] = startPeriod.split('-').map(Number);

  for (let i = 0; i < months; i += 1) {
    balance += monthlyIncome - monthlyExpense;
    points.push({ period: `${year}-${String(month).padStart(2, '0')}`, balance });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return points;
}
