import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';
import { loadWorkspace } from '@/lib/data';
import { complete, resolveAiConfig } from '@/lib/ai/provider';
import { buildContextText, REPORT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { currentPeriod, formatMonth } from '@/lib/format';
import {
  averageIncome,
  burnRate,
  expenseByCategory,
  groupByPeriod,
  liquidBalance,
  summarize,
} from '@/lib/calc/summary';

const reportSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Periode harus format YYYY-MM').optional(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  if (!resolveAiConfig()) {
    return badRequest(
      'AI belum dikonfigurasi. Isi AI_PROVIDER dan AI_API_KEY di .env.local, lalu restart server.',
    );
  }

  const period = parsed.data.period ?? currentPeriod();
  const workspace = await loadWorkspace();

  const monthly = groupByPeriod(workspace.transactions);
  const summary = summarize(workspace.transactions);
  const contextText = buildContextText(
    {
      profile: workspace.profile,
      summary,
      monthly,
      categories: workspace.categories,
      topCategories: expenseByCategory(workspace.transactions, workspace.categories),
      budgets: workspace.budgets,
      goals: workspace.goals,
      contributions: workspace.contributions,
      businesses: workspace.businesses,
      campaigns: workspace.campaigns,
      businessExpenses: workspace.businessExpenses,
      accounts: workspace.accounts,
      transactions: workspace.transactions,
    },
    period,
  );

  const prompt = [
    'DATA KEUANGAN (data aktual, angka wajib akurat):',
    contextText,
    '',
    `TUGASAN: susun laporan keuangan bulan ${formatMonth(period)}.`,
    'Struktur markdown:',
    '1. Ringkasan bulan (3-4 kalimat)',
    '2. Arus kas & pos pengeluaran terbesar',
    '3. Performa bisnis & iklan (jika ada data)',
    '4. Risiko/peringatan (jika ada)',
    '5. Rekomendasi 3 prioritas untuk bulan depan',
  ].join('\n');

  const summaryMd = await complete(prompt, {
    system: REPORT_SYSTEM_PROMPT,
    temperature: 0.3,
    maxOutputTokens: 2000,
  });

  const insights = [
    {
      title: `Liquid ${Math.round(liquidBalance(workspace.accounts, workspace.transactions))}`,
      detail: `Burn rate 3 bulan: ${Math.round(burnRate(monthly, 3))}`,
      severity: 'info',
    },
    {
      title: `Rata-rata pemasukan 3 bulan: ${Math.round(averageIncome(monthly, 3))}`,
      detail: `Savings rate semua periode: ${(summary.savingsRate * 100).toFixed(1)}%`,
      severity: 'info',
    },
  ];

  const { data, error } = await session.supabase
    .from('reports')
    .upsert(
      {
        user_id: session.userId,
        period,
        summary_md: summaryMd,
        insights,
      },
      { onConflict: 'user_id,period' },
    )
    .select()
    .single();

  if (error) return serverError(error);
  return NextResponse.json({ report: data });
}
