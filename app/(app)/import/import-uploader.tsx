'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

interface Preview {
  institution: string;
  kind: 'account' | 'ads';
  rows: Array<{ occurred_on: string; amount: number; description: string; balance: number | null }>;
  adsRows: Array<{ date: string; platform: string; campaignName: string; spend: number; revenue: number; orders: number | null }>;
  totalRows: number;
  warnings: string[];
  unmappedColumns: string[];
}

export function ImportUploader({
  accounts,
  businesses,
}: {
  accounts: { id: string; name: string }[];
  businesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setCsvText(await file.text());
    setPreview(null);
    setMessage(null);
    setError(null);
  }

  async function run(mode: 'preview' | 'commit') {
    if (!csvText) {
      setError('Pilih file CSV terlebih dahulu.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          fileName,
          mode,
          account_id: accountId || null,
          business_id: businessId || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Gagal memproses file');

      if (mode === 'preview') {
        setPreview(payload);
      } else {
        setMessage(
          payload.skipped
            ? payload.reason
            : `${payload.imported} baris berhasil diimport${payload.kind === 'ads' ? ' sebagai kampanye iklan' : ''}.`,
        );
        setPreview(null);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses file');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="csv-file">
            File CSV
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            ref={fileRef}
            onChange={handleFile}
            className="input-base"
          />
          <p className="text-xs text-muted">
            Didukung: mutasi BCA, Mandiri, BNI, BRI, Permata, Danamon, CIMB, Bank Syariah, GoPay, OVO, DANA,
            ShopeePay, Tokopedia, dan laporan iklan Meta/Google/TikTok/Shopee Ads. File lain diparse otomatis.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="label-muted" htmlFor="csv-account">
              Rekening tujuan
            </label>
            <select
              id="csv-account"
              className="input-base"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">Pilih rekening (untuk file mutasi)</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="label-muted" htmlFor="csv-business">
              Brand tujuan
            </label>
            <select
              id="csv-business"
              className="input-base"
              value={businessId}
              onChange={(event) => setBusinessId(event.target.value)}
            >
              <option value="">Pilih brand (untuk file iklan)</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => run('preview')} className="btn-ghost" disabled={busy || !csvText}>
            {busy ? 'Memproses…' : 'Preview'}
          </button>
          <button
            type="button"
            onClick={() => run('commit')}
            className="btn-primary"
            disabled={busy || !csvText || !preview}
          >
            Simpan ke database
          </button>
        </div>

        {error ? <p className="text-sm text-negative">{error}</p> : null}
        {message ? <p className="text-sm text-positive">{message}</p> : null}
      </div>

      {preview ? (
        <div className="card space-y-3">
          <div>
            <h2 className="font-medium">
              Preview — {preview.institution} ({preview.kind === 'ads' ? 'laporan iklan' : 'mutasi rekening'})
            </h2>
            <p className="text-xs text-muted">{preview.totalRows} baris terbaca.</p>
          </div>

          {preview.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              {preview.warnings.slice(0, 5).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {preview.unmappedColumns.length > 0 ? (
            <p className="text-xs text-muted">
              Kolom yang tidak dipakai: {preview.unmappedColumns.join(', ')}
            </p>
          ) : null}

          <div className="overflow-x-auto">
            {preview.kind === 'ads' ? (
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">Platform</th>
                    <th className="py-2">Kampanye</th>
                    <th className="py-2 text-right">Spend</th>
                    <th className="py-2 text-right">Revenue</th>
                    <th className="py-2 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.adsRows.map((row, index) => (
                    <tr key={`${row.date}-${index}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2">{row.date}</td>
                      <td className="py-2 uppercase">{row.platform}</td>
                      <td className="py-2">{row.campaignName}</td>
                      <td className="py-2 text-right">{row.spend.toLocaleString('id-ID')}</td>
                      <td className="py-2 text-right">{row.revenue.toLocaleString('id-ID')}</td>
                      <td className="py-2 text-right">{row.orders ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2">Tanggal</th>
                    <th className="py-2">Keterangan</th>
                    <th className="py-2 text-right">Nominal</th>
                    <th className="py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, index) => (
                    <tr key={`${row.occurred_on}-${index}`} className="border-b border-border/60 last:border-0">
                      <td className="py-2">{row.occurred_on}</td>
                      <td className="py-2">{row.description}</td>
                      <td
                        className={`py-2 text-right ${row.amount >= 0 ? 'text-positive' : 'text-negative'}`}
                      >
                        {row.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-2 text-right text-muted">{row.balance?.toLocaleString('id-ID') ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
