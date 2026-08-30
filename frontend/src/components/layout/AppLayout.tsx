import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { List, X } from '@phosphor-icons/react';
import { AppNav } from './AppNav';

export function AppLayout() {
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' },
      );
    }, mainRef);
    return () => ctx.revert();
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden lg:flex-row">
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:shrink-0">
        <AppNav />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full">
            <AppNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 left-[17rem] grid h-9 w-9 place-items-center rounded-lg bg-white text-ink shadow-md"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-mist/15 bg-paper/90 px-4 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-mist/25 bg-white text-ink lg:hidden"
            aria-label="Buka menu"
          >
            <List size={18} weight="bold" />
          </button>
          <div className="flex items-center gap-2.5 py-3.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-brand lg:hidden">
              <span className="font-display text-sm font-bold">L</span>
            </span>
            <p className="text-sm text-mist">
              Ledger <span className="mx-1 text-mist/40">/</span>
              <span className="font-medium text-ink">Keuangan pribadi</span>
            </p>
          </div>
        </header>

        <main
          ref={mainRef}
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10"
        >
          <Outlet />
        </main>

        <footer className="border-t border-mist/15 px-4 py-5 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <p className="font-display text-base font-bold text-ink">Ledger</p>
            <p className="font-mono text-[0.65rem] tracking-wide text-mist/60 uppercase">
              Saldo dihitung live dari histori transaksi.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
