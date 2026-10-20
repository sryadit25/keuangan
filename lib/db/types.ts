export type AccountType = 'bank' | 'ewallet' | 'cash' | 'savings' | 'credit';
export type CategoryKind = 'income' | 'expense';
export type Scope = 'personal' | 'business';
export type TransactionKind = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'manual' | 'csv';
export type GoalType = 'dana_darurat' | 'modal_bisnis' | 'investasi' | 'lainnya';
export type GoalStatus = 'active' | 'reached' | 'paused';
export type BusinessKind = 'own_brand' | 'client_service';
export type BusinessStatus = 'active' | 'paused' | 'archived';
export type AdsPlatform = 'shopee' | 'tiktok' | 'meta' | 'tiktok_shop' | 'google' | 'lainnya';
export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export interface Profile {
  user_id: string;
  full_name: string | null;
  monthly_savings_target: number;
  ai_provider: AiProvider;
  ai_model: string | null;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  opening_balance: number;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  kind: CategoryKind;
  scope: Scope;
  parent_id: string | null;
  icon: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  occurred_on: string;
  amount: number;
  kind: TransactionKind;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  description: string | null;
  merchant: string | null;
  notes: string | null;
  source: TransactionSource;
  import_batch_id: string | null;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  period: string;
  category_id: string;
  limit_amount: number;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  type: GoalType;
  target_amount: number;
  target_date: string | null;
  priority: number;
  status: GoalStatus;
  notes: string | null;
}

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  occurred_on: string;
  note: string | null;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  kind: BusinessKind;
  status: BusinessStatus;
  notes: string | null;
}

export interface Campaign {
  id: string;
  user_id: string;
  business_id: string;
  platform: AdsPlatform;
  period_start: string;
  period_end: string;
  spend: number;
  revenue: number;
  orders: number | null;
  ctr: number | null;
  cvr: number | null;
  notes: string | null;
}

export interface BusinessExpense {
  id: string;
  user_id: string;
  business_id: string;
  occurred_on: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  source: TransactionSource;
}

export interface ImportBatch {
  id: string;
  user_id: string;
  account_id: string | null;
  file_name: string;
  row_count: number;
  status: string;
  content_hash: string;
  imported_at: string;
}

export interface ImportMapping {
  id: string;
  user_id: string;
  institution: string;
  mapping: Record<string, string>;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
}

export interface AiMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  period: string;
  summary_md: string;
  insights: ReportInsight[];
  created_at: string;
}

export interface ReportInsight {
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  action?: string;
}
