import { useSelectedChild } from '@/features/dashboards/SelectedChild';

import { ChildPicker } from '../../ui/ChildPicker';
import { PageHeader } from '../../ui/Dashboard';
import { Screen } from '../../ui/Screen';
import { UploadPanel } from '../../ui/UploadPanel';

export default function ParentScan() {
  const { child } = useSelectedChild();
  const target = child ? { studentProfileId: child.id, displayName: child.displayName } : null;

  return (
    <Screen tabs>
      <UploadPanel
        target={target}
        header={
          <>
            <PageHeader title="Scan for your child" subtitle="Save a checked paper on your child's behalf." />
            <ChildPicker />
          </>
        }
      />
    </Screen>
  );
}
