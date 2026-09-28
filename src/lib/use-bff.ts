"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { bffFetch, BffError } from "@/lib/bff-fetch";
import { cacheBffGet, readCachedBffGet } from "@/lib/offline/bff-cache";

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  errorStatus: number | null;
  fromCache: boolean;
};

/**
 * Charge un endpoint JSON via le BFF.
 * Hors ligne : repli sur le dernier cache IndexedDB (parité prepare natif).
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
    fromCache: false,
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
      fromCache: false,
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
      void cacheBffGet(path, data);
      setState({
        data,
        loading: false,
        refreshing: false,
        error: null,
        errorStatus: null,
        fromCache: false,
      });
    } catch (e) {
      if (!aliveRef.current) return;
      const msg = e instanceof BffError ? e.message : (e as Error).message;
      const errorStatus = e instanceof BffError ? e.status : null;
      const networkFail =
        e instanceof BffError &&
        (e.status === 0 || e.code === "NETWORK_ERROR");
      if (networkFail) {
        const cached = await readCachedBffGet<T>(path);
        if (cached != null && aliveRef.current) {
          setState({
            data: cached,
            loading: false,
            refreshing: false,
            error: null,
            errorStatus: null,
            fromCache: true,
          });
          return;
        }
      }
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: msg,
        errorStatus,
        data: s.data,
        fromCache: s.fromCache,
      }));
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
