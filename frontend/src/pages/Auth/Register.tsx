import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lightning, Spinner } from '@phosphor-icons/react';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api-client';

export function RegisterPage() {
  const { status, config, register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  if (config?.demo) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper-deep px-4 py-12">
        <div className="card w-full max-w-md p-6 text-center md:p-8">
          <p className="page-h1">Daftar ditutup</p>
          <p className="mt-2 text-sm text-mist">
            Demo memakai akun demo tetap. Gunakan akun demo untuk mencoba.
          </p>
          <Link to="/login" className="btn-primary mt-6">
            Kembali ke masuk
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(email, password, name || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal daftar. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper-deep px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white shadow-md">
            <Lightning size={24} weight="fill" />
          </span>
          <h1 className="page-h1 mt-4">Buat akun</h1>
          <p className="mt-1.5 text-sm text-mist">
            Mulai catat pemasukan &amp; pengeluaran.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6 md:p-8">
          {error ? (
            <p className="rounded-lg border border-hazard/25 bg-hazard/5 px-3 py-2 text-sm text-hazard">
              {error}
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <span className="label-meta">Nama</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
              placeholder="Nama kamu (opsional)"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="label-meta">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder="kamu@email.com"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="label-meta">Kata sandi</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="Minimal 8 karakter, huruf + angka"
            />
          </label>

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? (
              <>
                <Spinner size={16} weight="bold" className="animate-spin" />
                Mendaftar…
              </>
            ) : (
              'Daftar'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-mist">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-deep">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
