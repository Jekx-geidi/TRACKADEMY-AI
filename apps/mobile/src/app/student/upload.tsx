import { PageHeader } from '@/components/Dashboard';
import { TAB_BAR_SPACE } from '@/components/RoleTabBar';
import { Notice, Screen } from '@/components/Screen';
import { UploadPanel } from '@/components/UploadPanel';
import { useLoad } from '@/lib/useLoad';
import { getMyStudentProfile } from '@/services/api/students';

export default function StudentUpload() {
  const { data: me, error } = useLoad(getMyStudentProfile);
  const target = me ? { studentProfileId: me.id, displayName: me.displayName } : null;

  return (
    <Screen topInset bottomSpace={TAB_BAR_SPACE}>
      <UploadPanel
        target={target}
        header={
          <>
            <PageHeader title="Upload Score" subtitle="Save a photo of your checked paper." />
            {error ? (
              <Notice tone="danger" title="Could not load your account">
                {error}
              </Notice>
            ) : null}
          </>
        }
      />
    </Screen>
  );
}
