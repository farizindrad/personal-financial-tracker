import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import gsap from 'gsap';
import { Plus, Flag } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { ApiError } from '../../lib/api-client';
import { useAccounts } from '../../hooks/useAccounts';
import {
  useCreateSavingsGoal,
  useSavingsGoals,
  useUpdateSavingsGoal,
} from '../../hooks/useSavingsGoals';
import { formatDateId, formatIdr } from '../../lib/format';
import { PAGE, UI, fetchingHint } from '../../lib/labels';
import type { SavingsGoal } from '../../types/savings-goals';
import {
  SavingsGoalForm,
  emptySavingsGoalForm,
  type SavingsGoalFormValues,
} from './SavingsGoalForm';

export function SavingsGoalsPage() {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SavingsGoalFormValues>(emptySavingsGoalForm);
  const [formError, setFormError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const limit = 12;
  const { data, isLoading, isError, error, isFetching } = useSavingsGoals(
    page,
    limit,
  );
  const { data: accountsData } = useAccounts(1, 100);
  const createMutation = useCreateSavingsGoal();
  const updateMutation = useUpdateSavingsGoal();
  const saving = createMutation.isPending || updateMutation.isPending;

  const closeForm = useCallback(() => {
    setEditing(null);
    setForm(emptySavingsGoalForm);
    setFormError(null);
    setFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptySavingsGoalForm);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((goal: SavingsGoal) => {
    setEditing(goal);
    setForm({
      name: goal.name,
      targetAmount: String(Number(goal.targetAmount)),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
      accountId: goal.accountId != null ? String(goal.accountId) : '',
      notes: goal.notes ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    if (!editing) {
      if (!formOpen) setForm(emptySavingsGoalForm);
      return;
    }
    setForm({
      name: editing.name,
      targetAmount: String(Number(editing.targetAmount)),
      targetDate: editing.targetDate ? editing.targetDate.slice(0, 10) : '',
      accountId: editing.accountId != null ? String(editing.accountId) : '',
      notes: editing.notes ?? '',
    });
  }, [editing, formOpen]);

  useLayoutEffect(() => {
    if (!data?.data.length || !gridRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-goal]', {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
      });
    }, gridRef);
    return () => ctx.revert();
  }, [data?.data, page]);

  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / limit));
  const completedCount = (data?.data ?? []).filter((g) => g.isCompleted).length;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    const targetAmount = Number(form.targetAmount);
    if (!name || !(targetAmount > 0)) {
      setFormError('Nama dan target nominal wajib.');
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            name,
            targetAmount,
            targetDate: form.targetDate || null,
            accountId: form.accountId ? Number(form.accountId) : null,
            notes: form.notes.trim() || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          targetAmount,
          targetDate: form.targetDate || undefined,
          accountId: form.accountId ? Number(form.accountId) : undefined,
          notes: form.notes.trim() || undefined,
        });
      }
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan target.',
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
    accounts: accountsData?.data ?? [],
  };

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Tabungan bertarget</p>
          <h1 className="page-h1 mt-1">{PAGE.savingsGoals}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Progres dari saldo akun yang dihubungkan
            {fetchingHint(isFetching)}.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} weight="bold" />
          {UI.addGoal}
        </button>
      </section>

      <section className="grid grid-flow-dense grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="card-ink col-span-2 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
              Target aktif
            </p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white">
              <Flag size={18} weight="bold" />
            </span>
          </div>
          <p className="mt-3 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-white">
            {data?.meta.total ?? 0}
          </p>
        </article>
        <article className="card p-5">
          <p className="label-meta">Selesai</p>
          <p className="amount-plain mt-3 text-2xl">{completedCount}</p>
        </article>
        <article className="card p-5">
          <p className="label-meta">Berjalan</p>
          <p className="amount-plain mt-3 text-2xl">
            {(data?.data.length ?? 0) - completedCount}
          </p>
        </article>
      </section>

      <section className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-mist/10" />
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
                Belum ada target tabungan.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mt-4"
              >
                {UI.addGoal}
              </button>
            </div>
          ) : (
            <div
              ref={gridRef}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {data.data.map((goal, index) => {
                const pct = Math.min(Number(goal.percentComplete), 100);
                return (
                  <article
                    key={goal.id}
                    data-goal
                    className={[
                      'card flex flex-col justify-between p-5',
                      index === 0 ? 'sm:col-span-2' : '',
                      editing?.id === goal.id
                        ? 'ring-2 ring-brand'
                        : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold md:text-xl">
                          {goal.name}
                        </p>
                        <p className="mt-1 text-xs text-mist">
                          {goal.account?.name
                            ? `Via ${goal.account.name}`
                            : 'Tanpa akun terhubung'}
                          {goal.targetDate
                            ? ` · target ${formatDateId(goal.targetDate)}`
                            : ''}
                        </p>
                      </div>
                      {goal.isCompleted ? (
                        <span className="shrink-0 rounded-full bg-mint-soft px-2.5 py-1 text-[10px] font-bold tracking-wide text-mint uppercase">
                          Selesai
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6">
                      <div className="flex items-end justify-between gap-2">
                        <p className="amount-plain text-2xl">
                          {formatIdr(goal.currentAmount)}
                        </p>
                        <p className="text-xs text-mist">
                          / {formatIdr(goal.targetAmount)}
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist/15">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-mist">
                        <span>{goal.percentComplete}%</span>
                        <span>Sisa {formatIdr(goal.remaining)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEdit(goal)}
                      className="btn-primary mt-4 w-full sm:w-auto sm:self-start"
                    >
                      {UI.edit}
                    </button>
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
        onClose={closeForm}
        title={editing ? 'Edit target' : UI.addGoal}
      >
        <SavingsGoalForm {...formProps} compact />
      </FormOverlay>
    </div>
  );
}
