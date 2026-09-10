"use client";

import { useCallback, useState } from "react";
import { bffFetch, BffError } from "@/lib/bff-fetch";

type ActionState = {
  busy: boolean;
  error: string | null;
  success: string | null;
};

export function useAction() {
  const [state, setState] = useState<ActionState>({
    busy: false,
    error: null,
    success: null,
  });

  const clear = useCallback(() => {
    setState((s) => ({ ...s, error: null, success: null }));
  }, []);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      opts?: { success?: string; onDone?: (result: T) => void },
    ): Promise<T | null> => {
      setState({ busy: true, error: null, success: null });
      try {
        const result = await fn();
        setState({
          busy: false,
          error: null,
          success: opts?.success ?? "OK",
        });
        opts?.onDone?.(result);
        return result;
      } catch (e) {
        const msg = e instanceof BffError ? e.message : (e as Error).message;
        setState({ busy: false, error: msg, success: null });
        return null;
      }
    },
    [],
  );

  const mutate = useCallback(
    <T,>(
      path: string,
      init?: RequestInit,
      opts?: { success?: string; onDone?: (result: T) => void },
    ) => run(() => bffFetch<T>(path, init), opts),
    [run],
  );

  return { ...state, run, mutate, clear };
}
