import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api-client';
import { flattenCategories, useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from '../../hooks/useTransactions';
import { TX_TYPE_LABEL, UI } from '../../lib/labels';
import type {
  Transaction,
  TransactionInput,
  TransactionType,
} from '../../types/transactions';

export type TransactionFormDraft = {
  type: TransactionType;
  accountId?: string;
  transferToAccountId?: string;
  hint?: string | null;
};

type Props = {
  editing: Transaction | null;
  draft?: TransactionFormDraft | null;
  compact?: boolean;
  onDone: () => void;
  onCancelEdit: () => void;
};

const emptyForm = {
  type: 'expense' as TransactionType,
  accountId: '',
  categoryId: '',
  transferToAccountId: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  description: '',
};

export function TransactionForm({
  editing,
  draft,
  compact = false,
  onDone,
  onCancelEdit,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const { data: accountsData } = useAccounts(1, 100);
  const categoryType =
    form.type === 'transfer' ? undefined : (form.type as 'income' | 'expense');
  const { data: categoriesData } = useCategories(
    form.type === 'transfer' ? undefined : categoryType,
  );

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  useEffect(() => {
    if (editing) {
      setForm({
        type: editing.type,
        accountId: String(editing.accountId),
        categoryId:
          editing.categoryId != null ? String(editing.categoryId) : '',
        transferToAccountId:
          editing.transferToAccountId != null
            ? String(editing.transferToAccountId)
            : '',
        amount: String(Number(editing.amount)),
        transactionDate: editing.transactionDate.slice(0, 10),
        description: editing.description ?? '',
      });
      setFormError(null);
      setHint(null);
      return;
    }
    if (draft) {
      setForm({
        ...emptyForm,
        type: draft.type,
        accountId: draft.accountId ?? '',
        transferToAccountId: draft.transferToAccountId ?? '',
        transactionDate: new Date().toISOString().slice(0, 10),
      });
      setHint(draft.hint ?? null);
      setFormError(null);
      return;
    }
    setForm(emptyForm);
    setFormError(null);
    setHint(null);
  }, [editing, draft]);

  const categoryOptions = useMemo(() => {
    if (form.type === 'transfer') return [];
    return flattenCategories(categoriesData?.data ?? []);
  }, [categoriesData?.data, form.type]);

  const accounts = accountsData?.data ?? [];

  function setField<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K],
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'type') {
        next.categoryId = '';
        next.transferToAccountId = '';
        setHint(
          value === 'transfer'
            ? 'Tarik tunai / pindah dompet — saldo pindah, bukan pengeluaran.'
            : null,
        );
      }
      return next;
    });
  }

  function buildPayload(): TransactionInput | null {
    const accountId = Number(form.accountId);
    const amount = Number(form.amount);
    if (!accountId || !form.transactionDate || !(amount > 0)) {
      setFormError('Akun, nominal, dan tanggal wajib diisi.');
      return null;
    }

    if (form.type === 'transfer') {
      const transferToAccountId = Number(form.transferToAccountId);
      if (!transferToAccountId) {
        setFormError('Akun tujuan wajib untuk pindah akun.');
        return null;
      }
      return {
        type: 'transfer',
        accountId,
        transferToAccountId,
        amount,
        transactionDate: form.transactionDate,
        description: form.description.trim() || undefined,
      };
    }

    const categoryId = Number(form.categoryId);
    if (!categoryId) {
      setFormError('Kategori wajib untuk pemasukan/pengeluaran.');
      return null;
    }

    return {
      type: form.type,
      accountId,
      categoryId,
      amount,
      transactionDate: form.transactionDate,
      description: form.description.trim() || undefined,
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload = buildPayload();
    if (!payload) return;

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setForm(emptyForm);
      setHint(null);
      onDone();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan transaksi.',
      );
    }
  }

  async function onDelete() {
    if (!editing) return;
    if (!window.confirm('Hapus transaksi ini?')) return;
    try {
      await deleteMutation.mutateAsync(editing.id);
      setForm(emptyForm);
      onDone();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menghapus transaksi.',
      );
    }
  }

  const isTransfer = form.type === 'transfer';

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col gap-5">
      {!compact ? (
        <div>
          <h2 className="font-display text-xl text-ink md:text-2xl">
            {editing ? 'Edit transaksi' : 'Catat transaksi'}
          </h2>
          <p className="mt-1 text-xs text-mist">
            {isTransfer
              ? 'Pilih dari akun dan ke akun. Tanpa kategori.'
              : 'Wajib: tipe, akun, kategori, nominal, tanggal.'}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(['expense', 'income', 'transfer'] as TransactionType[]).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => setField('type', type)}
              className={[
                'btn-chip',
                form.type === type ? 'btn-chip-on' : 'btn-chip-off',
              ].join(' ')}
            >
              {TX_TYPE_LABEL[type]}
            </button>
          ),
        )}
      </div>

      {isTransfer && hint ? (
        <p className="rounded-lg border border-brand/30 bg-brand-soft px-4 py-3 text-xs text-brand-deep">
          {hint}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="label-meta">
          {isTransfer ? 'Dari akun' : 'Akun'}
        </span>
        <select
          className="field"
          value={form.accountId}
          onChange={(e) => setField('accountId', e.target.value)}
          required
        >
          <option value="">Pilih akun</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {isTransfer ? (
        <label className="block space-y-1.5">
          <span className="label-meta">Ke akun</span>
          <select
            className="field"
            value={form.transferToAccountId}
            onChange={(e) => setField('transferToAccountId', e.target.value)}
            required
          >
            <option value="">Pilih akun tujuan</option>
            {accounts
              .filter((a) => String(a.id) !== form.accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <label className="block space-y-1.5">
          <span className="label-meta">Kategori</span>
          <select
            className="field"
            value={form.categoryId}
            onChange={(e) => setField('categoryId', e.target.value)}
            required
          >
            <option value="">Pilih kategori</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="label-meta">Nominal</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className="field"
            value={form.amount}
            onChange={(e) => setField('amount', e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="label-meta">Tanggal</span>
          <input
            type="date"
            className="field"
            value={form.transactionDate}
            onChange={(e) => setField('transactionDate', e.target.value)}
            required
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="label-meta">Catatan (opsional)</span>
        <input
          type="text"
          maxLength={255}
          className="field"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder={isTransfer ? 'Mis. tarik ATM' : 'Mis. makan siang'}
        />
      </label>

      {formError ? (
        <p className="rounded-lg border border-hazard/30 bg-hazard/5 px-4 py-3 text-sm text-hazard">
          {formError}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan…' : editing ? UI.update : UI.save}
        </button>
        {editing ? (
          <>
            <button type="button" onClick={onCancelEdit} className="btn-ghost">
              {UI.cancel}
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={saving}
              className="btn-hazard"
            >
              {UI.delete}
            </button>
          </>
        ) : null}
      </div>
    </form>
  );
}
