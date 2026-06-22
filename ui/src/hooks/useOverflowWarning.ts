import { useEffect, useRef, useState } from 'react';

const OVERFLOW_WARNING_DISMISSED_KEY = 'appshots:overflow-warning-dismissed';

function isOverflowWarningSuppressed(): boolean {
  try {
    return localStorage.getItem(OVERFLOW_WARNING_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function useOverflowWarning(hasOverflow: boolean) {
  const [open, setOpen] = useState(false);
  const [suppressed, setSuppressed] = useState(isOverflowWarningSuppressed);
  const prevOverflowRef = useRef(false);

  useEffect(() => {
    if (hasOverflow && !prevOverflowRef.current && !suppressed) {
      setOpen(true);
    }
    prevOverflowRef.current = hasOverflow;
  }, [hasOverflow, suppressed]);

  return {
    open,
    dismiss: (dontRemindAgain = false) => {
      setOpen(false);
      if (dontRemindAgain) {
        try {
          localStorage.setItem(OVERFLOW_WARNING_DISMISSED_KEY, '1');
        } catch {
          // ignore quota / private mode
        }
        setSuppressed(true);
      }
    },
  };
}
