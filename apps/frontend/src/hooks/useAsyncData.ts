import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  key: string;
  data?: T;
  error?: unknown;
}

interface AsyncData<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => Promise<void>;
}

// Runs the loader on mount and whenever `deps` (primitives only) change. Stale responses are ignored.
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: (string | number | boolean | undefined)[],
): AsyncData<T> {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<AsyncState<T>>({ key: '' });
  const loaderRef = useRef(loader);
  const latestKey = useRef(key);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const reload = useCallback(async () => {
    try {
      const data = await loaderRef.current();
      if (latestKey.current === key) setState({ key, data });
    } catch (error) {
      if (latestKey.current === key) setState((previous) => ({ key, data: previous.data, error }));
    }
  }, [key]);

  useEffect(() => {
    latestKey.current = key;
    void reload();
  }, [key, reload]);

  const current = state.key === key;

  return {
    data: state.data,
    error: current ? state.error : undefined,
    loading: !current,
    reload,
  };
}
