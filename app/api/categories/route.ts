import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  kind: z.enum(['income', 'expense']),
  scope: z.enum(['personal', 'business']).default('personal'),
  parent_id: z.string().nullish(),
  icon: z.string().nullish(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { data } = await session.supabase.from('categories').select('*').order('name');
  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('categories')
    .insert({
      user_id: session.userId,
      name: parsed.data.name,
      kind: parsed.data.kind,
      scope: parsed.data.scope,
      parent_id: parsed.data.parent_id ?? null,
      icon: parsed.data.icon ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ category: data }, { status: 201 });
}
