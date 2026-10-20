import { createClient } from '@supabase/supabase-js';

/**
 * Membuat kategori & rekening default untuk user yang sudah login.
 * Jalankan: npx tsx scripts/seed.ts <email-user>
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const targetEmail = process.argv[2];

if (!url || !key || !targetEmail) {
  console.error('Pemakaian: npx tsx scripts/seed.ts <email-user>');
  console.error('Butuh NEXT_PUBLIC_SUPABASE_URL dan (opsional) SUPABASE_SERVICE_ROLE_KEY di .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EXPENSE_CATEGORIES = [
  'Makan & Minum', 'Transportasi', 'Tagihan & Utilitas', 'Sewa & Hunian', 'Belanja',
  'Kesehatan', 'Pendidikan', 'Hiburan', 'Donasi', 'Keluarga', 'Operasional', 'Iklan & Ads',
];

const INCOME_CATEGORIES = ['Gaji', 'Freelance', 'Dividen & Bunga', 'Penjualan Produk', 'Lainnya'];

async function main() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = list.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail.toLowerCase());
  if (!user) throw new Error(`User dengan email ${targetEmail} tidak ditemukan.`);

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, full_name: user.email }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  const rows = [
    ...EXPENSE_CATEGORIES.map((name) => ({ user_id: user.id, name, kind: 'expense', scope: 'personal' })),
    ...INCOME_CATEGORIES.map((name) => ({ user_id: user.id, name, kind: 'income', scope: 'personal' })),
    { user_id: user.id, name: 'Operasional', kind: 'expense', scope: 'business' },
    { user_id: user.id, name: 'COGS', kind: 'expense', scope: 'business' },
  ];

  const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'user_id,name,scope' });
  if (error) throw error;

  console.log(`Seed selesai untuk ${user.email}: ${rows.length} kategori.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
