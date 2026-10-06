import { useState } from 'react';
import { Link } from 'react-router';

import {
  inviteLink,
  listSections,
  listStudents,
  MEMBER_STATUS_LABELS,
  MEMBER_STATUSES,
  type MemberStatus,
  type Page,
  type SectionRow,
  type StudentSort,
} from '@/features/teacher/api';
import { useLoad, type Loaded } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { StatusBadge } from '../../ui/Charts';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { RowAction } from '../../ui/NotificationList';
import { Notice, Screen } from '../../ui/Screen';
import { SelectField } from '../../ui/SelectField';
import { Spinner } from '../../ui/Spinner';

import './people.css';

const STATUS_OPTIONS = MEMBER_STATUSES.map((s) => ({ value: s, label: MEMBER_STATUS_LABELS[s] }));
const STATUS_TONE = { ACTIVE: 'success', INACTIVE: 'warning', REMOVED: 'neutral' } as const;
const SORT_OPTIONS: readonly { value: StudentSort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'section', label: 'Section' },
  { value: 'newest', label: 'Newest' },
  { value: 'missing', label: 'Most missing' },
];

/** Teacher Students (PRD v0.5 §23–§26): who belongs to my classes. */
export default function TeacherStudents() {
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState<MemberStatus | ''>('');
  const [sort, setSort] = useState<StudentSort>('name');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);

  // The first 20 sections are enough for the filter and the invite dialog.
  const sections = useLoad(() => listSections({ page: 0 }), 'sections');
  const { data, error, loading, reload } = useLoad(
    () => listStudents({ search, classId, status, sort, page }),
    JSON.stringify({ search, classId, status, sort, page }),
  );

  /** Every filter change starts again from the first page. */
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };

  const sectionOptions = (sections.data?.rows ?? []).map((s) => ({ value: s.id, label: s.name }));
  const rows = data?.rows ?? [];

  return (
    <Screen tabs>
      <PageHeader title="Students" subtitle="Who belongs to your classes." />
      <Button label="+ Add Student" icon="person-add-outline" onPress={() => setAdding(true)} />

      <ListToolbar
        search={<SearchInput value={search} onChange={change(setSearch)} placeholder="Search students" />}
        activeFilters={[classId, status].filter(Boolean).length}
        filters={
          <>
            <FilterSelect label="Section" value={classId} options={sectionOptions} allLabel="All sections" onChange={change(setClassId)} />
            <FilterSelect label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" onChange={change(setStatus)} />
            <FilterSelect label="Sort by" value={sort} options={SORT_OPTIONS} onChange={(value) => change(setSort)(value || 'name')} />
          </>
        }
      />

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {rows.length === 0 ? (
          <EmptyCard
            icon="people-outline"
            title={search || classId || status ? 'No students match.' : 'No students yet.'}
            body={search || classId || status ? 'Try another search or filter.' : 'Share a section’s join code or invite link with + Add Student.'}
          />
        ) : (
          <Card className="list-card">
            {rows.map((s) => (
              <Link key={`${s.student_profile_id}:${s.class_id}`} to={`/teacher/students/${s.student_profile_id}`} className="person-row">
                <div className="person-text">
                  <span className="person-name ellipsis">{s.display_name}</span>
                  <span className="person-meta">
                    {s.class_name} · {s.subject_count} {s.subject_count === 1 ? 'Subject' : 'Subjects'}
                  </span>
                  <span className="badges">
                    <StatusBadge label={MEMBER_STATUS_LABELS[s.status]} tone={STATUS_TONE[s.status]} />
                    {s.missing_count > 0 ? <StatusBadge label={`${s.missing_count} missing`} tone="danger" /> : null}
                  </span>
                </div>
                <Icon name="chevron-forward" size={20} className="chevron" />
              </Link>
            ))}
          </Card>
        )}
        <Pagination page={page} total={data?.total ?? 0} onPage={setPage} />
      </LoadGate>

      {adding ? <AddStudentDialog sections={sections} onClose={() => setAdding(false)} /> : null}
    </Screen>
  );
}

/**
 * Students join themselves with the section's code or invite link (PRD v0.3 §9); the
 * teacher picks a section and shares one of them. The link is preferred.
 */
function AddStudentDialog({ sections, onClose }: { sections: Loaded<Page<SectionRow>>; onClose: () => void }) {
  const rows = sections.data?.rows ?? [];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const section = rows.find((s) => s.id === pickedId) ?? (rows.length === 1 ? rows[0] : undefined);

  const copy = async (what: string, text: string) => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
      setCopyError(true);
    }
  };

  return (
    <Dialog title="Add a student" onClose={onClose}>
      <p className="dialog-text">Send the student the invite link (easiest), or give them the 6-digit join code to type in the app.</p>
      {sections.data === undefined ? (
        sections.error ? (
          <Notice tone="danger" title="Could not load your sections">
            {sections.error}
          </Notice>
        ) : (
          <Spinner />
        )
      ) : rows.length === 0 ? (
        <Notice tone="info" title="No section yet">
          Create a section in the Sections tab first.
        </Notice>
      ) : (
        <>
          <SelectField
            label="Section"
            icon="school-outline"
            value={section?.id ?? null}
            options={rows.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Choose a section"
            onChange={(id) => {
              setPickedId(id);
              setCopied(null);
            }}
          />
          {section ? (
            <div className="invite-box">
              <span className="field-label">Invite link</span>
              <span className="invite-link">{inviteLink(section.join_code)}</span>
              <div className="row-actions">
                <RowAction label={copied === 'link' ? 'Link copied' : 'Copy link'} icon="link-outline" tone="primary" onPress={() => copy('link', inviteLink(section.join_code))} />
              </div>
              <span className="field-label">Join code</span>
              <span className="invite-code" aria-label={`Join code ${section.join_code.split('').join(' ')}`}>
                {section.join_code}
              </span>
              <div className="row-actions">
                <RowAction label={copied === 'code' ? 'Code copied' : 'Copy code'} icon="copy-outline" onPress={() => copy('code', section.join_code)} />
              </div>
            </div>
          ) : null}
          {copyError ? (
            <Notice tone="warning" title="Could not copy">
              Select the text and copy it yourself.
            </Notice>
          ) : null}
        </>
      )}
      <Button label="Done" variant="secondary" onPress={onClose} />
    </Dialog>
  );
}
