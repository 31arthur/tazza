import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  /** The button text, with an optional leading icon. */
  label: ReactNode;
  children: ReactNode;
  /** Tailwind width class for the panel. */
  widthClass?: string;
  align?: 'left' | 'right';
  /** A small count or marker shown after the label. */
  badge?: ReactNode;
  variant?: 'outline' | 'ghost' | 'secondary' | 'default';
}

/** A button that opens a floating panel; click outside or press Escape to close. */
export function Popover({ label, children, widthClass = 'w-72', align = 'left', badge, variant = 'outline' }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <Button size="sm" variant={variant} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>
        {label}
        {badge}
        <ChevronDown className="size-3.5 opacity-60" />
      </Button>
      {open && (
        <div
          role="dialog"
          className={`absolute top-full z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border bg-card p-3 shadow-lg ${widthClass} ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
