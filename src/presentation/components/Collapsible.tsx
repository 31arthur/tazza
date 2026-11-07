import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** A titled section that opens and closes, so rarely used controls stay out of the way. */
export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-lg border bg-background">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="flex flex-col gap-3 border-t p-3">{children}</div>
    </details>
  );
}
