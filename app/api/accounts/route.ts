import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const accountSchema = z.object({
  name: z.string().min(1, 'Nama rekening wajib diisi'),
  type: z.enum(['bank', 'ewallet', 'cash', 'savings', 'credit']),
  institution: z.string().nullish(),
  opening_balance: z.number().default(0),
  color: z.string().nullish(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { data } = await session.supabase.from('accounts').select('*').order('created_at');
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = accountSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('accounts')
    .insert({
      user_id: session.userId,
      name: parsed.data.name,
      type: parsed.data.type,
      institution: parsed.data.institution ?? null,
      opening_balance: parsed.data.opening_balance,
      color: parsed.data.color ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ account: data }, { status: 201 });
}
