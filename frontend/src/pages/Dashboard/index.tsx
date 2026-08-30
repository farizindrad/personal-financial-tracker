import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Plus,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Scales,
  PiggyBank,
  Flag,
  Wallet,
  Coins,
  SquaresFour,
  Tag,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { useBudgets } from '../../hooks/useBudgets';
import { useSavingsGoals } from '../../hooks/useSavingsGoals';
import { useDailySummary } from '../../hooks/useDailySummary';
import { formatDateId, formatIdr, formatPeriod } from '../../lib/format';
import { PAGE, TX_TYPE_LABEL, UI, fetchingHint } from '../../lib/labels';

gsap.registerPlugin(ScrollTrigger);

const QUICK_LINKS = [
  { to: '/accounts', label: PAGE.accounts, icon: Wallet },
  { to: '/assets', label: PAGE.assets, icon: Coins },
  { to: '/categories', label: PAGE.categories, icon: Tag },
  { to: '/budgets', label: PAGE.budgets, icon: PiggyBank },
  { to: '/savings-goals', label: PAGE.savingsGoals, icon: Flag },
  { to: '/transactions', label: PAGE.transactions, icon: SquaresFour },
];

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboardSummary();
  const rootRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const widgetMonth = data?.period.month ?? now.getMonth() + 1;
  const widgetYear = data?.period.year ?? now.getFullYear();
  const budgets = useBudgets(widgetMonth, widgetYear, 1, 50);
  const goals = useSavingsGoals(1, 5);
  const daily = useDailySummary(widgetMonth, widgetYear);

  useLayoutEffect(() => {
    if (!data || !rootRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('[data-hero]', {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power2.out',
      });
      gsap.from('[data-bento] > *', {
        opacity: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.05,
        ease: 'power2.out',
        delay: 0.1,
      });
      gsap.from('[data-trx-row]', {
        scrollTrigger: {
          trigger: '[data-trx-list]',
          start: 'top 85%',
        },
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.out',
      });
    }, rootRef);

    return () => ctx.revert();
  }, [data]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-16 max-w-xl rounded-lg bg-mist/10" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="col-span-2 h-44 rounded-xl bg-mist/10 lg:row-span-2" />
          <div className="h-44 rounded-xl bg-mist/10" />
          <div className="h-44 rounded-xl bg-mist/10" />
          <div className="col-span-2 h-28 rounded-xl bg-mist/10" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <section className="max-w-xl space-y-4">
        <h1 className="page-h1">{PAGE.dashboard}</h1>
        <p className="text-sm text-mist">
          Gagal memuat ringkasan
          {error instanceof Error ? `: ${error.message}` : '.'}
        </p>
        <button type="button" onClick={() => void refetch()} className="btn-primary">
          Coba lagi
        </button>
      </section>
    );
  }

  const net = Number(data.netThisMonth);
  const periodLabel = formatPeriod(data.period.month, data.period.year);

  const budgetRows = budgets.data?.data ?? [];
  const budgetTotal = budgetRows.reduce((s, b) => s + Number(b.budgetAmount), 0);
  const budgetSpent = budgetRows.reduce((s, b) => s + Number(b.spent), 0);
  const budgetRemaining = budgetTotal - budgetSpent;
  const budgetPct =
    budgetTotal > 0 ? Math.min(Math.round((budgetSpent / budgetTotal) * 100), 100) : 0;

  const goalRows = (goals.data?.data ?? []).slice(0, 3);

  const dailyDays = daily.data?.data ?? [];
  const daysInMonth = new Date(widgetYear, widgetMonth, 0).getDate();
  const dayByNum = new Map(
    dailyDays.map((d) => [Number(d.date.slice(8, 10)), d]),
  );

  return (
    <div ref={rootRef} className="w-full max-w-full space-y-10 md:space-y-14">
      <section data-hero className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">
            {periodLabel}
            {fetchingHint(isFetching)}
          </p>
          <h1 className="page-h1 mt-1">
            Saldo{' '}
            <span className="text-brand">{formatIdr(data.totalBalance)}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Ringkasan akun aktif — pemasukan, pengeluaran, 10 transaksi terakhir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/transactions" className="btn-primary">
            <Plus size={16} weight="bold" />
            {UI.addTransaction}
          </Link>
          <Link to="/accounts" className="btn-ghost">
            Lihat akun
          </Link>
        </div>
      </section>

      <section data-bento className="grid grid-flow-dense grid-cols-2 gap-4 lg:grid-cols-4">
        <article className="card-ink col-span-2 row-span-2 flex flex-col justify-between p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
              {UI.netThisMonth}
            </p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white">
              <Scales size={18} weight="bold" />
            </span>
          </div>
          <p
            className={[
              'mt-6 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-none',
              net >= 0 ? 'text-white' : 'text-hazard',
            ].join(' ')}
          >
            {formatIdr(data.netThisMonth)}
          </p>
          <p className="mt-4 max-w-xs text-xs text-white/60">
            Pemasukan − pengeluaran · {periodLabel}
          </p>
        </article>

        <article className="card flex flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="label-meta">{TX_TYPE_LABEL.income}</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint-soft text-mint">
              <ArrowDownLeft size={16} weight="bold" />
            </span>
          </div>
          <p className="amount-pos mt-auto pt-6 text-2xl md:text-3xl">
            {formatIdr(data.incomeThisMonth)}
          </p>
        </article>

        <article className="card flex flex-col justify-between p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="label-meta">{TX_TYPE_LABEL.expense}</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-hazard/10 text-hazard">
              <ArrowUpRight size={16} weight="bold" />
            </span>
          </div>
          <p className="amount-neg mt-auto pt-6 text-2xl md:text-3xl">
            {formatIdr(data.expenseThisMonth)}
          </p>
        </article>

        <article className="card col-span-2 flex items-end justify-between gap-4 p-5">
          <div>
            <p className="label-meta">Periode aktif</p>
            <p className="mt-1 font-display text-lg font-bold md:text-xl">
              {periodLabel}
            </p>
          </div>
          <Link to="/budgets" className="btn-primary shrink-0">
            {UI.checkBudget}
          </Link>
        </article>

        <article className="card col-span-2 flex flex-col justify-between gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="label-meta">Net worth</p>
            <Link
              to="/assets"
              className="text-xs font-semibold text-brand hover:text-brand-deep"
            >
              Kelola
            </Link>
          </div>
          <p
            className={[
              'mt-auto font-display text-2xl font-bold md:text-3xl',
              Number(data.netWorth) < 0 ? 'amount-neg' : 'text-ink',
            ].join(' ')}
          >
            {formatIdr(data.netWorth)}
          </p>
          <p className="text-xs text-mist">
            Saldo akun + aset − kewajiban
          </p>
        </article>
      </section>

      <section className="grid grid-flow-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <article className="card flex flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-meta">Anggaran {periodLabel}</p>
              <p className="amount-plain mt-2 text-xl md:text-2xl">
                {formatIdr(budgetRemaining)}
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
              <PiggyBank size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-mist/15">
              <div
                className={[
                  'h-full rounded-full transition-all duration-500',
                  budgetRemaining < 0 ? 'bg-hazard' : 'bg-brand',
                ].join(' ')}
                style={{ width: `${budgetRemaining < 0 ? 100 : budgetPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-mist">
              {budgetTotal > 0
                ? `Terpakai ${formatIdr(budgetSpent)} dari ${formatIdr(budgetTotal)}`
                : 'Belum ada anggaran bulan ini.'}
            </p>
          </div>
          <Link to="/budgets" className="btn-ghost mt-4 w-full">
            {UI.checkBudget}
          </Link>
        </article>

        <article className="card flex flex-col justify-between p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-meta">Target tabungan</p>
              <p className="amount-plain mt-2 text-xl md:text-2xl">
                {goals.data?.meta.total ?? 0}
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint-soft text-mint">
              <Flag size={18} weight="bold" />
            </span>
          </div>
          {goalRows.length === 0 ? (
            <p className="mt-4 text-xs text-mist">Belum ada target tabungan.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {goalRows.map((g) => {
                const pct = Math.min(Number(g.percentComplete), 100);
                return (
                  <li key={g.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-ink">{g.name}</span>
                      <span className="shrink-0 text-mist">{g.percentComplete}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist/15">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/savings-goals" className="btn-ghost mt-4 w-full">
            Lihat target
          </Link>
        </article>

        <article className="card flex flex-col justify-between p-5 md:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-meta">Kalender {periodLabel}</p>
              <p className="mt-2 text-xs text-mist">
                Klik hari untuk lihat transaksi.
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-hazard/10 text-hazard">
              <CalendarBlank size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const day = dayByNum.get(d);
              const isToday = d === now.getDate() && widgetMonth === now.getMonth() + 1 && widgetYear === now.getFullYear();
              let tone = '';
              if (day) {
                const netD = Number(day.net);
                tone = netD > 0 ? 'bg-mint-soft text-mint' : netD < 0 ? 'bg-hazard/10 text-hazard' : 'bg-mist/10 text-mist';
              }
              return (
                <Link
                  key={d}
                  to="/transactions?view=calendar"
                  title={day ? `+${formatIdr(day.income)} / −${formatIdr(day.expense)}` : undefined}
                  className={[
                    'grid aspect-square place-items-center rounded-lg text-xs font-semibold transition-transform hover:scale-110',
                    tone || 'text-mist/40',
                    isToday ? 'ring-1 ring-brand' : '',
                  ].join(' ')}
                >
                  {d}
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold md:text-2xl">
          Menu cepat
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                className="card flex flex-col items-start gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={18} weight="bold" />
                </span>
                <span className="text-sm font-semibold text-ink">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section data-trx-list className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-xl font-bold md:text-2xl">
            Gerakan uang
          </h2>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-deep"
          >
            Semua transaksi
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {data.recentTransactions.length === 0 ? (
          <div className="card border-dashed px-6 py-14 text-center">
            <p className="text-xs font-medium tracking-wide text-mist uppercase">
              Belum ada transaksi. Mulai dari halaman Transaksi.
            </p>
          </div>
        ) : (
          <ul className="card divide-y divide-mist/10">
            {data.recentTransactions.map((trx) => {
              const signed =
                trx.type === 'expense' || trx.type === 'transfer'
                  ? -Number(trx.amount)
                  : Number(trx.amount);
              const label =
                trx.type === 'transfer'
                  ? `${trx.account.name} → ${trx.transferToAccount?.name ?? '—'}`
                  : (trx.category?.name ?? trx.account.name);

              return (
                <li
                  key={trx.id}
                  data-trx-row
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {trx.description?.trim() || label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-mist">
                      {formatDateId(trx.transactionDate)} · {trx.account.name}
                      {trx.category ? ` · ${trx.category.name}` : ''}
                    </p>
                  </div>
                  <p
                    className={[
                      'shrink text-right text-base md:text-lg',
                      signed < 0 ? 'amount-neg' : 'amount-pos',
                    ].join(' ')}
                  >
                    {formatIdr(signed)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
