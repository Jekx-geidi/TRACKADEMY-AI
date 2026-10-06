import { loadChildRecords } from '@/features/dashboards/loaders';
import { useSelectedChild } from '@/features/dashboards/SelectedChild';
import { useLoad } from '@/lib/useLoad';

import { ChildPicker } from '../../ui/ChildPicker';
import { RecordsList } from '../../ui/RecordsList';

/** Parent archive: linked child's evidence and verified scores only. */
export default function ParentRecords() {
  const { child } = useSelectedChild();
  const childId = child?.id ?? null;
  const { data, error, loading, reload } = useLoad(async () => childId ? loadChildRecords(childId) : [], childId);
  return <RecordsList title="Records" subtitle={child ? `${child.displayName}'s saved papers and scores.` : 'Choose a child to view records.'} records={child ? data : []} error={error} loading={loading} reload={reload} header={<ChildPicker />} emptyBody="Saved papers and teacher-verified scores appear here." />;
}
