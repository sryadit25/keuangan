import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, requireSession, serverError, unauthorized } from '@/lib/api-helpers';
import { loadWorkspace } from '@/lib/data';
import { complete, resolveAiConfig } from '@/lib/ai/provider';
import { buildContextText, CHAT_SYSTEM_PROMPT } from '@/lib/ai/prompts';
import { currentPeriod } from '@/lib/format';

const chatSchema = z.object({
  message: z.string().min(1, 'Pesan tidak boleh kosong'),
  conversation_id: z.string().nullish(),
  period: z.string().nullish(),
});

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const parsed = chatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Data tidak valid');

  if (!resolveAiConfig()) {
    return badRequest(
      'AI belum dikonfigurasi. Isi AI_PROVIDER dan AI_API_KEY di .env.local, lalu restart server.',
    );
  }

  const { message, conversation_id, period } = parsed.data;
  const workspace = await loadWorkspace();
  const contextText = buildContextText(
    {
      profile: workspace.profile,
      summary: { income: 0, expense: 0, net: 0, savingsRate: 0, transactionCount: 0 },
      monthly: [],
      categories: workspace.categories,
      topCategories: [],
      budgets: workspace.budgets,
      goals: workspace.goals,
      contributions: workspace.contributions,
      businesses: workspace.businesses,
      campaigns: workspace.campaigns,
      businessExpenses: workspace.businessExpenses,
      accounts: workspace.accounts,
      transactions: workspace.transactions,
    },
    period ?? currentPeriod(),
  );

  let conversationId = conversation_id ?? null;
  if (!conversationId) {
    const { data, error } = await session.supabase
      .from('ai_conversations')
      .insert({ user_id: session.userId, title: message.slice(0, 60) })
      .select()
      .single();
    if (error) return serverError(error);
    conversationId = data.id;
  }

  const { data: history } = await session.supabase
    .from('ai_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at');

  const conversation = (history ?? [])
    .map((item: { role: string; content: string }) => `${item.role === 'user' ? 'User' : 'Advisor'}: ${item.content}`)
    .join('\n');

  const prompt = [
    'DATA KEUANGAN USER (data aktual, angka wajib akurat):',
    contextText,
    '',
    'RIWAYAT PERCAKAPAN:',
    conversation || '(percakapan baru)',
    '',
    `PERTANYAAN USER: ${message}`,
  ].join('\n');

  const answer = await complete(prompt, {
    system: CHAT_SYSTEM_PROMPT,
    temperature: 0.4,
    maxOutputTokens: 1200,
  });

  await session.supabase.from('ai_messages').insert([
    { user_id: session.userId, conversation_id: conversationId, role: 'user', content: message },
    { user_id: session.userId, conversation_id: conversationId, role: 'assistant', content: answer },
  ]);

  return NextResponse.json({ conversation_id: conversationId, answer });
}
