import { BudgetForm, DeleteButton } from '@/components/forms';
import { EmptyState, ProgressBar } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { budgetStatuses, totalBudget } from '@/lib/calc/budget';
import { formatMonth, formatRupiah, currentPeriod } from '@/lib/format';

export default async function AnggaranPage({ searchParams }: PageProps<'/anggaran'>) {
  const params = await searchParams;
  const period = typeof params.period === 'string' ? params.period : currentPeriod();

  const ws = await loadWorkspace();
  const statuses = budgetStatuses(ws.budgets, ws.categories, ws.transactions, period);
  const totalLimit = totalBudget(ws.budgets, period);
  const totalSpent = statuses.reduce((sum, s) => sum + s.spent, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Anggaran bulanan</h1>
          <p className="text-sm text-muted">
            {formatMonth(period)} · terpakai {formatRupiah(totalSpent)} dari {formatRupiah(totalLimit)}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input type="month" name="period" defaultValue={period} className="input-base w-44" aria-label="Periode" />
          <button type="submit" className="btn-ghost">
            Terapkan
          </button>
        </form>
      </header>

      <BudgetForm categories={ws.categories} period={period} />

      <section className="card">
        <h2 className="mb-3 font-medium">Status anggaran</h2>
        {statuses.length === 0 ? (
          <EmptyState title="Belum ada anggaran" description="Tetapkan limit per kategori agar pembelanjaan bisa dipantau." />
        ) : (
          <ul className="space-y-4">
            {statuses.map((status) => (
              <li key={status.budget.id}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{status.category?.name ?? 'Tanpa kategori'}</span>
                  <span className="text-muted">
                    {formatRupiah(status.spent)} / {formatRupiah(status.budget.limit_amount)} · sisa{' '}
                    {formatRupiah(status.remaining)}
                  </span>
                </div>
                <ProgressBar
                  ratio={status.ratio}
                  tone={status.state === 'over' ? 'negative' : status.state === 'near' ? 'warning' : 'accent'}
                />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span
                    className={
                      status.state === 'over'
                        ? 'text-negative'
                        : status.state === 'near'
                          ? 'text-warning'
                          : 'text-muted'
                    }
                  >
                    {status.state === 'over'
                      ? 'Lewat batas'
                      : status.state === 'near'
                        ? 'Hampir habis'
                        : 'Masih aman'}
                  </span>
                  <DeleteButton url={`/api/budgets?id=${status.budget.id}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
