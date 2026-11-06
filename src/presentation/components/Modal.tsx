import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class for the card. */
  widthClass?: string;
}

/** A simple centred dialog: click the backdrop, press Escape, or use the close button. */
export function Modal({ title, onClose, children, widthClass = 'max-w-4xl' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-full w-full ${widthClass} flex-col overflow-hidden rounded-lg border bg-card shadow-xl`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
