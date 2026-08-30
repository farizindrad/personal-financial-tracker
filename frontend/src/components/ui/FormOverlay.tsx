import { useEffect, useState, type ReactNode } from 'react';
import { Drawer } from './Drawer';
import { Sheet } from './Sheet';

type FormOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Mobile = bottom Sheet; md+ = right Drawer. */
export function FormOverlay({
  open,
  onClose,
  title,
  children,
}: FormOverlayProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  if (isMobile) {
    return (
      <Sheet open={open} onClose={onClose} title={title}>
        {children}
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onClose={onClose} title={title}>
      {children}
    </Drawer>
  );
}
