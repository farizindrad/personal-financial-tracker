import type { FormEvent } from 'react';
import { CATEGORY_TYPE_LABEL, UI } from '../../lib/labels';
import type { Category, CategoryType } from '../../types/categories';

export type CategoryFormValues = {
  name: string;
  type: CategoryType;
  parentId: string;
  color: string;
};

export const emptyCategoryForm: CategoryFormValues = {
  name: '',
  type: 'expense',
  parentId: '',
  color: '#111111',
};

export type EditingTarget = {
  category: Category;
  isChild: boolean;
  parentName?: string;
};

type Props = {
  values: CategoryFormValues;
  onChange: (next: CategoryFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  error: string | null;
  saving: boolean;
  editing: EditingTarget | null;
  parentOptions: Category[];
  compact?: boolean;
};

export function CategoryForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  error,
  saving,
  editing,
  parentOptions,
  compact = false,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!compact ? (
        <div>
          <h2 className="font-display text-xl text-ink">
            {editing ? 'Edit kategori' : 'Tambah kategori'}
          </h2>
          <p className="mt-1 text-xs text-mist">
            {editing?.isChild
              ? `Sub dari ${editing.parentName}`
              : 'Opsional: pilih induk untuk buat sub-kategori.'}
          </p>
        </div>
      ) : null}

      {!editing ? (
        <div className="flex flex-wrap gap-2">
          {(['expense', 'income'] as CategoryType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...values, type: t, parentId: '' })}
              className={[
                'btn-chip',
                values.type === t ? 'btn-chip-on' : 'btn-chip-off',
              ].join(' ')}
            >
              {CATEGORY_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      ) : (
        <p className="label-meta">
          Tipe: {CATEGORY_TYPE_LABEL[editing.category.type]}
        </p>
      )}

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

      {!editing?.isChild ? (
        <label className="block space-y-1.5">
          <span className="label-meta">Induk (opsional)</span>
          <select
            className="field"
            value={values.parentId}
            onChange={(e) =>
              onChange({ ...values, parentId: e.target.value })
            }
            disabled={
              !!editing && (editing.category.children?.length ?? 0) > 0
            }
          >
            <option value="">— Kategori utama —</option>
            {parentOptions
              .filter((p) => p.id !== editing?.category.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      <label className="block space-y-1.5">
        <span className="label-meta">Warna</span>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={values.color}
            onChange={(e) => onChange({ ...values, color: e.target.value })}
            className="h-11 w-14 cursor-pointer rounded-lg border border-mist/25 bg-paper"
          />
          <input
            className="field"
            value={values.color}
            onChange={(e) => onChange({ ...values, color: e.target.value })}
            maxLength={7}
          />
        </div>
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
