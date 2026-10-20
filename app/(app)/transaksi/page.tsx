import { DeleteButton, TransactionForm } from '@/components/forms';
import { EmptyState } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { formatDate, formatRupiah, monthRange } from '@/lib/format';

export default async function TransaksiPage({ searchParams }: PageProps<'/transaksi'>) {
  const params = await searchParams;
  const period = typeof params.period === 'string' ? params.period : new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(period);

  const ws = await loadWorkspace();
  const transactions = ws.transactions.filter((tx) => tx.occurred_on >= start && tx.occurred_on <= end);
  const categoryById = new Map(ws.categories.map((c) => [c.id, c.name]));
  const accountById = new Map(ws.accounts.map((a) => [a.id, a.name]));

  const income = transactions.filter((tx) => tx.kind !== 'transfer' && tx.amount > 0);
  const expense = transactions.filter((tx) => tx.kind !== 'transfer' && tx.amount < 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transaksi</h1>
          <p className="text-sm text-muted">
            {formatRupiah(income.reduce((s, t) => s + t.amount, 0))} masuk ·{' '}
            {formatRupiah(expense.reduce((s, t) => s + Math.abs(t.amount), 0))} keluar
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input type="month" name="period" defaultValue={period} className="input-base w-44" aria-label="Periode" />
          <button type="submit" className="btn-ghost">
            Terapkan
          </button>
        </form>
      </header>

      <TransactionForm accounts={ws.accounts} categories={ws.categories} />

      <section className="card overflow-x-auto">
        {transactions.length === 0 ? (
          <EmptyState
            title="Belum ada transaksi di periode ini"
            description="Tambah transaksi di atas, atau import mutasi rekening dari halaman Import CSV."
          />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2">Tanggal</th>
                <th className="py-2">Keterangan</th>
                <th className="py-2">Kategori</th>
                <th className="py-2">Rekening</th>
                <th className="py-2 text-right">Nominal</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 whitespace-nowrap text-muted">{formatDate(tx.occurred_on)}</td>
                  <td className="py-2">{tx.description ?? '—'}</td>
                  <td className="py-2 text-muted">{tx.category_id ? (categoryById.get(tx.category_id) ?? '—') : '—'}</td>
                  <td className="py-2 text-muted">{tx.account_id ? (accountById.get(tx.account_id) ?? '—') : '—'}</td>
                  <td
                    className={`py-2 text-right font-medium ${
                      tx.amount >= 0 ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : '−'}
                    {formatRupiah(Math.abs(tx.amount))}
                  </td>
                  <td className="py-2 text-right">
                    <DeleteButton url={`/api/transactions/${tx.id}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
