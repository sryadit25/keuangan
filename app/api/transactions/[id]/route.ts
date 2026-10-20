import { NextResponse } from 'next/server';
import { requireSession, serverError, unauthorized } from '@/lib/api-helpers';

type Ctx = RouteContext<'/api/transactions/[id]'>;

export async function PATCH(request: Request, context: Ctx) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
  }

  const allowed = [
    'occurred_on',
    'amount',
    'kind',
    'account_id',
    'to_account_id',
    'category_id',
    'description',
    'merchant',
    'notes',
  ] as const;

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = (body as Record<string, unknown>)[key];
  }

  const { data, error } = await session.supabase
    .from('transactions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ transaction: data });
}

export async function DELETE(_request: Request, context: Ctx) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await context.params;
  const { error } = await session.supabase.from('transactions').delete().eq('id', id);
  if (error) return serverError(error);

  return NextResponse.json({ ok: true });
}
