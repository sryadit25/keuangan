# KEUANGAN - Peta Keuangan

`agents.md` adalah sumber utama instruksi bagi agen yang bekerja di repositori ini. Mulai dari sini, lalu baca hanya area yang relevan dengan tugas.

## Proyek

Keuangan adalah saya ingin membangun sistem keuangan yang di rancang untuk saya sendiri, yang memiliki dashboard. dan goal saya adalah ada analisis AI nya. apa yang harus saya lakukan ke depannya jika uang saya segini, dan bagaimana cara saya melipat gandakan uang saya melalui bisnis" yang akan saya bangun, dan pekerjaan saya.

## Urutan Kerja

1. Periksa status working tree sebelum mengubah apa pun dan pertahankan perubahan yang tidak terkait.
2. Gunakan peta di bawah untuk menemukan area paling kecil yang relevan.
3. Baca kode di sekitar area tersebut serta utilitas bersama yang terkait sebelum mengubah perilaku.
4. Validasi rute atau alur kerja yang terdampak sesuai cakupan perubahan.
5. Pastikan semua code ter clone dulu dari github, karna ini kita user's 2 jadi pasti azis juga nge push, supaya tidak tertimpa code sebelumnya. jadi kita meneruskan dan memperbaiki code nya saja

## Peta Area

| Tugas | Mulai dari sini | Periksa bila diperlukan |
| --- | --- | --- |
| New Session mulai di sini | `agents.md` | --- |
| Skema database / RLS | `supabase/migrations/0001_init.sql` | `lib/db/queries.ts` |
| Model data TypeScript | `lib/db/types.ts` | `supabase/migrations/0001_init.sql` |
| Query & data access | `lib/db/queries.ts` | `lib/db/types.ts` |
| Autentikasi & sesi | `middleware.ts`, `lib/supabase/server.ts` | `app/(auth)/login/page.tsx` |
| Layout & navigasi app | `app/(app)/layout.tsx`, `components/nav.tsx` | `app/globals.css` |
| Dashboard & ringkasan angka | `app/(app)/dashboard/page.tsx`, `lib/calc/summary.ts` | `app/api/summary/route.ts` |
| Transaksi (CRUD, filter) | `app/(app)/transaksi/page.tsx`, `app/api/transactions/route.ts` | `lib/calc/summary.ts` |
| Rekening & e-wallet | `app/(app)/akun/page.tsx`, `app/api/accounts/route.ts` | `lib/db/queries.ts` |
| Anggaran bulanan | `app/(app)/anggaran/page.tsx` | `lib/calc/budget.ts` |
| Target / goals | `app/(app)/target/page.tsx`, `lib/calc/goals.ts` | `app/api/goals/route.ts` |
| P&L bisnis & iklan | `app/(app)/bisnis/page.tsx`, `lib/calc/business.ts` | `app/api/businesses/route.ts`, `app/api/campaigns/route.ts` |
| Import CSV mutasi | `lib/csv/detect.ts`, `lib/csv/parsers.ts` | `app/(app)/import/page.tsx` |
| AI advisor (chat) | `lib/ai/provider.ts`, `app/api/ai/chat/route.ts` | `lib/ai/prompts.ts` |
| Laporan bulanan AI | `app/api/ai/report/route.ts` | `lib/ai/prompts.ts` |
| Format angka Rupiah | `lib/format.ts` | `lib/calc/summary.ts` |

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan lokal |
| `npm run build` | Build produksi (dipakai Vercel) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm test` | Unit test (vitest) kalkulasi & parser CSV |
| `supabase db push` | Terapkan migrasi ke Supabase Cloud |

## Konvensi

- Mata uang IDR, format `Rp1.234.567` (`lib/format.ts`).
- `transactions.amount` bertanda: positif = uang masuk, negatif = uang keluar. Transfer antar akun dicatat sebagai dua baris (bukan income/expense).
- Dua ledger terpisah: transaksi pribadi (`transactions`) dan bisnis (`business_expenses` + `campaigns`). Jangan menggabungkannya agar P&L bisnis tidak bercampur dengan cashflow pribadi.
- Semua query wajib menyaring `user_id = auth.uid()`; RLS aktif di setiap tabel.
- Data keuangan bersifat sensitif: jangan pernah di-log ke server/console.
- AI bersifat read-only terhadap data keuangan; provider dipilih lewat env `AI_PROVIDER`.

## Batasan

- Single-user (login email + password). `azis` adalah collaborator di GitHub, bukan user aplikasi.
- Import CSV multi-akun: mutasi bank/e-wallet ke `transactions`; laporan iklan (Meta/TikTok Shop) ke `campaigns`.
- Provider AI belum ditentukan user, jadi `lib/ai/provider.ts` harus tetap provider-agnostic (gemini / openai-compatible / anthropic).

## Referensi

- Supabase SSR: `https://supabase.com/docs/guides/auth/server-side`
- Next.js App Router: `node_modules/next/dist/docs/`
- Repo referensi stack: `https://github.com/sryadit25/ai_affiliate` (LUMA)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
