import { LIABILITY_TYPES } from '../../lib/labels';

export type LiabilityFormValues = {
  name: string;
  type: string;
  amount: string;
  notes: string;
};

export const emptyLiabilityForm: LiabilityFormValues = {
  name: '',
  type: 'other',
  amount: '',
  notes: '',
};

export function LiabilityForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  editing,
}: {
  values: LiabilityFormValues;
  onChange: (v: LiabilityFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  error?: string | null;
  saving: boolean;
  editing?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-hazard/25 bg-hazard/5 px-3 py-2 text-sm text-hazard">
          {error}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="label-meta">Nama kewajiban</span>
        <input
          value={values.name}
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          className="field"
          placeholder="Kartu kredit, KPR, pinjaman…"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Jenis</span>
        <select
          value={values.type}
          onChange={(e) => onChange({ ...values, type: e.target.value })}
          className="field"
        >
          {LIABILITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Nominal (Rp)</span>
        <input
          type="number"
          min={0}
          step="any"
          value={values.amount}
          onChange={(e) => onChange({ ...values, amount: e.target.value })}
          className="field"
          placeholder="0"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="label-meta">Catatan</span>
        <input
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          className="field"
          placeholder="Opsional"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Batal
          </button>
        ) : null}
        <button type="submit" disabled={saving} className="btn-primary">
          {editing ? 'Simpan' : 'Tambah'}
        </button>
      </div>
    </form>
  );
}
