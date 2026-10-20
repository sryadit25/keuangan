import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const budgetSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Periode harus format YYYY-MM'),
  category_id: z.string().min(1),
  limit_amount: z.number().positive('Limit harus lebih dari nol'),
});

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const period = new URL(request.url).searchParams.get('period');
  let query = session.supabase.from('budgets').select('*');
  if (period) query = query.eq('period', period);

  const { data, error } = await query;
  if (error) return serverError(error);
  return NextResponse.json({ budgets: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = budgetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('budgets')
    .upsert(
      {
        user_id: session.userId,
        period: parsed.data.period,
        category_id: parsed.data.category_id,
        limit_amount: parsed.data.limit_amount,
      },
      { onConflict: 'user_id,period,category_id' },
    )
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ budget: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return badRequest('Parameter id wajib diisi');

  const { error } = await session.supabase.from('budgets').delete().eq('id', id);
  if (error) return serverError(error);
  return NextResponse.json({ ok: true });
}
