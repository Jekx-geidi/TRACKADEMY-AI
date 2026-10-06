import { useState } from 'react';

import { ASSESSMENT_TYPE_LABELS, ASSESSMENT_TYPES, QUARTER_LABELS, QUARTERS, type AssessmentType, type Quarter } from '@/features/assessments/constants';
import { listWork, type WorkItem } from '@/features/student/api';
import { WORK_STATUS_LABEL, type WorkFilter } from '@/features/student/work';
import { useLoad } from '@/lib/useLoad';

import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { Screen } from '../../ui/Screen';
import { WorkRow } from '../../ui/WorkRow';

const STATUS_OPTIONS = (Object.entries(WORK_STATUS_LABEL) as [Exclude<WorkFilter, '' | 'SUBMITTED' | 'LACKING'>, string][]).map(([value, label]) => ({ value, label }));
const QUARTER_OPTIONS = QUARTERS.map((value) => ({ value, label: QUARTER_LABELS[value] }));
const TYPE_OPTIONS = ASSESSMENT_TYPES.map((value) => ({ value, label: ASSESSMENT_TYPE_LABELS[value] }));

/** All student records and missing work. Scores stay inside this screen, not a sixth tab. */
export default function StudentWork() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<WorkFilter>('');
  const [quarter, setQuarter] = useState<Quarter | ''>('');
  const [type, setType] = useState<AssessmentType | ''>('');
  const [page, setPage] = useState(0);
  const query = { search, status, quarter, type, page };
  const { data, error, loading, reload } = useLoad(() => listWork(query), JSON.stringify(query));
  const change = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(0); };

  return (
    <Screen tabs>
      <PageHeader title="My Work" subtitle="Your submitted papers, scores, and work still needing attention." />
      <ListToolbar
        search={<SearchInput value={search} onChange={change(setSearch)} placeholder="Search your work" />}
        activeFilters={(status ? 1 : 0) + (quarter ? 1 : 0) + (type ? 1 : 0)}
        filters={<>
          <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" onChange={change(setStatus)} />
          <FilterSelect label="Quarter" value={quarter} options={QUARTER_OPTIONS} allLabel="All quarters" onChange={change(setQuarter)} />
          <FilterSelect label="Type" value={type} options={TYPE_OPTIONS} allLabel="All types" onChange={change(setType)} />
        </>}
      />
      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {data?.rows.length === 0 ? <EmptyCard icon="folder-open-outline" title="No work found" body="Your teacher's assessments and your uploads appear here." /> : null}
        {data?.rows.length ? <Card className="list-card">{data.rows.map((item: WorkItem) => <WorkRow key={item.assessment_id} item={item} showClass />)}</Card> : null}
        {data ? <Pagination page={page} total={data.total} onPage={setPage} /> : null}
      </LoadGate>
    </Screen>
  );
}
