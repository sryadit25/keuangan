import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const transactionSchema = z.object({
  occurred_on: z.string().min(4, 'Tanggal wajib diisi'),
  amount: z.number().refine((value) => value !== 0, 'Nominal tidak boleh nol'),
  kind: z.enum(['income', 'expense', 'transfer']),
  account_id: z.string().nullish(),
  to_account_id: z.string().nullish(),
  category_id: z.string().nullish(),
  description: z.string().nullish(),
  merchant: z.string().nullish(),
  notes: z.string().nullish(),
  source: z.enum(['manual', 'csv']).default('manual'),
  import_batch_id: z.string().nullish(),
});

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const url = new URL(request.url);
  let query = session.supabase.from('transactions').select('*').order('occurred_on', { ascending: false });

  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const accountId = url.searchParams.get('account_id');
  const categoryId = url.searchParams.get('category_id');

  if (from) query = query.gte('occurred_on', from);
  if (to) query = query.lte('occurred_on', to);
  if (accountId) query = query.eq('account_id', accountId);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error) return serverError(error);
  return NextResponse.json({ transactions: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = transactionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const input = parsed.data;

  const rows = [
    {
      user_id: session.userId,
      occurred_on: input.occurred_on,
      amount: input.amount,
      kind: input.kind,
      account_id: input.account_id ?? null,
      to_account_id: input.to_account_id ?? null,
      category_id: input.kind === 'transfer' ? null : (input.category_id ?? null),
      description: input.description ?? null,
      merchant: input.merchant ?? null,
      notes: input.notes ?? null,
      source: input.source,
      import_batch_id: input.import_batch_id ?? null,
    },
  ];

  // Transfer dicatat sebagai dua baris: keluar dari akun asal, masuk ke akun tujuan.
  if (input.kind === 'transfer' && input.account_id && input.to_account_id) {
    rows.push({
      ...rows[0],
      amount: Math.abs(input.amount),
      account_id: input.to_account_id,
      to_account_id: input.account_id,
    });
  }

  const { data, error } = await session.supabase.from('transactions').insert(rows).select();
  if (error) return serverError(error);

  return NextResponse.json({ transactions: data ?? [] }, { status: 201 });
}
