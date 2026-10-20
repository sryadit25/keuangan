'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Account, AdsPlatform, Category, GoalType, BusinessKind } from '@/lib/db/types';

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'Gagal menyimpan');
  return payload;
}

function useSubmit(url: string, onDone?: () => void) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      await post(url, Object.fromEntries(form.entries()));
      event.currentTarget.reset();
      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  }

  return { submit, error, loading };
}

export function TransactionForm({
  accounts,
  categories,
}: {
  accounts: Account[];
  categories: Category[];
}) {
  const { submit, error, loading } = useSubmit('/api/transactions');
  const incomeCategories = categories.filter((c) => c.kind === 'income');
  const expenseCategories = categories.filter((c) => c.kind === 'expense');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah transaksi</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="tx-date">
            Tanggal
          </label>
          <input id="tx-date" type="date" name="occurred_on" required className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="tx-kind">
            Jenis
          </label>
          <select id="tx-kind" name="kind" className="input-base" defaultValue="expense">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="tx-amount">
            Nominal (Rp)
          </label>
          <input
            id="tx-amount"
            type="number"
            name="amount"
            step="1"
            required
            className="input-base"
            placeholder="50000"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="tx-account">
            Rekening
          </label>
          <select id="tx-account" name="account_id" className="input-base" required>
            <option value="">Pilih rekening</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="label-muted" htmlFor="tx-category">
            Kategori
          </label>
          <select id="tx-category" name="category_id" className="input-base">
            <option value="">Tanpa kategori</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            {incomeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="label-muted" htmlFor="tx-description">
            Keterangan
          </label>
          <input id="tx-description" name="description" className="input-base" placeholder="Belanja bulanan" />
        </div>
      </div>

      {error ? <p className="text-sm text-negative">{error}</p> : null}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan transaksi'}
      </button>
      <p className="text-xs text-muted">
        Nominal diisi positif; jenis menentukan arah arus kas (pengeluaran reducing saldo).
      </p>
    </form>
  );
}

export function AccountForm() {
  const { submit, error, loading } = useSubmit('/api/accounts');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah rekening</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="acc-name">
            Nama
          </label>
          <input id="acc-name" name="name" required className="input-base" placeholder="BCA Tahapan" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="acc-type">
            Jenis
          </label>
          <select id="acc-type" name="type" className="input-base" defaultValue="bank">
            <option value="bank">Bank</option>
            <option value="ewallet">E-wallet</option>
            <option value="savings">Tabungan</option>
            <option value="cash">Tunai</option>
            <option value="credit">Kartu kredit</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="acc-institution">
           _INSTansi
          </label>
          <input id="acc-institution" name="institution" className="input-base" placeholder="BCA" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="acc-balance">
            Saldo awal (Rp)
          </label>
          <input id="acc-balance" type="number" name="opening_balance" step="1" defaultValue="0" className="input-base" />
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan rekening'}
      </button>
    </form>
  );
}

export function CategoryForm() {
  const { submit, error, loading } = useSubmit('/api/categories');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah kategori</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="cat-name">
            Nama
          </label>
          <input id="cat-name" name="name" required className="input-base" placeholder="Makan" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="cat-kind">
            Jenis
          </label>
          <select id="cat-kind" name="kind" className="input-base" defaultValue="expense">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="cat-scope">
            Cakupan
          </label>
          <select id="cat-scope" name="scope" className="input-base" defaultValue="personal">
            <option value="personal">Pribadi</option>
            <option value="business">Bisnis</option>
          </select>
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan kategori'}
      </button>
    </form>
  );
}

export function BudgetForm({
  categories,
  period,
}: {
  categories: Category[];
  period: string;
}) {
  const { submit, error, loading } = useSubmit('/api/budgets');
  const expenseCategories = categories.filter((c) => c.kind === 'expense' && c.scope === 'personal');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Set anggaran</h2>
      <input type="hidden" name="period" value={period} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="budget-category">
            Kategori
          </label>
          <select id="budget-category" name="category_id" required className="input-base">
            <option value="">Pilih kategori</option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="budget-limit">
            Limit (Rp)
          </label>
          <input id="budget-limit" type="number" name="limit_amount" step="1" required className="input-base" />
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan anggaran'}
      </button>
    </form>
  );
}

export function GoalForm() {
  const { submit, error, loading } = useSubmit('/api/goals');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah target</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="goal-name">
            Nama target
          </label>
          <input id="goal-name" name="name" required className="input-base" placeholder="Dana darurat 6 bulan" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="goal-type">
            Jenis
          </label>
          <select id="goal-type" name="type" className="input-base" defaultValue="dana_darurat">
            <option value="dana_darurat">Dana darurat</option>
            <option value="modal_bisnis">Modal bisnis</option>
            <option value="investasi">Investasi</option>
            <option value="lainnya">Lainnya</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="goal-amount">
            Target (Rp)
          </label>
          <input id="goal-amount" type="number" name="target_amount" step="1" required className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="goal-date">
            Target date
          </label>
          <input id="goal-date" type="month" name="target_date" className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="goal-priority">
            Prioritas (1 = tertinggi)
          </label>
          <input id="goal-priority" type="number" name="priority" min="1" max="5" defaultValue="3" className="input-base" />
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan target'}
      </button>
    </form>
  );
}

export function GoalContributionForm({ goalId }: { goalId: string }) {
  const { submit, error, loading } = useSubmit(`/api/goals/${goalId}/contributions`);

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label className="label-muted" htmlFor={`contrib-amount-${goalId}`}>
          Setoran (Rp)
        </label>
        <input
          id={`contrib-amount-${goalId}`}
          type="number"
          name="amount"
          step="1"
          required
          className="input-base w-40"
        />
      </div>
      <div className="space-y-1.5">
        <label className="label-muted" htmlFor={`contrib-date-${goalId}`}>
          Tanggal
        </label>
        <input id={`contrib-date-${goalId}`} type="date" name="occurred_on" required className="input-base" />
      </div>
      <button type="submit" className="btn-ghost" disabled={loading}>
        {loading ? '…' : 'Setor'}
      </button>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </form>
  );
}

export function BusinessForm() {
  const { submit, error, loading } = useSubmit('/api/businesses');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah brand / bisnis</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="biz-name">
            Nama
          </label>
          <input id="biz-name" name="name" required className="input-base" placeholder="Space Parfume" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="biz-kind">
            Jenis
          </label>
          <select id="biz-kind" name="kind" className="input-base" defaultValue="own_brand">
            <option value="own_brand">Brand sendiri</option>
            <option value="client_service">Servis klien</option>
          </select>
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan brand'}
      </button>
    </form>
  );
}

export function CampaignForm({ businesses }: { businesses: { id: string; name: string }[] }) {
  const { submit, error, loading } = useSubmit('/api/campaigns');

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-medium">Tambah kampanye iklan</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-business">
            Brand
          </label>
          <select id="camp-business" name="business_id" required className="input-base">
            <option value="">Pilih brand</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-platform">
            Platform
          </label>
          <select id="camp-platform" name="platform" className="input-base" defaultValue="shopee">
            {(
              ['shopee', 'tiktok', 'meta', 'tiktok_shop', 'google', 'lainnya'] as AdsPlatform[]
            ).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-start">
            Periode mulai
          </label>
          <input id="camp-start" type="date" name="period_start" required className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-end">
            Periode selesai
          </label>
          <input id="camp-end" type="date" name="period_end" required className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-spend">
            Ad spend (Rp)
          </label>
          <input id="camp-spend" type="number" name="spend" step="1" defaultValue="0" className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-revenue">
            Revenue (Rp)
          </label>
          <input id="camp-revenue" type="number" name="revenue" step="1" defaultValue="0" className="input-base" />
        </div>
        <div className="space-y-1.5">
          <label className="label-muted" htmlFor="camp-orders">
            Orders
          </label>
          <input id="camp-orders" type="number" name="orders" step="1" className="input-base" />
        </div>
      </div>
      {error ? <p className="text-sm text-negative">{error}</p> : null}
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Menyimpan…' : 'Simpan kampanye'}
      </button>
    </form>
  );
}

export function DeleteButton({ url, label = 'Hapus' }: { url: string; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Yakin dihapus?')) return;
    setLoading(true);
    await fetch(url, { method: 'DELETE' });
    setLoading(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleDelete} disabled={loading} className="text-xs text-negative hover:underline">
      {loading ? '…' : label}
    </button>
  );
}

export const goalTypes: GoalType[] = ['dana_darurat', 'modal_bisnis', 'investasi', 'lainnya'];
export const businessKinds: BusinessKind[] = ['own_brand', 'client_service'];
