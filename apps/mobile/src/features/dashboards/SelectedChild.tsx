import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useLoad } from '@/lib/useLoad';
import type { StudentProfile } from '@/services/api/students';

import { loadChildren } from './loaders';

interface SelectedChildValue {
  children: StudentProfile[] | undefined;
  child: StudentProfile | null;
  select: (id: string) => void;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

const SelectedChildContext = createContext<SelectedChildValue | null>(null);

/** The parent's linked children and which one the parent tabs are showing. */
export function SelectedChildProvider({ children: node }: { children: ReactNode }) {
  const { data, error, loading, reload } = useLoad(loadChildren);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const value = useMemo<SelectedChildValue>(() => {
    const child = data?.find((c) => c.id === selectedId) ?? data?.[0] ?? null;
    return { children: data, child, select: setSelectedId, error, loading, reload };
  }, [data, selectedId, error, loading, reload]);

  return <SelectedChildContext.Provider value={value}>{node}</SelectedChildContext.Provider>;
}

export function useSelectedChild(): SelectedChildValue {
  const value = useContext(SelectedChildContext);
  if (!value) throw new Error('useSelectedChild must be used inside SelectedChildProvider');
  return value;
}
