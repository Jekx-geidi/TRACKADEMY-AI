import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Loaded<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data whenever the screen is focused, and again when `key` changes (e.g. the selected
 * child). Keeps the last data on error.
 */
export function useLoad<T>(load: () => Promise<T>, key: string | null = null): Loaded<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const run = useRef(0);
  const latest = useRef(load);
  useEffect(() => {
    latest.current = load;
  });

  const reload = useCallback(() => {
    const id = ++run.current;
    setLoading(true);
    latest.current().then(
      (next) => {
        if (id !== run.current) return;
        setData(next);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (id !== run.current) return;
        setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
        setLoading(false);
      },
    );
    // `key` is the caller's signal to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        run.current++;
      };
    }, [reload]),
  );

  return { data, error, loading, reload };
}
