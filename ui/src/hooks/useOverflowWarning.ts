import { useEffect, useRef, useState } from 'react';

export function useOverflowWarning(hasOverflow: boolean) {
  const [open, setOpen] = useState(false);
  const prevOverflowRef = useRef(false);

  useEffect(() => {
    if (hasOverflow && !prevOverflowRef.current) {
      setOpen(true);
    }
    prevOverflowRef.current = hasOverflow;
  }, [hasOverflow]);

  return {
    open,
    dismiss: () => setOpen(false),
  };
}
