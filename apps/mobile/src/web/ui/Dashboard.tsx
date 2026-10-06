import type { ReactNode } from 'react';

import logo from '../../../assets/logo.png';
import { EVIDENCE_STATUS_SHORT, type EvidenceStatus } from '@/features/evidence/constants';
import type { EvidenceRecord } from '@/features/evidence/schema';
import { formatScore } from '@/features/evidence/summary';

import { Button } from './Button';
import { Card } from './Card';
import type { IconName } from './Icon';
import { IconCircle } from './IconTile';
import { Notice } from './Screen';
import { Spinner } from './Spinner';
import { colors } from './theme';

export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || 'there';

/** Logo, small eyebrow and big title at the top of a tab screen. */
export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="page-header">
      <img src={logo} alt="Trackademic" />
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="stat-row">{children}</div>;
}

export function StatTile({ icon, value, label, tint = colors.accentSoft }: { icon: IconName; value: string | number; label: string; tint?: string }) {
  return (
    <div className="stat" role="group" aria-label={`${label}: ${value}`}>
      <IconCircle name={icon} tint={tint} color={colors.heading} size={36} />
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

const STATUS_TONE: Record<EvidenceStatus, { bg: string; fg: string }> = {
  DRAFT: { bg: colors.inputFill, fg: colors.textMuted },
  UPLOADED: { bg: colors.accentSoft, fg: colors.heading },
  CODE_MATCHED: { bg: colors.accentSoft, fg: colors.heading },
  NEEDS_REVIEW: { bg: colors.warningSoft, fg: colors.warning },
  TEACHER_VERIFIED: { bg: colors.successSoft, fg: colors.success },
  REJECTED: { bg: colors.dangerSoft, fg: colors.danger },
  MISSING: { bg: colors.warningSoft, fg: colors.warning },
};

export function StatusPill({ status }: { status: EvidenceStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className="status-pill" style={{ background: tone.bg, color: tone.fg }}>
      {EVIDENCE_STATUS_SHORT[status]}
    </span>
  );
}

/** One paper: subject, title, score and status. */
export function RecordRow({ record, showStudent = false, divider = false }: { record: EvidenceRecord; showStudent?: boolean; divider?: boolean }) {
  const a = record.assessment;
  const meta = [showStudent ? record.studentName : null, a?.subject, new Date(record.uploadedAt).toLocaleDateString()].filter(Boolean).join(' · ');
  return (
    <div className={`record-row${divider ? ' divider' : ''}`}>
      <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
      <div className="record-text">
        <span className="record-title ellipsis">{a?.title ?? 'Assessment'}</span>
        <span className="record-meta ellipsis">{meta}</span>
        <StatusPill status={record.status} />
      </div>
      <span className="record-score">{formatScore(record)}</span>
    </div>
  );
}

/** A card of rows, or an empty message. */
export function ListCard<T>({
  items,
  render,
  empty,
  limit,
}: {
  items: readonly T[];
  render: (item: T, index: number) => ReactNode;
  empty: { icon: IconName; title: string; body?: string };
  limit?: number;
}) {
  if (items.length === 0) return <EmptyCard {...empty} />;
  return <Card className="list-card">{(limit ? items.slice(0, limit) : items).map(render)}</Card>;
}

export function EmptyCard({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <Card className="empty-card">
      <IconCircle name={icon} tint={colors.inputFill} color={colors.textMuted} size={44} />
      <div>
        <p className="empty-title">{title}</p>
        {body ? <p className="empty-body">{body}</p> : null}
      </div>
    </Card>
  );
}

/** Spinner on first load; an error with Try Again if loading failed and there's nothing to show. */
export function LoadGate({
  loading,
  error,
  hasData,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (hasData) {
    return (
      <>
        {error ? (
          <Notice tone="warning" title="Could not refresh">
            {error}
          </Notice>
        ) : null}
        {children}
      </>
    );
  }
  if (error) {
    return (
      <>
        <Notice tone="danger" title="Could not load">
          {error}
        </Notice>
        <Button label="Try Again" variant="secondary" icon="refresh" onPress={onRetry} />
      </>
    );
  }
  return loading ? <Spinner size="large" /> : null;
}

/** Horizontal chooser, e.g. the parent's child selector. */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className="chip" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
