'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push(searchParams.get('next') ?? '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Masuk ke Keuangan</h1>
        <p className="mt-1 text-sm text-muted">Sistem keuangan pribadi & P&amp;L bisnis.</p>
      </div>

      <div className="space-y-1.5">
        <label className="label-muted" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input-base"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nama@email.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="label-muted" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-base"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Memproses…' : 'Masuk'}
      </button>

      <p className="text-xs text-muted">
        Belum punya akun? Buat di Supabase Dashboard → Authentication → Users, lalu jalankan
        <code className="mx-1 rounded bg-border/60 px-1 py-0.5">supabase db push</code> untuk membuat tabelnya.
      </p>
    </form>
  );
}
