import { useCallback, useEffect, useRef, useState } from "react";

type Loaded<T> = { key: string; data: T | null; error: string | null };

/**
 * Loads `load()` whenever `key` changes. A result is filed under the key it was
 * loaded for, so when the key moves on (another week, another org) the old
 * result simply stops counting and the caller sees a loading state, without an
 * effect having to clear anything first. Late answers for an old key are
 * dropped.
 */
export function useLoad<T>(key: string, load: () => Promise<T>) {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;

    loadRef
      .current()
      .then((data) => {
        if (!cancelled) setLoaded({ key, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setLoaded({ key, data: null, error: err instanceof Error ? err.message : "Couldn't load this" });
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  /** Edit the loaded data in place, e.g. after saving one item of it. */
  const update = useCallback((change: (data: T) => T) => {
    setLoaded((current) => (current?.data ? { ...current, data: change(current.data) } : current));
  }, []);

  const current = loaded?.key === key ? loaded : null;
  return { data: current?.data ?? null, error: current?.error ?? null, update };
}

export const weekKey = (week: { season: number; seasonType: number; week: number } | null) =>
  week ? `${week.season}-${week.seasonType}-${week.week}` : "current";
