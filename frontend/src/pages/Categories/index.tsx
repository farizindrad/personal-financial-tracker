import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import gsap from 'gsap';
import { Plus } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { ApiError } from '../../lib/api-client';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '../../hooks/useCategories';
import { CATEGORY_TYPE_LABEL, PAGE, UI } from '../../lib/labels';
import type { Category, CategoryType } from '../../types/categories';
import {
  CategoryForm,
  emptyCategoryForm,
  type CategoryFormValues,
  type EditingTarget,
} from './CategoryForm';

export function CategoriesPage() {
  const [typeFilter, setTypeFilter] = useState<CategoryType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormValues>(emptyCategoryForm);
  const [formError, setFormError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const queryType = typeFilter === 'all' ? undefined : typeFilter;
  const { data, isLoading, isError, error, isFetching } = useCategories(
    queryType,
    page,
    20,
  );
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const saving = createMutation.isPending || updateMutation.isPending;

  const parentOptions = useMemo(() => {
    const roots = data?.data ?? [];
    return roots.filter((c) => c.type === form.type && !c.parentId);
  }, [data?.data, form.type]);

  const closeForm = useCallback(() => {
    setEditing(null);
    setForm(emptyCategoryForm);
    setFormError(null);
    setFormOpen(false);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(emptyCategoryForm);
    setFormError(null);
    setFormOpen(true);
  }, []);

  const startEdit = useCallback(
    (category: Category, isChild: boolean, parentName?: string) => {
      setEditing({ category, isChild, parentName });
      setForm({
        name: category.name,
        type: category.type,
        parentId: category.parentId != null ? String(category.parentId) : '',
        color: category.color ?? '#111111',
      });
      setFormError(null);
      setFormOpen(true);
    },
    [],
  );

  useEffect(() => {
    if (!editing) {
      if (!formOpen) setForm(emptyCategoryForm);
      return;
    }
    const c = editing.category;
    setForm({
      name: c.name,
      type: c.type,
      parentId: c.parentId != null ? String(c.parentId) : '',
      color: c.color ?? '#111111',
    });
  }, [editing, formOpen]);

  useLayoutEffect(() => {
    if (!data?.data.length || !listRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-cat]', {
        opacity: 0,
        y: 10,
        duration: 0.35,
        stagger: 0.04,
        ease: 'power2.out',
      });
    }, listRef);
    return () => ctx.revert();
  }, [data?.data, page, typeFilter]);

  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / 20));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = form.name.trim();
    if (!name) {
      setFormError('Nama kategori wajib.');
      return;
    }
    if (form.color && !/^#[0-9A-Fa-f]{6}$/.test(form.color)) {
      setFormError('Warna harus hex 6 digit, mis. #111111');
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.category.id,
          body: {
            name,
            color: form.color || undefined,
            parentId: form.parentId ? Number(form.parentId) : null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          type: form.type,
          color: form.color || undefined,
          parentId: form.parentId ? Number(form.parentId) : undefined,
        });
      }
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan kategori.',
      );
    }
  }

  async function onDeactivate(category: Category) {
    if (
      !window.confirm(
        `Nonaktifkan "${category.name}"? Laporan lama tetap valid.`,
      )
    ) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: category.id,
        body: { isActive: false },
      });
      if (editing?.category.id === category.id) closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menonaktifkan.',
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
    editing,
    parentOptions,
  };

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Label transaksi</p>
          <h1 className="page-h1 mt-1">{PAGE.categories}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Fleksibel dengan sub-kategori — pakai warna biar cepat dipindai.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} weight="bold" />
          {UI.addCategory}
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTypeFilter(t);
              setPage(1);
            }}
            className={[
              'btn-chip',
              typeFilter === t ? 'btn-chip-on' : 'btn-chip-off',
            ].join(' ')}
          >
            {t === 'all' ? UI.all : CATEGORY_TYPE_LABEL[t]}
          </button>
        ))}
        <span className="ml-auto text-xs text-mist uppercase">
          {isFetching ? UI.sync : `${data?.meta.total ?? 0} utama`}
        </span>
      </div>

      <section className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-mist/10" />
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
                Belum ada kategori.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="btn-primary mt-4"
              >
                {UI.addCategory}
              </button>
            </div>
          ) : (
            <div ref={listRef} className="space-y-4">
              {data.data.map((root) => (
                <article
                  key={root.id}
                  data-cat
                  className={[
                    'card overflow-hidden',
                    editing?.category.id === root.id ? 'ring-2 ring-brand' : '',
                  ].join(' ')}
                >
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="h-9 w-9 shrink-0 rounded-lg border border-mist/20"
                        style={{ backgroundColor: root.color ?? '#9aa0a6' }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold">
                          {root.name}
                        </p>
                        <p className="label-meta mt-0.5">
                          {CATEGORY_TYPE_LABEL[root.type]}
                          {(root.children?.length ?? 0) > 0
                            ? ` · ${root.children!.length} sub`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => startEdit(root, false)}
                        className="btn-ghost"
                      >
                        {UI.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeactivate(root)}
                        className="btn-hazard"
                      >
                        {UI.deactivate}
                      </button>
                    </div>
                  </div>

                  {(root.children?.length ?? 0) > 0 ? (
                    <ul className="border-t border-mist/10 bg-paper-deep/50">
                      {root.children!.map((child) => (
                        <li
                          key={child.id}
                          className={[
                            'flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-3',
                            editing?.category.id === child.id
                              ? 'bg-brand-soft'
                              : '',
                          ].join(' ')}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span
                              className="h-5 w-5 shrink-0 rounded-md border border-mist/20"
                              style={{
                                backgroundColor:
                                  child.color ?? root.color ?? '#9aa0a6',
                              }}
                            />
                            <p className="min-w-0 truncate text-sm font-semibold">
                              {child.name}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:flex">
                            <button
                              type="button"
                              onClick={() =>
                                startEdit(child, true, root.name)
                              }
                              className="btn-ghost"
                            >
                              {UI.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeactivate(child)}
                              className="btn-hazard"
                            >
                              {UI.deactivate}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
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
        title={editing ? 'Edit kategori' : UI.addCategory}
      >
        <CategoryForm {...formProps} compact />
      </FormOverlay>
    </div>
  );
}
