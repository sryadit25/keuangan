import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';

const campaignSchema = z.object({
  business_id: z.string().min(1),
  platform: z.enum(['shopee', 'tiktok', 'meta', 'tiktok_shop', 'google', 'lainnya']),
  period_start: z.string().min(4),
  period_end: z.string().min(4),
  spend: z.number().default(0),
  revenue: z.number().default(0),
  orders: z.number().int().nullish(),
  ctr: z.number().nullish(),
  cvr: z.number().nullish(),
  notes: z.string().nullish(),
});

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { data } = await session.supabase
    .from('campaigns')
    .select('*')
    .order('period_start', { ascending: false });
  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { data, error } = await session.supabase
    .from('campaigns')
    .insert({
      user_id: session.userId,
      business_id: parsed.data.business_id,
      platform: parsed.data.platform,
      period_start: parsed.data.period_start,
      period_end: parsed.data.period_end,
      spend: parsed.data.spend,
      revenue: parsed.data.revenue,
      orders: parsed.data.orders ?? null,
      ctr: parsed.data.ctr ?? null,
      cvr: parsed.data.cvr ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ campaign: data }, { status: 201 });
}
