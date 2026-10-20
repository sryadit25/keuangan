import Link from 'next/link';
import { CashflowChart, CategoryPie } from '@/components/charts';
import { EmptyState, ProgressBar, StatCard } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import {
  averageIncome,
  burnRate,
  expenseByCategory,
  groupByPeriod,
  liquidBalance,
  netWorth,
  runway,
  summarize,
} from '@/lib/calc/summary';
import { budgetStatuses } from '@/lib/calc/budget';
import { goalProgressList } from '@/lib/calc/goals';
import { businessPnl } from '@/lib/calc/business';
import { currentPeriod, formatMonth, formatPercent, formatRupiah } from '@/lib/format';

export default async function DashboardPage({ searchParams }: PageProps<'/dashboard'>) {
  const params = await searchParams;
  const period = typeof params.period === 'string' ? params.period : currentPeriod();

  const ws = await loadWorkspace();
  const monthly = groupByPeriod(ws.transactions);
  const current = monthly.find((m) => m.period === period);
  const allTime = summarize(ws.transactions);
  const liquid = liquidBalance(ws.accounts, ws.transactions);
  const worth = netWorth(ws.accounts, ws.transactions);
  const burn = burnRate(monthly, 3);
  const income = averageIncome(monthly, 3);
  const monthsLeft = runway(liquid, burn, income);
  const topCategories = expenseByCategory(ws.transactions, ws.categories).slice(0, 6);
  const budgets = budgetStatuses(ws.budgets, ws.categories, ws.transactions, period);
  const goals = goalProgressList(ws.goals, ws.contributions, period);
  const pnl = ws.businesses.map((business) => businessPnl(business, ws.campaigns, ws.businessExpenses));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted">Ringkasan {formatMonth(period)} — kas pribadi terpisah dari P&amp;L bisnis.</p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="period"
            defaultValue={period}
            className="input-base w-44"
            aria-label="Pilih periode"
          />
          <button type="submit" className="btn-ghost">
            Terapkan
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Saldo likuid"
          value={formatRupiah(liquid)}
          hint={`${ws.accounts.length} rekening aktif`}
        />
        <StatCard
          label="Net worth"
          value={formatRupiah(worth)}
          hint="Saldo awal + seluruh transaksi"
        />
        <StatCard
          label="Pemasukan bulan ini"
          value={formatRupiah(current?.income ?? 0)}
          hint={`Total semua periode ${formatRupiah(allTime.income)}`}
          tone="positive"
        />
        <StatCard
          label="Pengeluaran bulan ini"
          value={formatRupiah(current?.expense ?? 0)}
          hint={`Total semua periode ${formatRupiah(allTime.expense)}`}
          tone="negative"
        />
        <StatCard
          label="Savings rate"
          value={formatPercent(current?.savingsRate ?? 0)}
          hint={`Net ${formatRupiah(current?.net ?? 0)}`}
          tone={(current?.savingsRate ?? 0) >= 0.2 ? 'positive' : 'warning'}
        />
        <StatCard
          label="Burn rate (3 bln)"
          value={`${formatRupiah(burn)}/bln`}
          hint={`Rata-rata pemasukan ${formatRupiah(income)}/bln`}
        />
        <StatCard
          label="Runway"
          value={monthsLeft === null ? 'Surplus' : `${monthsLeft.toFixed(1)} bulan`}
          hint={monthsLeft === null ? 'Pemasukan menutup pengeluaran' : 'Estimasi sebelum saldo likuid habis'}
          tone={monthsLeft === null ? 'positive' : monthsLeft < 3 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="Target aktif"
          value={`${goals.length}`}
          hint={goals[0] ? `Berikutnya: ${goals[0].goal.name}` : 'Belum ada target'}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-medium">Tren kas 6 bulan terakhir</h2>
          {monthly.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Tambahkan transaksi manual atau import mutasi rekening untuk melihat tren."
            />
          ) : (
            <CashflowChart data={monthly.slice(-6)} />
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-medium">Komposisi pengeluaran</h2>
          <CategoryPie data={topCategories.map((c) => ({ name: c.name, amount: c.amount }))} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Status anggaran</h2>
            <Link href="/anggaran" className="text-xs text-accent hover:underline">
              Kelola
            </Link>
          </div>
          {budgets.length === 0 ? (
            <EmptyState title="Belum ada anggaran" description="Tetapkan limit per kategori untuk memantau pembelanjaan." />
          ) : (
            <ul className="space-y-3">
              {budgets.slice(0, 6).map((status) => (
                <li key={status.budget.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{status.category?.name ?? 'Tanpa kategori'}</span>
                    <span className="text-muted">
                      {formatRupiah(status.spent)} / {formatRupiah(status.budget.limit_amount)}
                    </span>
                  </div>
                  <ProgressBar
                    ratio={status.ratio}
                    tone={
                      status.state === 'over' ? 'negative' : status.state === 'near' ? 'warning' : 'accent'
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Progress target</h2>
            <Link href="/target" className="text-xs text-accent hover:underline">
              Kelola
            </Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState title="Belum ada target" description="Tetapkan target dana darurat atau modal bisnis untuk dilacak." />
          ) : (
            <ul className="space-y-3">
              {goals.slice(0, 6).map((progress) => (
                <li key={progress.goal.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{progress.goal.name}</span>
                    <span className="text-muted">
                      {formatRupiah(progress.saved)} / {formatRupiah(progress.goal.target_amount)}
                    </span>
                  </div>
                  <ProgressBar ratio={progress.ratio} tone={progress.ratio >= 1 ? 'positive' : 'accent'} />
                  {progress.monthlyNeeded ? (
                    <p className="mt-1 text-xs text-muted">
                      Perlu {formatRupiah(progress.monthlyNeeded)}/bulan selama {progress.monthsLeft} bulan.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium">P&amp;L bisnis</h2>
          <Link href="/bisnis" className="text-xs text-accent hover:underline">
            Kelola
          </Link>
        </div>
        {pnl.length === 0 ? (
          <EmptyState
            title="Belum ada bisnis terdaftar"
            description="Tambahkan brand agar revenue, ad spend, dan profit bisa dilacak terpisah dari kas pribadi."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Brand</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">Ad spend</th>
                  <th className="py-2 text-right">OpEx</th>
                  <th className="py-2 text-right">Profit</th>
                  <th className="py-2 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {pnl.map((row) => (
                  <tr key={row.business.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">{row.business.name}</td>
                    <td className="py-2 text-right">{formatRupiah(row.revenue)}</td>
                    <td className="py-2 text-right">{formatRupiah(row.adSpend)}</td>
                    <td className="py-2 text-right">{formatRupiah(row.operatingExpense)}</td>
                    <td
                      className={`py-2 text-right ${row.profit >= 0 ? 'text-positive' : 'text-negative'}`}
                    >
                      {formatRupiah(row.profit)}
                    </td>
                    <td className="py-2 text-right">{row.roas ? `${row.roas.toFixed(2)}x` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
