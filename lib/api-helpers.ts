import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface Session {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}

/** Mengembalikan session bila user terautentikasi, null bila tidak. */
export async function requireSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { supabase, userId: user.id };
}

export function unauthorized() {
  return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Terjadi kesalahan';
  return NextResponse.json({ error: message }, { status: 500 });
}
