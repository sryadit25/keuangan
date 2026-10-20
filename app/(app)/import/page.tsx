import { loadWorkspace } from '@/lib/data';
import { ImportUploader } from './import-uploader';

export default async function ImportPage() {
  const ws = await loadWorkspace();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Import CSV</h1>
        <p className="text-sm text-muted">
          Upload mutasi rekening/e-wallet atau laporan iklan. Selalu preview dulu sebelum disimpan; file yang
          sama tidak akan terimport dua kali.
        </p>
      </header>

      <ImportUploader
        accounts={ws.accounts.map((a) => ({ id: a.id, name: a.name }))}
        businesses={ws.businesses.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
