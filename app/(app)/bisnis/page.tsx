import { BusinessForm, CampaignForm } from '@/components/forms';
import { EmptyState } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { businessPnl, platformTotals } from '@/lib/calc/business';
import { formatPercent, formatRupiah } from '@/lib/format';

export default async function BisnisPage() {
  const ws = await loadWorkspace();
  const rows = ws.businesses.map((business) => businessPnl(business, ws.campaigns, ws.businessExpenses));
  const platforms = platformTotals(ws.campaigns);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Bisnis &amp; iklan</h1>
        <p className="text-sm text-muted">
          P&amp;L bisnis terpisah dari kas pribadi, supaya profit brand tidak tercampur dengan pengeluaran harian.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <BusinessForm />
        <CampaignForm businesses={ws.businesses.map((b) => ({ id: b.id, name: b.name }))} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-medium">P&amp;L per brand</h2>
        {rows.length === 0 ? (
          <EmptyState
            title="Belum ada brand terdaftar"
            description="Tambahkan brand sendiri atau klien yang kamu handle, lalu catat ad spend dan revenue-nya."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Brand</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">Ad spend</th>
                  <th className="py-2 text-right">OpEx</th>
                  <th className="py-2 text-right">Profit</th>
                  <th className="py-2 text-right">Margin</th>
                  <th className="py-2 text-right">ROAS</th>
                  <th className="py-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.business.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2">
                      {row.business.name}
                      <span className="block text-xs text-muted">
                        {row.business.kind === 'own_brand' ? 'Brand sendiri' : 'Servis klien'}
                      </span>
                    </td>
                    <td className="py-2 text-right">{formatRupiah(row.revenue)}</td>
                    <td className="py-2 text-right">{formatRupiah(row.adSpend)}</td>
                    <td className="py-2 text-right">{formatRupiah(row.operatingExpense)}</td>
                    <td className={`py-2 text-right ${row.profit >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {formatRupiah(row.profit)}
                    </td>
                    <td className="py-2 text-right">{row.margin === null ? '-' : formatPercent(row.margin)}</td>
                    <td className="py-2 text-right">{row.roas ? `${row.roas.toFixed(2)}x` : '-'}</td>
                    <td className="py-2 text-right">{row.orders || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-medium">Performa per platform</h2>
        {platforms.length === 0 ? (
          <EmptyState title="Belum ada kampanye" description="Catat kampanye iklan untuk melihat ROAS per platform." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2">Platform</th>
                  <th className="py-2 text-right">Spend</th>
                  <th className="py-2 text-right">Revenue</th>
                  <th className="py-2 text-right">ROAS</th>
                  <th className="py-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((row) => (
                  <tr key={row.platform} className="border-b border-border/60 last:border-0">
                    <td className="py-2 uppercase">{row.platform}</td>
                    <td className="py-2 text-right">{formatRupiah(row.spend)}</td>
                    <td className="py-2 text-right">{formatRupiah(row.revenue)}</td>
                    <td className="py-2 text-right">{row.roas ? `${row.roas.toFixed(2)}x` : '-'}</td>
                    <td className="py-2 text-right">{row.orders || '-'}</td>
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
