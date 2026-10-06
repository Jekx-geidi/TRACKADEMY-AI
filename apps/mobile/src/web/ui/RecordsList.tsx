import type { ReactNode } from 'react';

import type { EvidenceRecord } from '@/features/evidence/schema';

import { Button } from './Button';
import { Card } from './Card';
import { EmptyCard, LoadGate, PageHeader, RecordRow } from './Dashboard';
import { Screen } from './Screen';

/** Full-page list of papers for a tab. */
export function RecordsList({
  title,
  subtitle,
  records,
  error,
  loading,
  reload,
  showStudent = false,
  header,
  emptyBody = 'Papers you upload will be listed here.',
}: {
  title: string;
  subtitle?: string;
  records: EvidenceRecord[] | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
  showStudent?: boolean;
  header?: ReactNode;
  emptyBody?: string;
}) {
  return (
    <Screen tabs>
      <PageHeader title={title} subtitle={subtitle} />
      {header}
      <LoadGate loading={loading} error={error} hasData={records !== undefined} onRetry={reload}>
        {records?.length === 0 ? <EmptyCard icon="folder-open-outline" title="No records yet" body={emptyBody} /> : null}
      </LoadGate>
      {records?.map((r) => (
        <Card key={r.id} style={{ paddingTop: 4, paddingBottom: 4 }}>
          <RecordRow record={r} showStudent={showStudent} />
        </Card>
      ))}
      {records && records.length > 0 ? <Button label="Refresh" icon="refresh" variant="ghost" onPress={reload} loading={loading} /> : null}
    </Screen>
  );
}
