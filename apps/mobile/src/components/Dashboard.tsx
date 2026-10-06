import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { EVIDENCE_STATUS_SHORT, type EvidenceStatus } from '@/features/evidence/constants';
import type { EvidenceRecord } from '@/features/evidence/schema';
import { formatScore } from '@/features/evidence/summary';

import { Button } from './Button';
import { Card } from './Card';
import { IconCircle } from './IconTile';
import { Notice } from './Screen';
import { colors, fonts, radius, spacing } from './theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || 'there';

/** Logo, small eyebrow and big title at the top of a tab screen. */
export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityLabel="Trackademic" />
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

export function StatTile({
  icon,
  value,
  label,
  tint = colors.accentSoft,
}: {
  icon: IconName;
  value: string | number;
  label: string;
  tint?: string;
}) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <IconCircle name={icon} tint={tint} color={colors.heading} size={36} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
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
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{EVIDENCE_STATUS_SHORT[status]}</Text>
    </View>
  );
}

/** One paper: subject, title, score and status. */
export function RecordRow({
  record,
  showStudent = false,
  divider = false,
}: {
  record: EvidenceRecord;
  showStudent?: boolean;
  divider?: boolean;
}) {
  const a = record.assessment;
  const meta = [showStudent ? record.studentName : null, a?.subject, new Date(record.uploadedAt).toLocaleDateString()]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <IconCircle name="document-text" tint={colors.accentSoft} color={colors.accent} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {a?.title ?? 'Assessment'}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
        <StatusPill status={record.status} />
      </View>
      <Text style={styles.rowScore}>{formatScore(record)}</Text>
    </View>
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
  return <Card style={styles.list}>{(limit ? items.slice(0, limit) : items).map(render)}</Card>;
}

export function EmptyCard({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  return (
    <Card style={styles.empty}>
      <IconCircle name={icon} tint={colors.inputFill} color={colors.textMuted} size={44} />
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      </View>
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
  return loading ? <ActivityIndicator color={colors.accent} size="large" style={styles.spinner} /> : null;
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
    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingTop: spacing.sm },
  logo: { width: 48, height: 48 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 14, fontFamily: fonts.semibold, color: colors.textMuted },
  title: { fontSize: 24, fontFamily: fonts.extrabold, color: colors.heading },
  subtitle: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, lineHeight: 21 },
  statRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg - 4, padding: spacing.sm + 4, gap: 4 },
  statValue: { fontSize: 24, fontFamily: fonts.extrabold, color: colors.heading, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, fontFamily: fonts.semibold, color: colors.textMuted },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 3, marginTop: 4 },
  pillText: { fontSize: 12, fontFamily: fonts.bold },
  list: { gap: 0, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingVertical: spacing.sm + 2 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  rowMeta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  rowScore: { fontSize: 17, fontFamily: fonts.extrabold, color: colors.heading, fontVariant: ['tabular-nums'] },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyText: { flex: 1, gap: 2 },
  emptyTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.heading },
  emptyBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  spinner: { marginVertical: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 15, fontFamily: fonts.bold, color: colors.heading },
  chipTextSelected: { color: colors.primaryText },
});
