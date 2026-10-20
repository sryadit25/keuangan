'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GenerateReport({ aiReady, defaultPeriod }: { aiReady: boolean; defaultPeriod: string }) {
  const router = useRouter();
  const [period, setPeriod] = useState(defaultPeriod);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Gagal membuat laporan');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat laporan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label className="label-muted" htmlFor="report-period">
          Periode laporan
        </label>
        <input
          id="report-period"
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="input-base w-44"
        />
      </div>
      <button type="button" onClick={generate} className="btn-primary" disabled={loading || !aiReady}>
        {loading ? 'Menyusun…' : 'Buat laporan bulanan'}
      </button>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      {!aiReady ? (
        <p className="text-xs text-muted">AI belum dikonfigurasi — isi AI_PROVIDER &amp; AI_API_KEY di .env.local.</p>
      ) : null}
    </div>
  );
}
