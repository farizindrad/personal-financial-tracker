import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;

      const nodes = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 md:hidden" role="presentation">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col border-t border-mist/15 bg-paper shadow-2xl transition-transform duration-500 will-change-transform"
        style={{
          transitionTimingFunction: EASE,
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: `sheet-up 0.5s ${EASE} both`,
        }}
      >
        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-mist/15 px-4 py-4">
          <div
            aria-hidden
            className="absolute top-2 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-mist/25"
          />
          <h2 id={titleId} className="font-display text-lg font-bold text-ink">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost px-3">
            Tutup
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0.7; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body,
  );
}
