"use client";

import { useCallback, useState } from "react";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { celebrate } from "@/lib/native";

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
      opts?: {
        success?: string | ((result: T) => string);
        onDone?: (result: T) => void;
        celebrate?: boolean;
      },
    ): Promise<T | null> => {
      setState({ busy: true, error: null, success: null });
      try {
        const result = await fn();
        const success =
          typeof opts?.success === "function"
            ? opts.success(result)
            : (opts?.success ?? "OK");
        setState({
          busy: false,
          error: null,
          success,
        });
        if (opts?.celebrate !== false && opts?.success) celebrate();
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
      opts?: {
        success?: string | ((result: T) => string);
        onDone?: (result: T) => void;
        celebrate?: boolean;
      },
    ) => run(() => bffFetch<T>(path, init), opts),
    [run],
  );

  return { ...state, run, mutate, clear };
}
