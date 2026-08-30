import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lightning, Spinner } from '@phosphor-icons/react';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api-client';

export function LoginPage() {
  const { status, config, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal masuk. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function fillDemo() {
    if (!config?.demoEmail) return;
    setEmail(config.demoEmail);
    setPassword('demo1234');
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper-deep px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white shadow-md">
            <Lightning size={24} weight="fill" />
          </span>
          <h1 className="page-h1 mt-4">Masuk ke Ledger</h1>
          <p className="mt-1.5 text-sm text-mist">
            Kelola keuangan pribadi — satu tempat.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6 md:p-8">
          {config?.demo ? (
            <button
              type="button"
              onClick={() => void fillDemo()}
              className="w-full rounded-lg border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:bg-brand/10"
            >
              Isi akun demo ({config.demoEmail})
            </button>
          ) : null}

          {config?.demo ? (
            <p className="text-center font-mono text-[0.65rem] tracking-wide text-mist/60 uppercase">
              Demo · password demo1234
            </p>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-hazard/25 bg-hazard/5 px-3 py-2 text-sm text-hazard">
              {error}
            </p>
          ) : null}

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" disabled={busy || status === 'loading'} className="btn-primary w-full">
            {busy ? (
              <>
                <Spinner size={16} weight="bold" className="animate-spin" />
                Masuk…
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        {!config?.demo ? (
          <p className="mt-6 text-center text-sm text-mist">
            Belum punya akun?{' '}
            <Link to="/register" className="font-semibold text-brand hover:text-brand-deep">
              Daftar
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
