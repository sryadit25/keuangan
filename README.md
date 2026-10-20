# Keuangan — Peta Keuangan

Sistem keuangan pribadi + P&L bisnis, dengan dashboard dan AI advisor.
Dibangun untuk satu pemilik: **Surya Aditiya** (performance marketing specialist & brand owner).

Tujuannya sederhana: tahu ke mana uang pergi, apakah cukup menabung, dan bagaimana cara
melipatgandakan uang lewat bisnis dan pekerjaan.

## Fitur

- **Dashboard** — saldo likuid, net worth, arus kas bulanan, savings rate, burn rate, runway,
  komposisi pengeluaran, status anggaran, progress target, dan P&L bisnis.
- **Transaksi** — CRUD cepat, filter per periode, import CSV mutasi rekening/e-wallet.
- **Rekening & kategori** — saldo dihitung otomatis dari saldo awal + transaksi.
- **Anggaran** — limit per kategori per bulan dengan status under/near/over.
- **Target** — dana darurat, modal bisnis, investasi; menghitung setoran per bulan yang diperlukan.
- **Bisnis** — P&L terpisah per brand (revenue, ad spend, opEx, profit, margin, ROAS) dan performa per platform.
- **Import CSV** — BCA, Mandiri, BNI, BRI, Permata, Danamon, CIMB, Bank Syariah, GoPay, OVO, DANA,
  ShopeePay, Tokopedia, plus laporan iklan Meta/Google/TikTok/Shopee Ads. File lain diparse otomatis.
- **AI Advisor** — chat yang membaca data keuanganmu (read-only) + laporan bulanan otomatis.

## Prinsip data

Ada **dua ledger terpisah**:

| Ledger | Tabel | Isi |
| --- | --- | --- |
| Pribadi | `transactions` | kas harian: pemasukan & pengeluaran |
| Bisnis | `campaigns`, `business_expenses` | performa iklan & biaya operasional brand |

Keduanya tidak digabung agar profit brand tidak tercampur dengan kas pribadi. Halaman dashboard
menampilkan keduanya secara terpisah.

`transactions.amount` bertanda: **positif = uang masuk, negatif = uang keluar**. Transfer antar akun
dicatat sebagai dua baris dan diabaikan saat menghitung arus kas.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Supabase (Postgres + RLS) ·
AI SDK 7 (provider-agnostic) · Recharts · Vitest · Vercel

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Buat skema tabel di Supabase:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Buat user di Supabase Dashboard → Authentication → Users, lalu isi kategori & rekening awal:

```bash
npm run seed -- <email-user>
```

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm test` | Unit test (kalkulasi & parser CSV) |

## AI Advisor

Provider dipilih lewat environment variable, jadi bisa diganti tanpa mengubah kode:

```env
AI_PROVIDER=gemini   # gemini | openai | anthropic
AI_API_KEY=...
AI_MODEL=...         # opsional
AI_BASE_URL=...      # opsional, mis. DashScope/Qwen (OpenAI-compatible)
```

AI bersifat **read-only**: model hanya membaca ringkasan angka, tidak pernah menulis transaksi.

## Struktur

Peta lengkap ada di [`AGENTS.md`](./AGENTS.md) — mulai dari sana saat mengerjakan task baru.
