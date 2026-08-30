import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ListBullets,
} from '@phosphor-icons/react';
import { useDailySummary } from '../../hooks/useDailySummary';
import { useTransactions } from '../../hooks/useTransactions';
import { formatDateId, formatIdr, formatPeriod, MONTHS_ID } from '../../lib/format';
import { TX_TYPE_LABEL, fetchingHint } from '../../lib/labels';
import type { DailySummary } from '../../types/dashboard';

const DAY_NAMES_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

type ViewMode = 'month' | 'week';

export function TransactionCalendar({
  onOpenInList,
}: {
  onOpenInList?: (date: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => today.getMonth() + 1);
  const [year, setYear] = useState(() => today.getFullYear());
  const [view, setView] = useState<ViewMode>('month');
  const [selected, setSelected] = useState<string>(() => toLocalDateKey(today));
  const rootRef = useRef<HTMLDivElement>(null);

  const { data, isError, refetch, isFetching } = useDailySummary(month, year);
  const dayTx = useTransactions(
    selected ? { dateFrom: selected, dateTo: selected, limit: 100 } : {},
  );

  const byDate = useMemo(() => {
    const map = new Map<string, DailySummary['data'][number]>();
    for (const d of data?.data ?? []) map.set(d.date, d);
    return map;
  }, [data]);

  const weeks = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const start = startOfWeek(first);
    const cells: Date[] = [];
    if (view === 'month') {
      for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
    } else {
      const dayNum = selected ? Number(selected.slice(8)) : 1;
      const wkStart = startOfWeek(new Date(year, month - 1, dayNum));
      for (let i = 0; i < 7; i++) cells.push(addDays(wkStart, i));
    }
    return cells;
  }, [month, year, view, selected]);

  const isToday = (key: string) => key === toLocalDateKey(today);
  const isSelected = (key: string) => key === selected;

  const goPrev = () => {
    const d = new Date(year, month - 2, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };
  const goNext = () => {
    const d = new Date(year, month, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
  };

  useLayoutEffect(() => {
    if (rootRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('[data-cell]', {
          opacity: 0,
          scale: 0.96,
          duration: 0.3,
          stagger: 0.012,
          ease: 'power2.out',
        });
      }, rootRef);
      return () => ctx.revert();
    }
  }, [month, year, view]);

  const dayTxList = dayTx.data?.data ?? [];
  const dayIncome = dayTxList.reduce(
    (acc, t) => acc + (t.type === 'income' ? Number(t.amount) : 0),
    0,
  );
  const dayExpense = dayTxList.reduce(
    (acc, t) =>
      acc + (t.type === 'expense' || t.type === 'transfer' ? Number(t.amount) : 0),
    0,
  );

  return (
    <div ref={rootRef} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label-meta">
          {formatPeriod(month, year)}
          {fetchingHint(isFetching)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-mist/15">
            <button
              type="button"
              onClick={() => setView('month')}
              className={[
                'px-3 py-2 text-sm font-semibold transition-colors',
                view === 'month'
                  ? 'bg-brand text-brand-deep'
                  : 'text-mist hover:text-ink',
              ].join(' ')}
            >
              Bulan
            </button>
            <button
              type="button"
              onClick={() => setView('week')}
              className={[
                'px-3 py-2 text-sm font-semibold transition-colors',
                view === 'week'
                  ? 'bg-brand text-brand-deep'
                  : 'text-mist hover:text-ink',
              ].join(' ')}
            >
              Minggu
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={goPrev} className="btn-ghost px-2.5 py-2">
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonth(today.getMonth() + 1);
                setYear(today.getFullYear());
                setSelected(toLocalDateKey(today));
              }}
              className="btn-ghost px-3 py-2 text-sm"
            >
              Hari ini
            </button>
            <button type="button" onClick={goNext} className="btn-ghost px-2.5 py-2">
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist">Gagal memuat data kalender.</p>
          <button type="button" onClick={() => void refetch()} className="btn-primary">
            Coba lagi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-mist/10">
              {DAY_NAMES_ID.map((d) => (
                <div
                  key={d}
                  className="px-2 py-3 text-center text-[0.65rem] font-semibold tracking-wider text-mist uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weeks.map((d) => {
                const key = toLocalDateKey(d);
                const inMonth = d.getMonth() + 1 === month;
                const day = byDate.get(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    data-cell
                    className={[
                      'group relative flex min-h-[72px] flex-col items-stretch gap-1 border-b border-r border-mist/10 p-1.5 text-left transition-colors last:border-r-0 hover:bg-brand-soft/50',
                      view === 'week' && d.getDay() === 0 ? 'border-l-0' : '',
                      !inMonth ? 'opacity-35' : '',
                      isSelected(key) ? 'bg-brand-soft/60' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                        isToday(key) ? 'bg-brand text-brand-deep' : 'text-ink',
                        isSelected(key) && !isToday(key) ? 'ring-1 ring-brand' : '',
                      ].join(' ')}
                    >
                      {d.getDate()}
                    </span>
                    {day ? (
                      <div className="flex flex-col gap-0.5">
                        {Number(day.income) > 0 ? (
                          <span className="truncate text-[0.65rem] leading-none text-mint">
                            +{formatIdr(day.income)}
                          </span>
                        ) : null}
                        {Number(day.expense) > 0 ? (
                          <span className="truncate text-[0.65rem] leading-none text-hazard">
                            −{formatIdr(day.expense)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-[0.65rem] leading-none text-mist/0 select-none">
                        ·
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="card h-fit p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <CalendarBlank size={18} weight="bold" />
                </span>
                <div>
                  <p className="text-sm font-bold">{formatDateId(selected)}</p>
                  <p className="text-xs text-mist">
                    {MONTHS_ID[month - 1]} {year}
                  </p>
                </div>
              </div>
              {onOpenInList ? (
                <button
                  type="button"
                  onClick={() => onOpenInList(selected)}
                  className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
                >
                  <ListBullets size={14} weight="bold" />
                  Daftar
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-mint-soft/60 p-3">
                <p className="text-[0.65rem] font-medium text-mist">
                  {TX_TYPE_LABEL.income}
                </p>
                <p className="amount-pos mt-1 text-sm md:text-base">{formatIdr(dayIncome)}</p>
              </div>
              <div className="rounded-lg bg-hazard/5 p-3">
                <p className="text-[0.65rem] font-medium text-mist">
                  {TX_TYPE_LABEL.expense}
                </p>
                <p className="amount-neg mt-1 text-sm md:text-base">{formatIdr(dayExpense)}</p>
              </div>
            </div>

            <p className="label-meta mt-5">
              Transaksi hari ini
            </p>
            {dayTxList.length === 0 ? (
              <p className="mt-2 rounded-lg border border-dashed border-mist/20 px-3 py-6 text-center text-xs text-mist">
                Tidak ada transaksi pada tanggal ini.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-mist/10">
                {dayTxList.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {t.description?.trim() ||
                          t.category?.name ||
                          t.account.name}
                      </p>
                      <p className="truncate text-xs text-mist">
                        {t.account.name}
                        {t.category ? ` · ${t.category.name}` : ''}
                      </p>
                    </div>
                    <p
                      className={[
                        'shrink text-right text-sm',
                        t.type === 'expense' || t.type === 'transfer'
                          ? 'amount-neg'
                          : 'amount-pos',
                      ].join(' ')}
                    >
                      {formatIdr(
                        t.type === 'expense' || t.type === 'transfer'
                          ? -Number(t.amount)
                          : Number(t.amount),
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
