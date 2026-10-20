import { EmptyState } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { fetchReports } from '@/lib/db/queries';
import { isAiConfigured } from '@/lib/ai/provider';
import { currentPeriod, formatMonth } from '@/lib/format';
import { GenerateReport } from './generate-report';

export default async function LaporanPage() {
  const ws = await loadWorkspace();
  const reports = await fetchReports(ws.supabase);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Laporan bulanan</h1>
        <p className="text-sm text-muted">
          Ringkasan otomatis dari data kas pribadi + P&amp;L bisnis, ditutup dengan tiga prioritas bulan berikutnya.
        </p>
      </header>

      <GenerateReport aiReady={isAiConfigured()} defaultPeriod={currentPeriod()} />

      {reports.length === 0 ? (
        <EmptyState title="Belum ada laporan" description="Buat laporan pertama dengan tombol di atas." />
      ) : (
        reports.map((report) => (
          <article key={report.id} className="card space-y-3">
            <h2 className="font-medium">Laporan {formatMonth(report.period)}</h2>
            <div className="space-y-2 text-sm whitespace-pre-wrap">{report.summary_md}</div>
          </article>
        ))
      )}
    </div>
  );
}
