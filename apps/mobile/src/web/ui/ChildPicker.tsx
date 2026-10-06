import { useNavigate } from 'react-router';

import { useSelectedChild } from '@/features/dashboards/SelectedChild';

import { Button } from './Button';
import { ChipSelect, EmptyCard, LoadGate } from './Dashboard';

/** Child selector for the parent tabs; shows how to link a child when there are none. */
export function ChildPicker() {
  const { children, child, select, error, loading, reload } = useSelectedChild();
  const navigate = useNavigate();

  return (
    <LoadGate loading={loading} error={error} hasData={children !== undefined} onRetry={reload}>
      {children && children.length === 0 ? (
        <>
          <EmptyCard icon="people-outline" title="No child linked yet" body="Link your child with their code, or add them yourself." />
          <Button label="Link a Child" icon="link-outline" variant="secondary" onPress={() => navigate('/parent/profile')} />
        </>
      ) : children && children.length > 1 ? (
        <ChipSelect label="Choose a child" options={children.map((c) => ({ value: c.id, label: c.displayName }))} value={child?.id ?? null} onChange={select} />
      ) : null}
    </LoadGate>
  );
}
