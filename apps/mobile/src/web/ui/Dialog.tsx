import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Modal sheet (bottom on phones, centred on wider screens). Escape or a tap outside closes it
 * unless `busy`. Focus moves into the dialog on open and back to where it was on close.
 */
export function Dialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const latestClose = useRef(onClose);
  const latestBusy = useRef(busy);
  useEffect(() => {
    latestClose.current = onClose;
    latestBusy.current = busy;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !latestBusy.current) latestClose.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={ref} className="dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
