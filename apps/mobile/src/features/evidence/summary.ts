import { PENDING_STATUSES } from './constants';
import type { EvidenceRecord } from './schema';

/** Score as a share of the assessment total, 0..1, or null when not known. */
export function scoreRatio(record: EvidenceRecord): number | null {
  if (record.score === null || !record.assessment) return null;
  return record.score / record.assessment.totalScore;
}

export function formatScore(record: EvidenceRecord): string {
  if (record.score === null) return '—';
  const score = Number.isInteger(record.score) ? String(record.score) : record.score.toFixed(2).replace(/0$/, '');
  return record.assessment ? `${score}/${record.assessment.totalScore}` : score;
}

export const isPending = (record: EvidenceRecord) => PENDING_STATUSES.includes(record.status);

/** Below this share of the total, a score is shown under "needs attention". */
export const LOW_SCORE = 0.75;

export const needsAttention = (record: EvidenceRecord) => {
  if (record.status === 'NEEDS_REVIEW' || record.status === 'REJECTED') return true;
  const ratio = scoreRatio(record);
  return ratio !== null && ratio < LOW_SCORE;
};

export function isWithinDays(record: EvidenceRecord, days: number, now = Date.now()): boolean {
  return now - new Date(record.uploadedAt).getTime() <= days * 24 * 60 * 60 * 1000;
}

export interface SubjectSummary {
  subject: string;
  papers: number;
  /** Average of score / total over papers with a score, 0..1. */
  average: number | null;
}

/** Groups records by subject, most papers first. */
export function summarizeBySubject(records: readonly EvidenceRecord[]): SubjectSummary[] {
  const groups = new Map<string, { papers: number; sum: number; scored: number }>();
  for (const record of records) {
    if (!record.assessment) continue;
    const key = record.assessment.subject.trim();
    const group = groups.get(key) ?? { papers: 0, sum: 0, scored: 0 };
    group.papers++;
    const ratio = scoreRatio(record);
    if (ratio !== null) {
      group.sum += ratio;
      group.scored++;
    }
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([subject, g]) => ({ subject, papers: g.papers, average: g.scored > 0 ? g.sum / g.scored : null }))
    .sort((a, b) => b.papers - a.papers || a.subject.localeCompare(b.subject));
}

export const formatPercent = (ratio: number | null) => (ratio === null ? '—' : `${Math.round(ratio * 100)}%`);
