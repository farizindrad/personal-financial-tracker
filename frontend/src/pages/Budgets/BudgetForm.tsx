import type { FormEvent } from 'react';
import { MONTHS_ID } from '../../lib/format';
import { UI } from '../../lib/labels';
import type { Category } from '../../types/categories';

type Props = {
  month: number;
  year: number;
  years: number[];
  categoryId: string;
  budgetAmount: string;
  expenseOptions: Category[];
  editing: boolean;
  error: string | null;
  saving: boolean;
  compact?: boolean;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onCategoryChange: (id: string) => void;
  onAmountChange: (amount: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
};

export function BudgetForm({
  month,
  year,
  years,
  categoryId,
  budgetAmount,
  expenseOptions,
  editing,
  error,
  saving,
  compact = false,
  onMonthChange,
  onYearChange,
  onCategoryChange,
  onAmountChange,
  onSubmit,
  onCancel,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!compact ? (
        <div>
          <h2 className="font-display text-xl text-ink">
            {editing ? 'Ubah anggaran' : UI.setBudget}
          </h2>
          <p className="mt-1 text-xs text-mist">
            Per kategori pengeluaran + bulan. Bisa diubah kapan saja.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="label-meta">Bulan</span>
          <select
            className="field"
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {MONTHS_ID.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="label-meta">Tahun</span>
          <select
            className="field"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="label-meta">Kategori</span>
        <select
          className="field"
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          required
          disabled={editing}
        >
          <option value="">Pilih kategori</option>
          {expenseOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Nominal anggaran</span>
        <input
          type="number"
          min="0"
          step="0.01"
          className="field"
          value={budgetAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          required
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-hazard/30 bg-hazard/5 px-4 py-3 text-sm text-hazard">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Menyimpan…' : editing ? UI.update : UI.save}
        </button>
        {editing ? (
          <button type="button" onClick={onCancel} className="btn-ghost">
            {UI.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
