import { useCallback, useState, type PointerEvent } from 'react';

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

/** Spawns a Material-style expanding ripple from the pointer position on click. */
export function useRipple() {
  const [ripples, setRipples] = useState<RippleItem[]>([]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const id = Date.now() + Math.random();

    setRipples((current) => [
      ...current,
      { id, x: event.clientX - rect.left - size / 2, y: event.clientY - rect.top - size / 2, size },
    ]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 650);
  }, []);

  return { ripples, onPointerDown };
}
