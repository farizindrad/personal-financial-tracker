import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { Plus, TrendDown, TrendUp } from '@phosphor-icons/react';
import { FormOverlay } from '../../components/ui/FormOverlay';
import { ApiError } from '../../lib/api-client';
import {
  useAssets,
  useCreateAsset,
  useDeleteAsset,
  useUpdateAsset,
} from '../../hooks/useAssets';
import {
  useLiabilities,
  useCreateLiability,
  useDeleteLiability,
  useUpdateLiability,
} from '../../hooks/useLiabilities';
import { useDashboardSummary } from '../../hooks/useDashboardSummary';
import { formatIdr } from '../../lib/format';
import { ASSET_TYPES, LIABILITY_TYPES, PAGE, UI } from '../../lib/labels';
import type { Asset } from '../../types/assets';
import type { Liability } from '../../types/liabilities';
import { AssetForm, emptyAssetForm, type AssetFormValues } from './AssetForm';
import { LiabilityForm, emptyLiabilityForm, type LiabilityFormValues } from './LiabilityForm';

type Tab = 'assets' | 'liabilities';

export function AssetsPage() {
  const [tab, setTab] = useState<Tab>('assets');
  const [editing, setEditing] = useState<Asset | Liability | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [assetForm, setAssetForm] = useState<AssetFormValues>(emptyAssetForm);
  const [liabilityForm, setLiabilityForm] = useState<LiabilityFormValues>(
    emptyLiabilityForm,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: summary } = useDashboardSummary();
  const assets = useAssets();
  const liabilities = useLiabilities();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const deleteLiability = useDeleteLiability();

  const saving =
    createAsset.isPending ||
    updateAsset.isPending ||
    deleteAsset.isPending ||
    createLiability.isPending ||
    updateLiability.isPending ||
    deleteLiability.isPending;

  const openCreate = () => {
    setEditing(null);
    setAssetForm(emptyAssetForm);
    setLiabilityForm(emptyLiabilityForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditAsset = (asset: Asset) => {
    setEditing(asset);
    setAssetForm({
      name: asset.name,
      type: asset.type,
      value: String(Number(asset.value)),
      notes: asset.notes ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEditLiability = (liability: Liability) => {
    setEditing(liability);
    setLiabilityForm({
      name: liability.name,
      type: liability.type,
      amount: String(Number(liability.amount)),
      notes: liability.notes ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setAssetForm(emptyAssetForm);
    setLiabilityForm(emptyLiabilityForm);
    setFormError(null);
    setFormOpen(false);
  };

  useLayoutEffect(() => {
    if (gridRef.current) {
      const ctx = gsap.context(() => {
        gsap.from('[data-item]', {
          opacity: 0,
          y: 12,
          duration: 0.4,
          stagger: 0.04,
          ease: 'power2.out',
        });
      }, gridRef);
      return () => ctx.revert();
    }
  }, [tab, assets.data, liabilities.data]);

  async function onSubmitAsset(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = assetForm.name.trim();
    if (!name) {
      setFormError('Nama aset wajib diisi.');
      return;
    }
    if (assetForm.value === '') {
      setFormError('Nilai wajib diisi.');
      return;
    }
    const body = {
      name,
      type: assetForm.type,
      value: Number(assetForm.value),
      notes: assetForm.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateAsset.mutateAsync({ id: editing.id, body });
      } else {
        await createAsset.mutateAsync(body);
      }
      closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menyimpan aset.');
    }
  }

  async function onSubmitLiability(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const name = liabilityForm.name.trim();
    if (!name) {
      setFormError('Nama kewajiban wajib diisi.');
      return;
    }
    if (liabilityForm.amount === '') {
      setFormError('Nominal wajib diisi.');
      return;
    }
    const body = {
      name,
      type: liabilityForm.type,
      amount: Number(liabilityForm.amount),
      notes: liabilityForm.notes.trim() || undefined,
    };
    try {
      if (editing) {
        await updateLiability.mutateAsync({ id: editing.id, body });
      } else {
        await createLiability.mutateAsync(body);
      }
      closeForm();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Gagal menyimpan kewajiban.',
      );
    }
  }

  async function onDelete(record: Asset | Liability) {
    const kind = tab === 'assets' ? 'aset' : 'kewajiban';
    if (!window.confirm(`Hapus ${kind} "${record.name}"?`)) return;
    try {
      if (tab === 'assets') {
        await deleteAsset.mutateAsync(record.id);
      } else {
        await deleteLiability.mutateAsync(record.id);
      }
      if (editing?.id === record.id) closeForm();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    }
  }

  const netWorth = summary ? Number(summary.netWorth) : null;
  const assetTotal = summary ? Number(summary.assetTotal) : null;
  const liabilityTotal = summary ? Number(summary.liabilityTotal) : null;

  return (
    <div className="w-full max-w-full space-y-8 md:space-y-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="label-meta">Kekayaan bersih</p>
          <h1 className="page-h1 mt-1">{PAGE.assets}</h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            Net worth = saldo akun + nilai aset − kewajiban.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} weight="bold" />
          Tambah {tab === 'assets' ? 'aset' : 'kewajiban'}
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <article className="card-ink col-span-1 flex flex-col justify-between p-6 md:col-span-3">
          <p className="text-xs font-medium tracking-wide text-white/60 uppercase">
            Net worth
          </p>
          <p className="mt-2 font-display text-[clamp(1.75rem,5vw,3rem)] font-bold text-white">
            {netWorth != null ? formatIdr(netWorth) : '…'}
          </p>
        </article>
        <article className="card flex items-center justify-between gap-3 p-5">
          <div>
            <p className="label-meta">Saldo akun</p>
            <p className="amount-plain mt-1 text-xl md:text-2xl">
              {formatIdr(summary?.totalBalance ?? 0)}
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
            <TrendUp size={18} weight="bold" />
          </span>
        </article>
        <article className="card flex items-center justify-between gap-3 p-5">
          <div>
            <p className="label-meta">Total aset</p>
            <p className="amount-pos mt-1 text-xl md:text-2xl">
              {assetTotal != null ? formatIdr(assetTotal) : '…'}
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint-soft text-mint">
            <TrendUp size={18} weight="bold" />
          </span>
        </article>
        <article className="card flex items-center justify-between gap-3 p-5">
          <div>
            <p className="label-meta">Total kewajiban</p>
            <p className="amount-neg mt-1 text-xl md:text-2xl">
              {liabilityTotal != null ? formatIdr(liabilityTotal) : '…'}
            </p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-hazard/10 text-hazard">
            <TrendDown size={18} weight="bold" />
          </span>
        </article>
      </section>

      <section className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab('assets')}
            className={['btn-chip', tab === 'assets' ? 'btn-chip-on' : 'btn-chip-off'].join(' ')}
          >
            Aset
          </button>
          <button
            type="button"
            onClick={() => setTab('liabilities')}
            className={['btn-chip', tab === 'liabilities' ? 'btn-chip-on' : 'btn-chip-off'].join(' ')}
          >
            Kewajiban
          </button>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tab === 'assets'
            ? (assets.data?.data ?? []).map((asset) => (
                <article key={asset.id} data-item className="card flex flex-col justify-between p-5">
                  <div>
                    <p className="label-meta">
                      {ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight">{asset.name}</h3>
                  </div>
                  <p className="amount-plain mt-5 text-2xl">{formatIdr(asset.value)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => openEditAsset(asset)} className="btn-primary">
                      {UI.edit}
                    </button>
                    <button type="button" onClick={() => void onDelete(asset)} className="btn-hazard">
                      {UI.delete}
                    </button>
                  </div>
                </article>
              ))
            : (liabilities.data?.data ?? []).map((liability) => (
                <article key={liability.id} data-item className="card flex flex-col justify-between p-5">
                  <div>
                    <p className="label-meta">
                      {LIABILITY_TYPES.find((t) => t.value === liability.type)?.label ?? liability.type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight">{liability.name}</h3>
                  </div>
                  <p className="amount-neg mt-5 text-2xl">{formatIdr(liability.amount)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => openEditLiability(liability)} className="btn-primary">
                      {UI.edit}
                    </button>
                    <button type="button" onClick={() => void onDelete(liability)} className="btn-hazard">
                      {UI.delete}
                    </button>
                  </div>
                </article>
              ))}
        </div>

        {tab === 'assets' && assets.isError ? (
          <p className="rounded-xl border border-hazard/30 bg-hazard/5 px-5 py-8 text-sm text-hazard">
            Gagal memuat aset.
          </p>
        ) : null}
        {tab === 'liabilities' && liabilities.isError ? (
          <p className="rounded-xl border border-hazard/30 bg-hazard/5 px-5 py-8 text-sm text-hazard">
            Gagal memuat kewajiban.
          </p>
        ) : null}
      </section>

      <FormOverlay
        open={formOpen}
        onClose={closeForm}
        title={
          editing
            ? `Edit ${tab === 'assets' ? 'aset' : 'kewajiban'}`
            : `Tambah ${tab === 'assets' ? 'aset' : 'kewajiban'}`
        }
      >
        {tab === 'assets' ? (
          <AssetForm
            values={assetForm}
            onChange={setAssetForm}
            onSubmit={onSubmitAsset}
            onCancel={closeForm}
            error={formError}
            saving={saving}
            editing={Boolean(editing)}
          />
        ) : (
          <LiabilityForm
            values={liabilityForm}
            onChange={setLiabilityForm}
            onSubmit={onSubmitLiability}
            onCancel={closeForm}
            error={formError}
            saving={saving}
            editing={Boolean(editing)}
          />
        )}
      </FormOverlay>
    </div>
  );
}
