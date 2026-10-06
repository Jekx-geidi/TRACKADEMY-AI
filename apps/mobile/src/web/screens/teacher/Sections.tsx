import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';

import { useAuth } from '@/features/auth/AuthProvider';
import { authErrorMessage } from '@/features/auth/api';
import { fieldErrors } from '@/features/auth/schema';
import { classWorkspaceSchema, currentSchoolYear, GRADE_LEVELS } from '@/features/classes/schema';
import { inviteLink, listSections, type SectionSort } from '@/features/teacher/api';
import { supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/useLoad';

import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyCard, LoadGate, PageHeader } from '../../ui/Dashboard';
import { Icon } from '../../ui/Icon';
import { IconCircle } from '../../ui/IconTile';
import { FilterSelect, ListToolbar, Pagination, SearchInput } from '../../ui/ListControls';
import { Notice, Screen } from '../../ui/Screen';
import { SelectField } from '../../ui/SelectField';
import { TextField } from '../../ui/TextField';
import { colors } from '../../ui/theme';
import { CopyField } from './sections/CopyField';
import { friendly, plural } from './sections/util';
import './sections.css';

/** Sections tab (PRD v0.5 §7): "Where is my class work organized?" */
export default function TeacherSections() {
  const [params, setParams] = useSearchParams();
  const creating = params.get('new') === '1';
  const [created, setCreated] = useState<CreatedSection | null>(null);

  const openCreate = () => setParams({ new: '1' });
  const closeCreate = () => setParams({}, { replace: true });

  if (created) return <SectionCreated section={created} onDone={() => setCreated(null)} />;
  if (creating)
    return (
      <CreateSection
        onCancel={closeCreate}
        onCreated={(section) => {
          setCreated(section);
          closeCreate();
        }}
      />
    );
  return <SectionList onCreate={openCreate} />;
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name' },
  { value: 'students', label: 'Most students' },
] as const satisfies readonly { value: SectionSort; label: string }[];

const GRADE_OPTIONS = GRADE_LEVELS.map((g) => ({ value: String(g), label: `Grade ${g}` }));

/** This school year, the next one and the three before it. */
function schoolYearOptions(): { value: string; label: string }[] {
  const start = Number(currentSchoolYear().slice(0, 4));
  return [1, 0, -1, -2, -3].map((offset) => {
    const year = `${start + offset}-${start + offset + 1}`;
    return { value: year, label: year };
  });
}

function SectionList({ onCreate }: { onCreate: () => void }) {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [sort, setSort] = useState<SectionSort>('newest');
  const [page, setPage] = useState(0);
  const query = { search, gradeLevel: grade ? Number(grade) : null, schoolYear, sort, page };
  const { data, error, loading, reload } = useLoad(() => friendly(listSections(query)), JSON.stringify(query));

  // Any filter change starts again from the first page.
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };
  const activeFilters = (grade ? 1 : 0) + (schoolYear ? 1 : 0);
  const hasFilters = Boolean(search) || activeFilters > 0;

  return (
    <Screen tabs>
      <PageHeader eyebrow="Sections" title="My Sections" subtitle="Where your class work is organized" />
      <Button label="+ Create Section" onPress={onCreate} />

      <ListToolbar
        search={<SearchInput value={search} onChange={filtered(setSearch)} placeholder="Search sections" />}
        activeFilters={activeFilters}
        filters={
          <>
            <FilterSelect label="Grade" value={grade} options={GRADE_OPTIONS} onChange={filtered(setGrade)} allLabel="All grades" />
            <FilterSelect label="School Year" value={schoolYear} options={schoolYearOptions()} onChange={filtered(setSchoolYear)} allLabel="All years" />
            <FilterSelect label="Sort" value={sort} options={SORT_OPTIONS} onChange={filtered((v: SectionSort | '') => setSort(v || 'newest'))} />
          </>
        }
      />

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {data && data.rows.length === 0 ? (
          hasFilters ? (
            <EmptyCard icon="search" title="No sections match." body="Try another search or clear the filters." />
          ) : (
            <>
              <EmptyCard icon="school-outline" title="No sections yet." body="Create a section, then share its join code with your students." />
              <Button label="Create Section" variant="secondary" icon="add" onPress={onCreate} />
            </>
          )
        ) : null}
        {data?.rows.map((s) => (
          <Card key={s.id}>
            <Link to={`/teacher/sections/${s.id}`} className="sx-card-link">
              <IconCircle name="school" tint={colors.accentSoft} color={colors.heading} size={44} />
              <span className="sx-main">
                <span className="sx-title">{s.name}</span>
                <span className="sx-meta">
                  {plural(s.student_count, 'student')} · {plural(s.subject_count, 'subject')}
                </span>
                <span className="sx-meta ellipsis">{[s.school_year, s.school_name].filter(Boolean).join(' · ')}</span>
              </span>
              <Icon name="chevron-forward" size={20} className="sx-chevron" />
            </Link>
          </Card>
        ))}
        {data ? <Pagination page={page} total={data.total} onPage={setPage} /> : null}
      </LoadGate>
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Create Section (PRD v0.5 §8)
// ---------------------------------------------------------------------------

const createSchema = classWorkspaceSchema.extend({
  description: z
    .string()
    .trim()
    .max(300, { error: 'Keep the description to 300 characters.' })
    .transform((v) => v || undefined),
});
type CreateField = keyof z.input<typeof createSchema>;

const createdRow = z.object({ id: z.uuid(), name: z.string(), join_code: z.string() }).loose();
type CreatedSection = z.infer<typeof createdRow>;

/** create_class_workspace with the optional description (features/classes/api has no description yet). */
async function createSection(input: z.output<typeof createSchema>): Promise<CreatedSection> {
  const { data, error } = await supabase
    .rpc('create_class_workspace', {
      p_grade_level: input.gradeLevel,
      p_section: input.section,
      p_school_year: input.schoolYear,
      p_school_name: input.schoolName ?? null,
      p_adviser_name: input.adviserName ?? null,
      p_description: input.description ?? null,
    })
    .single();
  if (error) throw error;
  return createdRow.parse(data);
}

function CreateSection({ onCancel, onCreated }: { onCancel: () => void; onCreated: (section: CreatedSection) => void }) {
  const { profile } = useAuth();
  const [section, setSection] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number | null>(null);
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());
  const [schoolName, setSchoolName] = useState('');
  const [adviserName, setAdviserName] = useState(profile?.fullName?.trim() ?? '');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Partial<Record<CreateField, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = createSchema.safeParse({ gradeLevel: gradeLevel ?? 0, section, schoolYear, schoolName, adviserName, description });
    if (!parsed.success) {
      setErrors(fieldErrors<CreateField>(parsed.error));
      return;
    }
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      onCreated(await createSection(parsed.data));
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Screen tabs>
      <PageHeader eyebrow="Sections" title="Create Section" subtitle="Students join it with a 6-digit code." />
      <Card>
        <form className="stack" onSubmit={submit} noValidate>
          <TextField label="Section Name" icon="people-outline" placeholder="Mango" value={section} onChangeText={setSection} error={errors.section} maxLength={60} />
          <SelectField
            label="Grade Level"
            icon="school-outline"
            placeholder="Choose a grade"
            value={gradeLevel}
            options={GRADE_LEVELS.map((g) => ({ value: g, label: `Grade ${g}` }))}
            onChange={setGradeLevel}
            error={errors.gradeLevel}
          />
          <TextField label="School Year" icon="calendar-outline" placeholder="2026-2027" value={schoolYear} onChangeText={setSchoolYear} error={errors.schoolYear} />
          <TextField label="School Name (optional)" icon="library-outline" value={schoolName} onChangeText={setSchoolName} error={errors.schoolName} maxLength={120} />
          <TextField label="Adviser Name" icon="person-outline" value={adviserName} onChangeText={setAdviserName} error={errors.adviserName} maxLength={120} />
          <div className="field">
            <label className="field-label" htmlFor="section-description">
              Section Description (optional)
            </label>
            <textarea
              id="section-description"
              className="plain-textarea"
              rows={3}
              maxLength={300}
              value={description}
              placeholder="Homeroom class, Room 204"
              onChange={(e) => setDescription(e.target.value)}
            />
            <span className="sx-counter">{description.length}/300</span>
            {errors.description ? <p className="field-error">{errors.description}</p> : null}
          </div>
          {gradeLevel !== null && section.trim() ? <p className="muted">It will be called “Grade {gradeLevel} - {section.trim()}”.</p> : null}
          {error ? (
            <Notice tone="danger" title="Section not created">
              {error}
            </Notice>
          ) : null}
          <Button type="submit" label="Create Section" icon="add" loading={busy} />
          <Button label="Cancel" variant="ghost" onPress={onCancel} disabled={busy} />
        </form>
      </Card>
    </Screen>
  );
}

function SectionCreated({ section, onDone }: { section: CreatedSection; onDone: () => void }) {
  const navigate = useNavigate();
  return (
    <Screen tabs>
      <PageHeader eyebrow="Section created" title={section.name} subtitle="Share the code or the link with your students." />
      <Notice tone="success" title="Your section is ready">
        Students type the Class Join Code in the app, or open the Invite Link.
      </Notice>
      <Card>
        <CopyField label="Class Join Code" value={section.join_code} big />
        <CopyField label="Invite Link" value={inviteLink(section.join_code)} />
      </Card>
      <Button label="Open Section" icon="arrow-forward" onPress={() => navigate(`/teacher/sections/${section.id}`)} />
      <Button label="Back to Sections" variant="ghost" onPress={onDone} />
    </Screen>
  );
}
