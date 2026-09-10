"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bffFetch, BffError } from "@/lib/bff-fetch";

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  errorStatus: number | null;
};

/**
 * Charge un endpoint JSON via le BFF.
 */
export function useBff<T>(
  path: string | null,
): State<T> & { refresh: () => Promise<void> } {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: path != null,
    refreshing: false,
    error: null,
    errorStatus: null,
  });
  const aliveRef = useRef(true);
  const prevPathRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current === path) return;
    prevPathRef.current = path;
    setState({
      data: null,
      loading: path != null,
      refreshing: false,
      error: null,
      errorStatus: null,
    });
  }, [path]);

  const refresh = useCallback(async () => {
    if (!path) return;
    setState((s) => ({
      ...s,
      loading: s.data === null,
      refreshing: s.data !== null,
      error: null,
      errorStatus: null,
    }));
    try {
      const data = await bffFetch<T>(path);
      if (!aliveRef.current) return;
      setState({
        data,
        loading: false,
        refreshing: false,
        error: null,
        errorStatus: null,
      });
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = e instanceof BffError ? e.message : (e as Error).message;
      const errorStatus = e instanceof BffError ? e.status : null;
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: msg,
        errorStatus,
        data: s.data,
      }));
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
