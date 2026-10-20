import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const businessSchema = z.object({
  name: z.string().min(1, 'Nama brand wajib diisi'),
  kind: z.enum(['own_brand', 'client_service']).default('own_brand'),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  notes: z.string().nullish(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { data } = await session.supabase.from('businesses').select('*').order('created_at');
  return NextResponse.json({ businesses: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = businessSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('businesses')
    .insert({
      user_id: session.userId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ business: data }, { status: 201 });
}
