import { useState, type CSSProperties, type ReactNode } from 'react';

import { authErrorMessage } from '@/features/auth/api';
import { archiveNotification, listNotifications, markNotificationsRead, type AppNotification } from '@/features/teacher/api';
import { useLoad } from '@/lib/useLoad';

import { Card } from './Card';
import { EmptyCard, LoadGate } from './Dashboard';
import { Icon, type IconName } from './Icon';
import { Pagination } from './ListControls';
import { Notice } from './Screen';
import { colors } from './theme';

/** "Just now", "5m ago", "3h ago", "Yesterday", "4d ago", then "Oct 9" (with the year if not this year). */
function whenLabel(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
}

/** Small action button for list rows (Verify, Archive, …). */
export function RowAction({
  label,
  icon,
  onPress,
  disabled = false,
  tone = 'default',
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary' | 'danger';
}) {
  const style = tone === 'primary' ? { ...styles.action, ...styles.actionPrimary } : tone === 'danger' ? { ...styles.action, ...styles.actionDanger } : styles.action;
  return (
    <button type="button" style={{ ...style, opacity: disabled ? 0.5 : 1 }} onClick={onPress} disabled={disabled}>
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{label}</span>
    </button>
  );
}

/** "Show archived" switch above a notification list. */
export function ArchivedSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>Show archived</span>
    </label>
  );
}

/**
 * One notification: unread dot, title, body and date. Tapping the text calls `onOpen`
 * (e.g. mark read). `badge` sits next to the date; `children` are the row's actions.
 */
export function NotificationItem({
  notification: n,
  divider = false,
  onOpen,
  badge,
  children,
}: {
  notification: AppNotification;
  divider?: boolean;
  onOpen?: () => void;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const unread = n.read_at === null;
  const text = (
    <>
      <span style={{ ...styles.dot, background: unread ? colors.accent : 'transparent' }} aria-hidden="true" />
      <span style={styles.text}>
        {unread ? <span className="visually-hidden">Unread: </span> : null}
        <span style={{ ...styles.title, fontWeight: unread ? 800 : 600 }}>{n.title}</span>
        {n.body ? <span style={styles.body}>{n.body}</span> : null}
        <span style={styles.meta}>
          <time dateTime={n.created_at} title={new Date(n.created_at).toLocaleString()}>
            {whenLabel(n.created_at)}
          </time>
          {badge}
        </span>
      </span>
    </>
  );
  return (
    <div style={{ ...styles.item, ...(divider ? styles.divider : null) }}>
      {onOpen ? (
        <button type="button" style={styles.main} onClick={onOpen}>
          {text}
        </button>
      ) : (
        <div style={styles.main}>{text}</div>
      )}
      {children ? <div style={styles.actions}>{children}</div> : null}
    </div>
  );
}

/**
 * The student and parent inbox (PRD v0.3 §23): the signed-in user's own notifications,
 * read on tap, with Mark all read, Archive, a "Show archived" switch and pages.
 */
export function NotificationInbox() {
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => listNotifications({ filter: 'ALL', archived, page }), `${archived}:${page}`);
  const rows = data?.rows ?? [];

  const act = async (id: string, work: () => Promise<void>, after?: () => void) => {
    setActionError(null);
    setBusyId(id);
    try {
      await work();
      if (after) after();
      else reload();
    } catch (e) {
      setActionError(authErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const archive = (n: AppNotification) =>
    // Archiving the last row on a page steps back a page instead of showing an empty one.
    act(n.id, () => archiveNotification(n.id), rows.length === 1 && page > 0 ? () => setPage(page - 1) : undefined);

  return (
    <>
      <div style={styles.bar}>
        <ArchivedSwitch
          checked={archived}
          onChange={(on) => {
            setArchived(on);
            setPage(0);
          }}
        />
        {/* Unread rows may be on other pages, so this shows whenever there is anything to mark. */}
        {!archived && rows.length > 0 ? (
          <button type="button" className="link-btn" disabled={busyId !== null} onClick={() => act('all', () => markNotificationsRead())}>
            Mark all read
          </button>
        ) : null}
      </div>

      {actionError ? (
        <Notice tone="danger" title="Could not update">
          {actionError}
        </Notice>
      ) : null}

      <LoadGate loading={loading} error={error} hasData={data !== undefined} onRetry={reload}>
        {rows.length === 0 ? (
          <EmptyCard
            icon="notifications-outline"
            title={archived ? 'No archived notifications.' : 'No notifications yet.'}
            body={archived ? undefined : "You're all caught up."}
          />
        ) : (
          <Card className="list-card">
            {rows.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                divider={i > 0}
                onOpen={n.read_at === null ? () => act(n.id, () => markNotificationsRead([n.id])) : undefined}
              >
                {n.archived_at === null ? <RowAction label="Archive" icon="archive-outline" disabled={busyId !== null} onPress={() => archive(n)} /> : null}
              </NotificationItem>
            ))}
          </Card>
        )}
        <Pagination page={page} total={data?.total ?? 0} onPage={setPage} />
      </LoadGate>
    </>
  );
}

const styles = {
  item: { display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' },
  divider: { borderTop: `1px solid ${colors.border}` },
  main: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    padding: 0,
    border: 0,
    background: 'none',
    textAlign: 'left',
    color: colors.heading,
    font: 'inherit',
  },
  dot: { flex: 'none', width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  text: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  title: { fontSize: 16, color: colors.heading, overflowWrap: 'anywhere' },
  body: { fontSize: 14, lineHeight: '20px', color: colors.textMuted, overflowWrap: 'anywhere' },
  meta: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 13, color: colors.textMuted },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 20 },
  action: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    fontSize: 14,
    fontWeight: 700,
    color: colors.heading,
  },
  actionPrimary: { background: colors.primary, borderColor: colors.primary, color: colors.primaryText },
  actionDanger: { borderColor: colors.dangerSoft, color: colors.danger },
  bar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
} satisfies Record<string, CSSProperties>;
