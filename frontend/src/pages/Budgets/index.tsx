import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import gsap from 'gsap';
import { Plus, PiggyBank } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { ApiError } from '../../lib/api-client';
import { flattenCategories, useCategories } from '../../hooks/useCategories';
import { useBudgets, useUpsertBudget } from '../../hooks/useBudgets';
import { formatIdr, formatPeriod } from '../../lib/format';
import { PAGE, UI, fetchingHint } from '../../lib/labels';
import type { Budget } from '../../types/budgets';
import { BudgetForm } from './BudgetForm';

export function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, isFetching } = useBudgets(
    month,
    year,
    page,
    20,
  );
  const { data: categoriesData } = useCategories('expense', 1, 100);
  const upsertMutation = useUpsertBudget();

  const expenseOptions = useMemo(
    () => flattenCategories(categoriesData?.data ?? []),
    [categoriesData?.data],
  );

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const resetForm = useCallback(() => {
    setEditing(null);
    setCategoryId('');
    setBudgetAmount('');
    setFormError(null);
    setFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCategoryId('');
    setBudgetAmount('');
    setFormError(null);
    setFormOpen(true);
  }, []);

  const startEdit = useCallback((budget: Budget) => {
    setEditing(budget);
    setCategoryId(String(budget.categoryId));
    setBudgetAmount(String(Number(budget.budgetAmount)));
    setFormError(null);
    setFormOpen(true);
  }, []);

  useLayoutEffect(() => {
    if (!data?.data.length || !listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-budget]', {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.out',
      });
    }, listRef);
    return () => ctx.revert();
  }, [data?.data, page, month, year]);

  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / 20));
  const periodLabel = formatPeriod(month, year);

  const totals = useMemo(() => {
    const rows = data?.data ?? [];
    const budgeted = rows.reduce((s, b) => s + Number(b.budgetAmount), 0);
    const spent = rows.reduce((s, b) => s + Number(b.spent), 0);
    return { budgeted, spent, remaining: budgeted - spent };
  }, [data?.data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const catId = Number(categoryId);
    const amount = Number(budgetAmount);
    if (!catId || !(amount >= 0)) {
      setFormError('Kategori dan nominal anggaran wajib.');
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        categoryId: catId,
        month,
        year,
        budgetAmount: amount,
      });
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan anggaran.',
      );
    }
  }

  const formProps = {
    month,
    year,
    years,
    categoryId,
    budgetAmount,
    expenseOptions,
    editing: Boolean(editing),
    error: formError,
    saving: upsertMutation.isPending,
    onMonthChange: (m: number) => {
      setMonth(m);
      setPage(1);
      setEditing(null);
      setCategoryId('');
      setBudgetAmount('');
      setFormError(null);
    },
    onYearChange: (y: number) => {
      setYear(y);
      setPage(1);
      setEditing(null);
      setCategoryId('');
      setBudgetAmount('');
      setFormError(null);
    },
    onCategoryChange: setCategoryId,
    onAmountChange: setBudgetAmount,
    onSubmit,
    onCancel: editing ? resetForm : undefined,
  };

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Batas per kategori</p>
          <h1 className="page-h1 mt-1">{PAGE.budgets}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Bandingkan dengan realisasi {periodLabel}.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} weight="bold" />
          {UI.setBudget}
        </button>
      </section>

      <section className="grid grid-flow-dense grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="card-ink col-span-2 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
              {UI.budgetRemaining}
              {fetchingHint(isFetching)}
            </p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white">
              <PiggyBank size={18} weight="bold" />
            </span>
          </div>
          <p
            className={[
              'mt-4 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold',
              totals.remaining >= 0 ? 'text-white' : 'text-hazard',
            ].join(' ')}
          >
            {formatIdr(totals.remaining)}
          </p>
        </article>
        <article className="card p-5">
          <p className="label-meta">{UI.budgeted}</p>
          <p className="amount-plain mt-3 text-xl md:text-2xl">
            {formatIdr(totals.budgeted)}
          </p>
        </article>
        <article className="card p-5">
          <p className="label-meta">{UI.spent}</p>
          <p className="amount-neg mt-3 text-xl md:text-2xl">
            {formatIdr(totals.spent)}
          </p>
        </article>
      </section>

      <section className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-mist/10" />
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
                Belum ada anggaran untuk {periodLabel}.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mt-4"
              >
                {UI.setBudget}
              </button>
            </div>
          ) : (
            <div ref={listRef} className="space-y-4">
              {data.data.map((budget) => {
                const pct = Math.min(Number(budget.percentUsed), 100);
                const over = Number(budget.remaining) < 0;
                return (
                  <article
                    key={budget.id}
                    data-budget
                    className={[
                      'card p-5',
                      editing?.id === budget.id ? 'ring-2 ring-brand' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-mist/20"
                            style={{
                              backgroundColor:
                                budget.category.color ?? '#9aa0a6',
                            }}
                          />
                          <h3 className="truncate text-lg font-bold">
                            {budget.category.name}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-mist">
                          {UI.spent} {formatIdr(budget.spent)} /{' '}
                          {formatIdr(budget.budgetAmount)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={[
                            'text-sm font-bold tabular-nums',
                            over ? 'text-hazard' : 'text-ink',
                          ].join(' ')}
                        >
                          {over ? 'Lebih ' : 'Sisa '}
                          {formatIdr(Math.abs(Number(budget.remaining)))}
                        </p>
                        <button
                          type="button"
                          onClick={() => startEdit(budget)}
                          className="btn-primary mt-2"
                        >
                          {UI.edit}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist/15">
                      <div
                        className={[
                          'h-full rounded-full transition-all duration-500',
                          over ? 'bg-hazard' : 'bg-brand',
                        ].join(' ')}
                        style={{ width: `${over ? 100 : pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-mist uppercase">
                      {budget.percentUsed}% terpakai
                    </p>
                  </article>
                );
              })}
            </div>
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

      <FormOverlay
        open={formOpen}
        onClose={resetForm}
        title={editing ? 'Ubah anggaran' : UI.setBudget}
      >
        <BudgetForm {...formProps} compact />
      </FormOverlay>
    </div>
  );
}
