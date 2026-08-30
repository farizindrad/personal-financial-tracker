import { useLayoutEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Lightning, SignOut } from '@phosphor-icons/react';
import { NAV_SECTIONS } from '../../lib/nav';
import { useAuth } from '../../lib/auth';

type AppNavProps = {
  onNavigate?: () => void;
};

export function AppNav({ onNavigate }: AppNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, {
        x: -12,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      });
    }, navRef);
    return () => ctx.revert();
  }, []);

  return (
    <aside
      ref={navRef}
      className="flex h-full w-64 shrink-0 flex-col border-r border-mist/15 bg-paper"
    >
      <NavLink
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 py-5"
      >
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white shadow-sm">
          <Lightning size={20} weight="fill" />
        </span>
        <span className="font-display text-lg font-bold text-ink">Ledger</span>
      </NavLink>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 pt-2 text-[0.65rem] font-semibold tracking-wider text-mist/70 uppercase">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  ['nav-link', isActive ? 'nav-link-active' : ''].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-mist/15 px-5 py-4">
        {user ? (
          <p className="truncate text-xs text-mist">
            <span className="font-semibold text-ink">{user.name ?? user.email}</span>
            {user.name ? <span className="block truncate">{user.email}</span> : null}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void logout().then(() => navigate('/login', { replace: true }));
            onNavigate?.();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-paper-deep hover:text-ink"
        >
          <SignOut size={16} weight="bold" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
