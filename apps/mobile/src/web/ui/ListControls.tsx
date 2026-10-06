import { useEffect, useId, useState, type ReactNode } from 'react';

import { pageCount, pageLabel } from '@/features/teacher/progress';

import { Icon } from './Icon';

/**
 * Search box for list screens (PRD v0.5 §33). Reports the text after a short pause so each
 * keystroke doesn't reload the list.
 */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <label className="search-input">
      <Icon name="search" size={18} />
      <input type="search" value={text} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setText(e.target.value)} />
    </label>
  );
}

/** Compact labelled <select> for filter and sort bars. '' means "no filter". */
export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (value: T | '') => void;
  /** Adds a first "All …" option; leave out for sort selects. */
  allLabel?: string;
}) {
  const id = useId();
  return (
    <span className="filter-select">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T | '')}>
        {allLabel ? <option value="">{allLabel}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * Search on top, with filters and sort behind a "Filter" toggle (progressive disclosure,
 * PRD v0.5 §32, §34). Shows how many filters are on.
 */
export function ListToolbar({ search, filters, activeFilters = 0 }: { search: ReactNode; filters?: ReactNode; activeFilters?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="list-toolbar">
      <div className="list-toolbar-row">
        {search}
        {filters ? (
          <button type="button" className={`filter-toggle${open ? ' open' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <Icon name="options-outline" size={18} />
            <span>Filter{activeFilters ? ` (${activeFilters})` : ''}</span>
          </button>
        ) : null}
      </div>
      {filters && open ? <div className="list-toolbar-filters">{filters}</div> : null}
    </div>
  );
}

/** "Showing 1-20 of 86" with page buttons on wide screens and Previous/Next on phones (§35). */
export function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const pages = pageCount(total);
  if (total === 0) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i).filter((i) => Math.abs(i - page) <= 2 || i === 0 || i === pages - 1);
  return (
    <nav className="pagination" aria-label="Pages">
      <span className="pagination-label">{pageLabel(page, total)}</span>
      {pages > 1 ? (
        <div className="pagination-buttons">
          <button type="button" onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">
            <Icon name="chevron-back" size={16} />
            <span className="pagination-word">Previous</span>
          </button>
          {numbers.map((i, index) => (
            <span key={i} className="pagination-number">
              {index > 0 && i - (numbers[index - 1] ?? i) > 1 ? <span aria-hidden="true">…</span> : null}
              <button type="button" onClick={() => onPage(i)} aria-current={i === page ? 'page' : undefined}>
                {i + 1}
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pages - 1} aria-label="Next page">
            <span className="pagination-word">Next</span>
            <Icon name="chevron-forward" size={16} />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
