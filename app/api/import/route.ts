import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';
import { INSTITUTIONS, parseCsv } from '@/lib/csv/parsers';

const importSchema = z.object({
  csvText: z.string().min(1, 'File CSV kosong'),
  fileName: z.string().min(1),
  mode: z.enum(['preview', 'commit']).default('preview'),
  account_id: z.string().nullish(),
  business_id: z.string().nullish(),
  institutionId: z.string().nullish(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  const { csvText, fileName, mode, account_id, business_id, institutionId } = parsed.data;
  const forced = institutionId ? INSTITUTIONS.find((item) => item.id === institutionId) : undefined;
  const result = parseCsv(csvText, forced);

  if (mode === 'preview') {
    return NextResponse.json({
      institution: result.institution,
      kind: result.kind,
      rows: result.rows.slice(0, 50),
      adsRows: result.adsRows.slice(0, 50),
      totalRows: result.kind === 'ads' ? result.adsRows.length : result.rows.length,
      warnings: result.warnings,
      unmappedColumns: result.unmappedColumns,
    });
  }

  const contentHash = createHash('sha256').update(csvText).digest('hex');
  const { data: existing } = await session.supabase
    .from('import_batches')
    .select('id')
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ skipped: true, reason: 'File ini sudah pernah diimport.' });
  }

  const { data: batch, error: batchError } = await session.supabase
    .from('import_batches')
    .insert({
      user_id: session.userId,
      account_id: account_id ?? null,
      file_name: fileName,
      row_count: result.kind === 'ads' ? result.adsRows.length : result.rows.length,
      status: 'completed',
      content_hash: contentHash,
    })
    .select()
    .single();

  if (batchError) return serverError(batchError);

  if (result.kind === 'ads') {
    if (!business_id) {
      return badRequest('Pilih brand/business tujuan sebelum mengimport file iklan.');
    }

    const rows = result.adsRows.map((row) => ({
      user_id: session.userId,
      business_id,
      platform: row.platform,
      period_start: row.date,
      period_end: row.date,
      spend: row.spend,
      revenue: row.revenue,
      orders: row.orders,
      ctr: row.ctr,
      cvr: row.cvr,
      notes: row.campaignName,
    }));

    const { error } = await session.supabase.from('campaigns').insert(rows);
    if (error) return serverError(error);
    return NextResponse.json({ imported: rows.length, batchId: batch.id, kind: 'ads' });
  }

  const rows = result.rows.map((row) => ({
    user_id: session.userId,
    occurred_on: row.occurred_on,
    amount: row.amount,
    kind: row.amount >= 0 ? 'income' : 'expense',
    account_id: account_id ?? null,
    category_id: null,
    description: row.description,
    merchant: row.merchant,
    source: 'csv',
    import_batch_id: batch.id,
  }));

  const { error } = await session.supabase.from('transactions').insert(rows);
  if (error) return serverError(error);

  return NextResponse.json({ imported: rows.length, batchId: batch.id, kind: 'account' });
}
