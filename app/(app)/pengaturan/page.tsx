import { loadWorkspace } from '@/lib/data';
import { DEFAULT_MODELS, resolveAiConfig } from '@/lib/ai/provider';
import { formatRupiah } from '@/lib/format';

export default async function PengaturanPage() {
  const ws = await loadWorkspace();
  const config = resolveAiConfig();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted">Konfigurasi provider AI, target tabungan, dan info akun.</p>
      </header>

      <section className="card space-y-3">
        <h2 className="font-medium">AI Advisor</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="label-muted">Provider aktif</dt>
            <dd>{config?.provider ?? 'belum dikonfigurasi'}</dd>
          </div>
          <div>
            <dt className="label-muted">Model</dt>
            <dd>{config?.model ?? '-'}</dd>
          </div>
          <div>
            <dt className="label-muted">Base URL</dt>
            <dd>{config?.baseURL ?? 'default provider'}</dd>
          </div>
          <div>
            <dt className="label-muted">API key</dt>
            <dd>{config ? 'terpasang' : 'belum ada'}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted">
          Provider diubah lewat environment variable <code>AI_PROVIDER</code> (
          {Object.entries(DEFAULT_MODELS).map(([key, model]) => `${key}: ${model}`).join(' · ')}), lalu restart server.
          Nilai <code>AI_BASE_URL</code> dipakai untuk endpoint OpenAI-compatible seperti DashScope/Qwen.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Profil</h2>
        <p className="text-sm text-muted">
          Nama: {ws.profile?.full_name ?? '-'} · Target tabungan bulanan:{' '}
          {formatRupiah(ws.profile?.monthly_savings_target ?? 0)}
        </p>
        <p className="text-xs text-muted">
          Email login: {ws.userId.slice(0, 8)}… (data keuangan bersifat sensitif, jangan dibagikan).
        </p>
      </section>
    </div>
  );
}
