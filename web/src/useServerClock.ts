import { useCallback, useEffect, useRef, useState } from 'react';

/** Returns a `now()` corrected by the offset between this device and the server. */
export function useServerClock(serverNow: string | undefined): () => Date {
  const offset = useRef(0);
  useEffect(() => {
    if (serverNow) offset.current = Date.parse(serverNow) - Date.now();
  }, [serverNow]);
  return useCallback(() => new Date(Date.now() + offset.current), []);
}

/** Calls `fn` when the tab becomes visible again or the window regains focus. */
export function useRefetchOnFocus(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') ref.current();
    };
    const onFocus = () => ref.current();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);
}

/** Re-renders every `ms` milliseconds while `active`. */
export function useTick(active: boolean, ms = 1000) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
