"use client";

import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delayMs: number
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const debounced = useCallback(
    (...args: TArgs) => {
      cancel();
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    },
    [cancel, delayMs]
  );

  useEffect(() => cancel, [cancel]);

  return { debounced, cancel };
}
