import { useCallback, useRef, useState } from 'react';

/** Pause server preview renders while the user is dragging or scrubbing a slider. */
export function usePreviewHold() {
  const holdRef = useRef(0);
  const [held, setHeld] = useState(false);

  const hold = useCallback(() => {
    holdRef.current += 1;
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    holdRef.current = Math.max(0, holdRef.current - 1);
    if (holdRef.current === 0) setHeld(false);
  }, []);

  return { held, hold, release };
}
