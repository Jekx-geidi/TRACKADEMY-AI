import type { Tone } from '@/features/teacher/progress';

/** Text label with its colour; colour is never the only signal (PRD v0.5 §5.1, §39). */
export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`status-badge tone-${tone}`}>{label}</span>;
}

/**
 * Completion donut (PRD v0.5 §5.1, §37): the ring shows the percent, the centre shows
 * "done/total", and the label underneath says the status in words.
 */
export function Donut({
  percent,
  tone,
  center,
  caption,
  size = 112,
  onPress,
  label,
}: {
  percent: number;
  tone: Tone;
  center: string;
  caption?: string;
  size?: number;
  onPress?: () => void;
  /** Accessible description, e.g. "Section Mango: 15 of 20 submitted, 75%, Needs Attention". */
  label: string;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  const ring = (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--input-fill)" strokeWidth={stroke} />
      <circle
        className={`donut-arc tone-${tone}`}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="46%" textAnchor="middle" className="donut-center">
        {center}
      </text>
      <text x="50%" y="64%" textAnchor="middle" className="donut-percent">
        {percent}%
      </text>
    </svg>
  );
  return onPress ? (
    <button type="button" className="donut" onClick={onPress}>
      {ring}
      {caption ? <span className="donut-caption">{caption}</span> : null}
    </button>
  ) : (
    <div className="donut">
      {ring}
      {caption ? <span className="donut-caption">{caption}</span> : null}
    </div>
  );
}

/** Thin bar for compact comparisons (§37). */
export function ProgressBar({ percent, tone, label }: { percent: number; tone: Tone; label: string }) {
  return (
    <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label}>
      <span className={`tone-${tone}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}
