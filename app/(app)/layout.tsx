import Link from 'next/link';
import { Nav } from '@/components/nav';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-lg space-y-3">
          <h1 className="text-xl font-semibold">Supabase belum dikonfigurasi</h1>
          <p className="text-sm text-muted">
            Isi <code className="rounded bg-border/60 px-1 py-0.5">.env.local</code> dengan
            <code className="mx-1 rounded bg-border/60 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> dan
            <code className="mx-1 rounded bg-border/60 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, lalu jalankan
            <code className="mx-1 rounded bg-border/60 px-1 py-0.5">supabase db push</code>.
          </p>
          <Link href="/login" className="btn-primary">
            Ke halaman login
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-muted">Memuat sesi…</p>
      </div>
    );
  }

  await ensureProfile(supabase, user.id, user.email);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface p-4 md:block">
        <Link href="/dashboard" className="mb-6 block px-3 text-lg font-semibold">
          Keuangan
        </Link>
        <Nav />
        <form action="/api/auth/logout" method="post" className="mt-6 px-3">
          <button type="submit" className="text-xs text-muted underline-offset-2 hover:underline">
            Keluar
          </button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3 md:hidden">
          <Link href="/dashboard" className="font-semibold">
            Keuangan
          </Link>
          <Nav />
        </header>
        <main className="mx-auto w-full max-w-6xl p-5 pb-16">{children}</main>
      </div>
    </div>
  );
}
