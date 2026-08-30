import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { Plus, Wallet } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { ApiError } from '../../lib/api-client';
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../../hooks/useAccounts';
import { formatIdr } from '../../lib/format';
import { PAGE, UI, fetchingHint } from '../../lib/labels';
import type { Account } from '../../types/accounts';
import {
  ACCOUNT_TYPES,
  AccountForm,
  emptyAccountForm,
  type AccountFormValues,
} from './AccountForm';

export function AccountsPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AccountFormValues>(emptyAccountForm);
  const [formError, setFormError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const limit = 12;
  const { data, isLoading, isError, error, isFetching } = useAccounts(
    page,
    limit,
  );
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const closeForm = useCallback(() => {
    setEditing(null);
    setForm(emptyAccountForm);
    setFormError(null);
    setFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyAccountForm);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((account: Account) => {
    setEditing(account);
    setForm({
      name: account.name,
      type: account.type,
      initialBalance: String(Number(account.initialBalance)),
      notes: account.notes ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (!editing) {
      if (!formOpen) setForm(emptyAccountForm);
      return;
    }
    setForm({
      name: editing.name,
      type: editing.type,
      initialBalance: String(Number(editing.initialBalance)),
      notes: editing.notes ?? '',
    });
  }, [editing, formOpen]);

  useLayoutEffect(() => {
    if (!data?.data.length || !gridRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-account-card]', {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.04,
        ease: 'power2.out',
      });
    }, gridRef);
    return () => ctx.revert();
  }, [data?.data, page]);

  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / limit));
  const totalBalance = (data?.data ?? []).reduce(
    (sum, a) => sum + Number(a.currentBalance ?? a.initialBalance ?? 0),
    0,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    if (!name) {
      setFormError('Nama akun wajib diisi.');
      return;
    }

    const body = {
      name,
      type: form.type,
      initialBalance:
        form.initialBalance === '' ? 0 : Number(form.initialBalance),
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan akun.',
      );
    }
  }

  async function onDeactivate(account: Account) {
    if (
      !window.confirm(
        `Nonaktifkan akun "${account.name}"? Histori transaksi tetap aman.`,
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(account.id);
      if (editing?.id === account.id) closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menonaktifkan akun.',
      );
    }
  }

  const formProps = {
    values: form,
    onChange: setForm,
    onSubmit,
    onCancel: editing ? closeForm : undefined,
    error: formError,
    saving,
    editing: Boolean(editing),
  };

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Dompet & rekening</p>
          <h1 className="page-h1 mt-1">{PAGE.accounts}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Saldo dihitung live — bukan angka yang disimpan manual.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} weight="bold" />
          Tambah akun
        </button>
      </section>

      <article className="card-ink flex flex-col justify-between gap-3 p-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">
              <Wallet size={16} weight="bold" />
            </span>
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
              Total halaman ini{fetchingHint(isFetching)}
            </p>
          </div>
          <p className="mt-2 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold text-white">
            {formatIdr(totalBalance)}
          </p>
        </div>
        <p className="max-w-xs text-xs text-white/60">
          Jumlah saldo akun aktif di halaman ini.
        </p>
      </article>

      <section className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-mist/10" />
              ))}
            </div>
          ) : isError ? (
            <p className="rounded-xl border border-hazard/30 bg-hazard/5 px-5 py-8 text-sm text-hazard">
              Gagal memuat
              {error instanceof Error ? `: ${error.message}` : '.'}
            </p>
          ) : !data?.data.length ? (
            <div className="card border-dashed px-5 py-14 text-center">
              <p className="text-xs font-medium tracking-wide text-mist uppercase">
                Belum ada akun.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mt-4"
              >
                Tambah yang pertama
              </button>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              {data.data.map((account, index) => (
                <article
                  key={account.id}
                  data-account-card
                  className={[
                    'card flex flex-col justify-between p-5',
                    index === 0 ? 'md:col-span-2' : '',
                    editing?.id === account.id
                      ? 'ring-2 ring-brand'
                      : '',
                  ].join(' ')}
                >
                  <div>
                    <p className="label-meta">
                      {ACCOUNT_TYPES.find((t) => t.value === account.type)
                        ?.label ?? account.type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight md:text-xl">
                      {account.name}
                    </h3>
                  </div>
                  <p className="amount-plain mt-5 text-2xl md:text-3xl">
                    {formatIdr(
                      account.currentBalance ?? account.initialBalance,
                    )}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(account)}
                      className="btn-primary"
                    >
                      {UI.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeactivate(account)}
                      className="btn-hazard"
                    >
                      {UI.deactivate}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost"
            >
              {UI.prev}
            </button>
            <p className="text-xs text-mist uppercase">
              Halaman {page} / {totalPages}
            </p>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost"
            >
              {UI.next}
            </button>
          </div>
      </section>

      <FormOverlay
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit akun' : 'Tambah akun'}
      >
        <AccountForm {...formProps} compact />
      </FormOverlay>
    </div>
  );
}
