import { createClient } from '@/lib/supabase/server';
import {
  fetchAccounts,
  fetchBusinesses,
  fetchBudgets,
  fetchBusinessExpenses,
  fetchCampaigns,
  fetchCategories,
  fetchGoalContributions,
  fetchGoals,
  fetchProfile,
  fetchTransactions,
} from '@/lib/db/queries';
import type {
  Account,
  Business,
  BusinessExpense,
  Budget,
  Campaign,
  Category,
  Goal,
  GoalContribution,
  Profile,
  Transaction,
} from '@/lib/db/types';

export interface Workspace {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  profile: Profile | null;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  contributions: GoalContribution[];
  businesses: Business[];
  campaigns: Campaign[];
  businessExpenses: BusinessExpense[];
}

export async function loadWorkspace(): Promise<Workspace> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('UNAUTHENTICATED');

  const [profile, accounts, categories, transactions, budgets, goals, contributions, businesses, campaigns, businessExpenses] =
    await Promise.all([
      fetchProfile(supabase),
      fetchAccounts(supabase),
      fetchCategories(supabase),
      fetchTransactions(supabase),
      fetchBudgets(supabase),
      fetchGoals(supabase),
      fetchGoalContributions(supabase),
      fetchBusinesses(supabase),
      fetchCampaigns(supabase),
      fetchBusinessExpenses(supabase),
    ]);

  return {
    supabase,
    userId: user.id,
    profile,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    contributions,
    businesses,
    campaigns,
    businessExpenses,
  };
}
