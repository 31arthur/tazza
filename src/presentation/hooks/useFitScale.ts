import { useLayoutEffect, useRef, useState } from 'react';
import { GRID } from '@domain/services/PageGeometry';
import { PX_PER_MM } from '../lib/units';

/** Scale that makes an A3 page fill the width of the referenced container. */
export function useFitScale(padding = 48, max = 1.5) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - padding;
      setScale(Math.max(0.2, Math.min(max, available / (GRID.pageWidthMm * PX_PER_MM))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [padding, max]);

  return { ref, scale };
}
