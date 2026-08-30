import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { Plus, ArrowsLeftRight, CalendarBlank, List } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { useAccounts } from '../../hooks/useAccounts';
import { useTransactions } from '../../hooks/useTransactions';
import { formatDateId, formatIdr } from '../../lib/format';
import { PAGE, TX_TYPE_LABEL, UI } from '../../lib/labels';
import type { Transaction } from '../../types/transactions';
import {
  TransactionForm,
  type TransactionFormDraft,
} from './TransactionForm';
import { TransactionCalendar } from './TransactionCalendar';

const LIMIT = 20;

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';
  const [view, setView] = useState<'list' | 'calendar'>(initialView);
  const [page, setPage] = useState(1);
  const [accountId, setAccountId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [draft, setDraft] = useState<TransactionFormDraft | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filters = {
    page,
    limit: LIMIT,
    accountId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, isError, error, isFetching } =
    useTransactions(filters);
  const { data: accountsData } = useAccounts(1, 100);
  const listRef = useRef<HTMLUListElement>(null);

  const closeForm = useCallback(() => {
    setEditing(null);
    setDraft(null);
    setFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setDraft(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((trx: Transaction) => {
    setDraft(null);
    setEditing(trx);
    setFormOpen(true);
  }, []);

  const openCashWithdraw = useCallback(() => {
    const accounts = accountsData?.data ?? [];
    const bank = accounts.find((a) => a.type === 'bank');
    const cash = accounts.find((a) => a.type === 'cash');
    const hasBoth = Boolean(bank && cash);
    setEditing(null);
    setDraft({
      type: 'transfer',
      accountId: bank ? String(bank.id) : '',
      transferToAccountId: cash ? String(cash.id) : '',
      hint: hasBoth
        ? 'Tarik tunai / pindah dompet — saldo pindah, bukan pengeluaran.'
        : 'Buat akun Bank dan Tunai di halaman Akun dulu, lalu pilih Dari / Ke.',
    });
    setFormOpen(true);
  }, [accountsData?.data]);

  useLayoutEffect(() => {
    if (!data?.data.length || !listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-trx]', {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.03,
        ease: 'power2.out',
      });
    }, listRef);
    return () => ctx.revert();
  }, [data?.data, page]);

  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / LIMIT));

  const formProps = {
    editing,
    draft: editing ? null : draft,
    onDone: closeForm,
    onCancelEdit: closeForm,
  };

  const switchView = useCallback(
    (next: 'list' | 'calendar') => {
      setView(next);
      setPage(1);
      if (next === 'calendar') {
        setSearchParams({ view: 'calendar' }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams],
  );

  const openDayInList = useCallback(
    (date: string) => {
      setDateFrom(date);
      setDateTo(date);
      setPage(1);
      switchView('list');
    },
    [switchView],
  );

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Arus kas harian</p>
          <h1 className="page-h1 mt-1">{PAGE.transactions}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Catat pemasukan, pengeluaran, atau pindah antar akun.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-mist/15">
            <button
              type="button"
              onClick={() => switchView('list')}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors',
                view === 'list'
                  ? 'bg-brand text-brand-deep'
                  : 'text-mist hover:text-ink',
              ].join(' ')}
            >
              <List size={14} weight="bold" />
              Daftar
            </button>
            <button
              type="button"
              onClick={() => switchView('calendar')}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition-colors',
                view === 'calendar'
                  ? 'bg-brand text-brand-deep'
                  : 'text-mist hover:text-ink',
              ].join(' ')}
            >
              <CalendarBlank size={14} weight="bold" />
              Kalender
            </button>
          </div>
          {view === 'list' ? (
            <>
              <button type="button" onClick={openCreate} className="btn-primary">
                <Plus size={16} weight="bold" />
                {UI.addTransaction}
              </button>
              <button type="button" onClick={openCashWithdraw} className="btn-ghost">
                <ArrowsLeftRight size={16} weight="bold" />
                {UI.cashWithdraw}
              </button>
            </>
          ) : null}
        </div>
      </section>

      {view === 'calendar' ? (
        <TransactionCalendar onOpenInList={openDayInList} />
      ) : (
      <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <select
              className="field"
              value={accountId ?? ''}
              onChange={(e) => {
                setPage(1);
                setAccountId(
                  e.target.value ? Number(e.target.value) : undefined,
                );
              }}
            >
              <option value="">Semua akun</option>
              {(accountsData?.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="field"
              value={dateFrom}
              onChange={(e) => {
                setPage(1);
                setDateFrom(e.target.value);
              }}
            />
            <input
              type="date"
              className="field"
              value={dateTo}
              onChange={(e) => {
                setPage(1);
                setDateTo(e.target.value);
              }}
            />
            <p className="flex min-h-10 items-center justify-end text-xs text-mist uppercase">
              {isFetching ? UI.sync : `${data?.meta.total ?? 0} trx`}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-mist/10" />
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
                Belum ada transaksi pada filter ini.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mt-4"
              >
                {UI.addTransaction}
              </button>
            </div>
          ) : (
            <ul
              ref={listRef}
              className="card divide-y divide-mist/10"
            >
              {data.data.map((trx) => {
                const signed =
                  trx.type === 'expense' || trx.type === 'transfer'
                    ? -Number(trx.amount)
                    : Number(trx.amount);
                const subtitle =
                  trx.type === 'transfer'
                    ? `${trx.account.name} → ${trx.transferToAccount?.name ?? '—'}`
                    : `${trx.account.name}${trx.category ? ` · ${trx.category.name}` : ''}`;
                const title =
                  trx.description?.trim() ||
                  (trx.type === 'transfer'
                    ? subtitle
                    : (trx.category?.name ?? TX_TYPE_LABEL[trx.type]));

                return (
                  <li key={trx.id} data-trx>
                    <button
                      type="button"
                      onClick={() => openEdit(trx)}
                      className={[
                        'flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-paper-deep',
                        editing?.id === trx.id ? 'bg-brand-soft' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-mist">
                          {formatDateId(trx.transactionDate)} ·{' '}
                          {TX_TYPE_LABEL[trx.type]} · {subtitle}
                        </p>
                      </div>
                      <p
                        className={[
                          'shrink text-right text-base',
                          signed < 0 ? 'amount-neg' : 'amount-pos',
                        ].join(' ')}
                      >
                        {formatIdr(signed)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center justify-between gap-3">
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
      )}

      <FormOverlay
        open={formOpen}
        onClose={closeForm}
        title={
          editing
            ? 'Edit transaksi'
            : draft?.type === 'transfer'
              ? UI.cashWithdraw
              : UI.addTransaction
        }
      >
        <TransactionForm {...formProps} compact />
      </FormOverlay>
    </div>
  );
}
