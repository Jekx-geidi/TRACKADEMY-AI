import { useLoad } from '@/lib/useLoad';
import { getMyStudentProfile } from '@/services/api/students';

import { PageHeader } from '../../ui/Dashboard';
import { Notice, Screen } from '../../ui/Screen';
import { UploadPanel } from '../../ui/UploadPanel';

export default function StudentUpload() {
  const { data: me, error } = useLoad(getMyStudentProfile);
  const target = me ? { studentProfileId: me.id, displayName: me.displayName } : null;

  return (
    <Screen tabs>
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
