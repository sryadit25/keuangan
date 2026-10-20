import { AccountForm, CategoryForm } from '@/components/forms';
import { EmptyState } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { accountBalances } from '@/lib/calc/summary';
import { formatRupiah } from '@/lib/format';

const TYPE_LABEL: Record<string, string> = {
  bank: 'Bank',
  ewallet: 'E-wallet',
  savings: 'Tabungan',
  cash: 'Tunai',
  credit: 'Kartu kredit',
};

export default async function AkunPage() {
  const ws = await loadWorkspace();
  const balances = accountBalances(ws.accounts, ws.transactions);
  const total = balances.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rekening &amp; kategori</h1>
        <p className="text-sm text-muted">
          Total saldo {formatRupiah(total)} · saldo dihitung dari saldo awal + transaksi.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-x-auto">
          <h2 className="mb-3 font-medium">Rekening</h2>
          {balances.length === 0 ? (
            <EmptyState title="Belum ada rekening" description="Tambahkan rekening atau e-wallet yang kamu pakai." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Nama</th>
                  <th className="py-2">Jenis</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {balances.map(({ account, balance }) => (
                  <tr key={account.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">
                      {account.name}
                      {account.institution ? (
                        <span className="block text-xs text-muted">{account.institution}</span>
                      ) : null}
                    </td>
                    <td className="py-2 text-muted">{TYPE_LABEL[account.type]}</td>
                    <td className={`py-2 text-right font-medium ${balance < 0 ? 'text-negative' : ''}`}>
                      {formatRupiah(balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <AccountForm />
          <CategoryForm />
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-medium">Kategori</h2>
        {ws.categories.length === 0 ? (
          <EmptyState
            title="Belum ada kategori"
            description="Kategori memudahkan mengelompokkan pengeluaran untuk anggaran dan laporan."
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {ws.categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted"
              >
                {category.name} · {category.kind === 'income' ? 'masuk' : 'keluar'} · {category.scope}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
