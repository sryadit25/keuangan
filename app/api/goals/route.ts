import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const goalSchema = z.object({
  name: z.string().min(1, 'Nama target wajib diisi'),
  type: z.enum(['dana_darurat', 'modal_bisnis', 'investasi', 'lainnya']).default('lainnya'),
  target_amount: z.number().positive('Target harus lebih dari nol'),
  target_date: z.string().nullish(),
  priority: z.number().int().min(1).max(5).default(3),
  notes: z.string().nullish(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { data } = await session.supabase.from('goals').select('*').order('priority');
  return NextResponse.json({ goals: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = goalSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('goals')
    .insert({
      user_id: session.userId,
      name: parsed.data.name,
      type: parsed.data.type,
      target_amount: parsed.data.target_amount,
      target_date: parsed.data.target_date ?? null,
      priority: parsed.data.priority,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ goal: data }, { status: 201 });
}
