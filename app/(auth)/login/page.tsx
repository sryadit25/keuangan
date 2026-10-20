import { Suspense } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card w-full max-w-lg space-y-3">
          <h1 className="text-xl font-semibold">Supabase belum dikonfigurasi</h1>
          <p className="text-sm text-muted">
            Aplikasi butuh Supabase untuk menyimpan data keuangan. Isi file <code>.env.local</code> di root
            project dengan:
          </p>
          <pre className="overflow-x-auto rounded-lg bg-foreground/5 p-4 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>`}
          </pre>
          <p className="text-sm text-muted">
            Setelah itu jalankan <code className="rounded bg-border/60 px-1 py-0.5">supabase db push</code>{' '}
            untuk membuat skema tabel, lalu buat user di Supabase Dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
