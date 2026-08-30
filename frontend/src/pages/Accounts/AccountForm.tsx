import type { FormEvent } from 'react';
import { ACCOUNT_TYPE_LABEL, UI } from '../../lib/labels';
import type { AccountType } from '../../types/accounts';

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = (
  Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]
).map((value) => ({ value, label: ACCOUNT_TYPE_LABEL[value] }));

export type AccountFormValues = {
  name: string;
  type: AccountType;
  initialBalance: string;
  notes: string;
};

export const emptyAccountForm: AccountFormValues = {
  name: '',
  type: 'bank',
  initialBalance: '',
  notes: '',
};

type AccountFormProps = {
  values: AccountFormValues;
  onChange: (next: AccountFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  error: string | null;
  saving: boolean;
  editing: boolean;
  compact?: boolean;
};

export function AccountForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  editing,
  compact = false,
}: AccountFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!compact ? (
        <div>
          <h2 className="font-display text-xl text-ink">
            {editing ? 'Edit akun' : 'Tambah akun'}
          </h2>
          <p className="mt-1 text-xs text-mist">
            Nama wajib. Saldo awal opsional saat buat baru.
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
        <span className="label-meta">Tipe</span>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...values, type: t.value })}
              className={[
                'btn-chip',
                values.type === t.value ? 'btn-chip-on' : 'btn-chip-off',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Saldo awal</span>
        <input
          type="number"
          step="0.01"
          className="field"
          value={values.initialBalance}
          onChange={(e) =>
            onChange({ ...values, initialBalance: e.target.value })
          }
        />
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
