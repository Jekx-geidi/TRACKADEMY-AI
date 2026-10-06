import { loadStudentOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

import { RecordsList } from '../../ui/RecordsList';

export default function StudentRecords() {
  const { data, error, loading, reload } = useLoad(loadStudentOverview);
  return (
    <RecordsList
      title="Records"
      subtitle="Every paper you saved, newest first."
      records={data?.records}
      error={error}
      loading={loading}
      reload={reload}
    />
  );
}
