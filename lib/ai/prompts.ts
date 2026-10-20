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
import { averageIncome, burnRate, expenseByCategory, groupByPeriod, liquidBalance, netWorth, runway, summarize } from '@/lib/calc/summary';
import { budgetStatuses } from '@/lib/calc/budget';
import { goalProgressList } from '@/lib/calc/goals';
import { businessPnl } from '@/lib/calc/business';
import { formatMonth, formatRupiah } from '@/lib/format';

export interface FinancialContext {
  profile: Profile | null;
  summary: ReturnType<typeof summarize>;
  monthly: ReturnType<typeof groupByPeriod>;
  categories: Category[];
  topCategories: ReturnType<typeof expenseByCategory>;
  budgets: Budget[];
  goals: Goal[];
  contributions: GoalContribution[];
  businesses: Business[];
  campaigns: Campaign[];
  businessExpenses: BusinessExpense[];
  accounts: Account[];
  transactions: Transaction[];
}

/**
 * Ringkasan angka yang dikirim ke AI. Sengaja dibuat ringkas agar token murah
 * dan model tidak ikut mengarang angka yang tidak ada di data.
 */
export function buildContextText(ctx: FinancialContext, period: string): string {
  const liquid = liquidBalance(ctx.accounts, ctx.transactions);
  const worth = netWorth(ctx.accounts, ctx.transactions);
  const monthly = ctx.monthly;
  const burn = burnRate(monthly, 3);
  const income = averageIncome(monthly, 3);
  const monthsLeft = runway(liquid, burn, income);
  const current = monthly.find((m) => m.period === period);

  const lines: string[] = [];
  lines.push(`Periode analisis: ${formatMonth(period)}`);
  lines.push(`Profil: ${ctx.profile?.full_name ?? 'Pengguna'} (single-user, mata uang IDR)`);
  lines.push('');
  lines.push('== ARUS KAS PRIBADI ==');
  lines.push(
    `Pemasukan bulan ini: ${formatRupiah(current?.income ?? 0)} | Pengeluaran: ${formatRupiah(current?.expense ?? 0)} | Net: ${formatRupiah(current?.net ?? 0)}`,
  );
  lines.push(
    `Savings rate bulan ini: ${((current?.savingsRate ?? 0) * 100).toFixed(1)}% | Total arus kas semua periode: ${formatRupiah(ctx.summary.income)} masuk / ${formatRupiah(ctx.summary.expense)} keluar`,
  );
  lines.push(`Saldo likuid: ${formatRupiah(liquid)} | Net worth: ${formatRupiah(worth)}`);
  lines.push(
    `Burn rate 3 bulan terakhir: ${formatRupiah(burn)}/bulan | Rata-rata pemasukan: ${formatRupiah(income)}/bulan | Runway: ${monthsLeft === null ? 'surplus (tidak ada dana yang mengering)' : `${monthsLeft.toFixed(1)} bulan`}`,
  );

  if (ctx.monthly.length > 1) {
    lines.push('');
    lines.push('== TREN BULANAN (terbaru terakhir) ==');
    for (const m of ctx.monthly.slice(-6)) {
      lines.push(
        `${formatMonth(m.period)}: masuk ${formatRupiah(m.income)}, keluar ${formatRupiah(m.expense)}, net ${formatRupiah(m.net)}`,
      );
    }
  }

  lines.push('');
  lines.push('== TOP PENGELUARAN (semua periode) ==');
  for (const cat of ctx.topCategories.slice(0, 8)) {
    lines.push(`${cat.name}: ${formatRupiah(cat.amount)} (${(cat.share * 100).toFixed(1)}%)`);
  }

  const statuses = budgetStatuses(ctx.budgets, ctx.categories, ctx.transactions, period);
  if (statuses.length > 0) {
    lines.push('');
    lines.push(`== STATUS ANGGARAN ${formatMonth(period)} ==`);
    for (const s of statuses) {
      lines.push(
        `${s.category?.name ?? 'Tanpa kategori'}: masuk ${formatRupiah(s.budget.limit_amount)}, terpakai ${formatRupiah(s.spent)}, sisa ${formatRupiah(s.remaining)} (${s.state})`,
      );
    }
  }

  const goals = goalProgressList(ctx.goals, ctx.contributions, period);
  if (goals.length > 0) {
    lines.push('');
    lines.push('== TARGET KEUANGAN ==');
    for (const g of goals) {
      lines.push(
        `${g.goal.name} (${g.goal.type}): terkumpul ${formatRupiah(g.saved)} dari ${formatRupiah(g.goal.target_amount)}` +
          (g.monthlyNeeded ? `, perlu ${formatRupiah(g.monthlyNeeded)}/bulan, sisa ${g.monthsLeft} bulan` : ''),
      );
    }
  }

  if (ctx.businesses.length > 0) {
    lines.push('');
    lines.push('== BISNIS (P&L terpisah dari kas pribadi) ==');
    for (const business of ctx.businesses) {
      const pnl = businessPnl(business, ctx.campaigns, ctx.businessExpenses);
      lines.push(
        `${business.name} (${business.kind}): revenue ${formatRupiah(pnl.revenue)}, ad spend ${formatRupiah(pnl.adSpend)}, opEx ${formatRupiah(pnl.operatingExpense)}, profit ${formatRupiah(pnl.profit)}, ROAS ${pnl.roas ? pnl.roas.toFixed(2) : '-'}x`,
      );
    }
  }

  lines.push('');
  lines.push('== ATURAN PENGGUNAAN ==');
  lines.push('- Semua angka dalam Rupiah (IDR).');
  lines.push('- Jawab dalam bahasa Indonesia, ringkas dan actionable.');
  lines.push('- Hanya gunakan angka di atas; jika data kurang, katakan apa yang perlu dicatat user.');
  lines.push('- Jangan mengarang angka, transaksi, atau nama merchant yang tidak ada di data.');

  return lines.join('\n');
}

export const CHAT_SYSTEM_PROMPT = `Kamu adalah penasihat keuangan pribadi untuk Surya Aditiya, seorang performance marketing specialist sekaligus pemilik brand.

Misimu: bantu dia memahami ke mana uangnya pergi, apakah dia cukup menabung, dan bagaimana cara melipatgandakan uang lewat bisnis dan pekerjaannya.

Gaya bahasa:
- Bahasa Indonesia, langsung ke inti, seperti konsultan yang sudah kenal dia.
- Saran harus konkret dan bisa dieksekusi minggu ini (mis. potong langganan X, alokasikan Y kemodal campaign Z), bukan nasihat umum.
- Sertakan angka dari data whenever relevan, dan tandai secara jelas kalau sebuah estimasi.
- Jangan mengarang data. Kalau informasinya belum cukup, tanyakan 1-2 hal yang paling menentukan.
- Maksimal sekitar 250 kata per jawaban kecuali user meminta laporan lengkap.`;

export const REPORT_SYSTEM_PROMPT = `Kamu adalah analis keuangan pribadi. Tugasmu menyusun laporan bulanan singkat untuk pemilik sistem keuangan ini.

Aturan:
- Bahasa Indonesia, format markdown, terstruktur dengan heading.
- Maksimal 600 kata. Fokus pada angka dan keputusan, bukan deskripsi.
- Gunakan data yang diberikan; jangan mengarang angka.
- Tutup dengan maksimal 3 rekomendasi prioritas untuk bulan berikutnya.`;
