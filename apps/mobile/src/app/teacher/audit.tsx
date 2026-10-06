import { Notice } from '@/components/Screen';
import { RecordsList } from '@/components/RecordsList';
import { loadTeacherOverview } from '@/features/dashboards/loaders';
import { useLoad } from '@/lib/useLoad';

export default function TeacherAudit() {
  const { data, error, loading, reload } = useLoad(loadTeacherOverview);

  return (
    <RecordsList
      title="Audit"
      subtitle="Every paper submitted for your assessment codes, newest first."
      records={data?.submissions}
      error={error}
      loading={loading}
      reload={reload}
      showStudent
      emptyBody="Papers students upload for your codes will be listed here."
      header={
        <Notice title="Verifying papers is coming next">
          For now you can see what was submitted, by whom, and the score they entered.
        </Notice>
      }
    />
  );
}
