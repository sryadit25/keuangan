import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const contributionSchema = z.object({
  amount: z.number().positive('Nominal setoran harus lebih dari nol'),
  occurred_on: z.string().min(4),
  note: z.string().nullish(),
});

type Ctx = RouteContext<'/api/goals/[id]/contributions'>;

export async function POST(request: Request, context: Ctx) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await context.params;
  const parsed = contributionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('goal_contributions')
    .insert({
      user_id: session.userId,
      goal_id: id,
      amount: parsed.data.amount,
      occurred_on: parsed.data.occurred_on,
      note: parsed.data.note ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ contribution: data }, { status: 201 });
}
