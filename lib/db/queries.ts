import { createClient } from '@/lib/supabase/server';
import type {
  Account,
  AiConversation,
  AiMessage,
  Budget,
  Business,
  BusinessExpense,
  Campaign,
  Category,
  Goal,
  GoalContribution,
  ImportBatch,
  ImportMapping,
  Profile,
  Report,
  Transaction,
} from '@/lib/db/types';

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Semua query di aplikasi ini single-user: rely pada RLS `auth.uid() = user_id`.
 * Casting ke interface lokal dipakai karena tipe tabel belum di-generate dari Supabase.
 */
export async function requireUser(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('UNAUTHENTICATED');
  return data.user.id;
}

export async function fetchProfile(supabase: Db): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function ensureProfile(supabase: Db, userId: string, email?: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (data) return;
  await supabase.from('profiles').insert({ user_id: userId, full_name: email ?? null });
}

export async function fetchAccounts(supabase: Db): Promise<Account[]> {
  const { data } = await supabase.from('accounts').select('*').order('created_at');
  return (data as Account[]) ?? [];
}

export async function fetchCategories(supabase: Db): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('name');
  return (data as Category[]) ?? [];
}

export async function fetchTransactions(
  supabase: Db,
  options: { from?: string; to?: string; accountId?: string; categoryId?: string } = {},
): Promise<Transaction[]> {
  let query = supabase.from('transactions').select('*').order('occurred_on', { ascending: false });
  if (options.from) query = query.gte('occurred_on', options.from);
  if (options.to) query = query.lte('occurred_on', options.to);
  if (options.accountId) query = query.eq('account_id', options.accountId);
  if (options.categoryId) query = query.eq('category_id', options.categoryId);
  const { data } = await query;
  return (data as Transaction[]) ?? [];
}

export async function fetchBudgets(supabase: Db): Promise<Budget[]> {
  const { data } = await supabase.from('budgets').select('*');
  return (data as Budget[]) ?? [];
}

export async function fetchGoals(supabase: Db): Promise<Goal[]> {
  const { data } = await supabase.from('goals').select('*').order('priority');
  return (data as Goal[]) ?? [];
}

export async function fetchGoalContributions(supabase: Db): Promise<GoalContribution[]> {
  const { data } = await supabase.from('goal_contributions').select('*');
  return (data as GoalContribution[]) ?? [];
}

export async function fetchBusinesses(supabase: Db): Promise<Business[]> {
  const { data } = await supabase.from('businesses').select('*').order('created_at');
  return (data as Business[]) ?? [];
}

export async function fetchCampaigns(supabase: Db): Promise<Campaign[]> {
  const { data } = await supabase.from('campaigns').select('*').order('period_start', { ascending: false });
  return (data as Campaign[]) ?? [];
}

export async function fetchBusinessExpenses(supabase: Db): Promise<BusinessExpense[]> {
  const { data } = await supabase.from('business_expenses').select('*').order('occurred_on', { ascending: false });
  return (data as BusinessExpense[]) ?? [];
}

export async function fetchImportBatches(supabase: Db): Promise<ImportBatch[]> {
  const { data } = await supabase
    .from('import_batches')
    .select('*')
    .order('imported_at', { ascending: false })
    .limit(50);
  return (data as ImportBatch[]) ?? [];
}

export async function fetchImportMappings(supabase: Db): Promise<ImportMapping[]> {
  const { data } = await supabase.from('import_mappings').select('*');
  return (data as ImportMapping[]) ?? [];
}

export async function fetchConversations(supabase: Db): Promise<AiConversation[]> {
  const { data } = await supabase
    .from('ai_conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as AiConversation[]) ?? [];
}

export async function fetchMessages(supabase: Db, conversationId: string): Promise<AiMessage[]> {
  const { data } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at');
  return (data as AiMessage[]) ?? [];
}

export async function fetchReports(supabase: Db): Promise<Report[]> {
  const { data } = await supabase.from('reports').select('*').order('period', { ascending: false });
  return (data as Report[]) ?? [];
}
