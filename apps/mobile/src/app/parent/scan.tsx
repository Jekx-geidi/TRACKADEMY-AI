import { ChildPicker } from '@/components/ChildPicker';
import { PageHeader } from '@/components/Dashboard';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Screen } from '@/components/Screen';
import { UploadPanel } from '@/components/UploadPanel';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';

export default function ParentScan() {
  const { child } = useSelectedChild();
  const target = child ? { studentProfileId: child.id, displayName: child.displayName } : null;

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
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
