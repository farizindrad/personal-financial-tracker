import type { FormEvent } from 'react';
import { UI } from '../../lib/labels';
import type { Account } from '../../types/accounts';

export type SavingsGoalFormValues = {
  name: string;
  targetAmount: string;
  targetDate: string;
  accountId: string;
  notes: string;
};

export const emptySavingsGoalForm: SavingsGoalFormValues = {
  name: '',
  targetAmount: '',
  targetDate: '',
  accountId: '',
  notes: '',
};

type Props = {
  values: SavingsGoalFormValues;
  onChange: (next: SavingsGoalFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  error: string | null;
  saving: boolean;
  editing: boolean;
  accounts: Account[];
  compact?: boolean;
};

export function SavingsGoalForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  editing,
  accounts,
  compact = false,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!compact ? (
        <div>
          <h2 className="font-display text-xl text-ink">
            {editing ? 'Edit target' : UI.addGoal}
          </h2>
          <p className="mt-1 text-xs text-mist">
            Hubungkan ke akun supaya progres ikut saldo.
          </p>
        </div>
      ) : null}

      <label className="block space-y-1.5">
        <span className="label-meta">Nama</span>
        <input
          className="field"
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          maxLength={100}
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Target nominal</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          className="field"
          value={values.targetAmount}
          onChange={(e) =>
            onChange({ ...values, targetAmount: e.target.value })
          }
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Target tanggal (opsional)</span>
        <input
          type="date"
          className="field"
          value={values.targetDate}
          onChange={(e) =>
            onChange({ ...values, targetDate: e.target.value })
          }
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Akun terhubung (opsional)</span>
        <select
          className="field"
          value={values.accountId}
          onChange={(e) =>
            onChange({ ...values, accountId: e.target.value })
          }
        >
          <option value="">— Tanpa akun —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Catatan (opsional)</span>
        <input
          className="field"
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          maxLength={255}
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
