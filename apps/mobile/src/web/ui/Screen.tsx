import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { Icon } from './Icon';

/** Scrolling page for the app's own screens. `tabs` leaves room for the bottom tab bar. */
export function Screen({ children, tabs = false }: { children: ReactNode; tabs?: boolean }) {
  return (
    <main className={`screen${tabs ? ' with-tabs' : ''}`}>
      <div className="screen-inner">{children}</div>
    </main>
  );
}

/** Title bar with a back button, for screens pushed on top of the tabs (the scan flow). */
export function TopBar({ title, back = true }: { title: string; back?: boolean }) {
  const navigate = useNavigate();
  return (
    <header className="top-bar">
      {back ? (
        <button type="button" className="back-btn" aria-label="Go back" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/', { replace: true }))}>
          <Icon name="chevron-back" size={24} />
        </button>
      ) : null}
      <h1>{title}</h1>
    </header>
  );
}

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

const NOTICE_ICON = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
} as const;

export function Notice({ tone = 'info', title, children }: { tone?: NoticeTone; title: string; children?: ReactNode }) {
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={`notice ${tone}`}>
      <Icon name={NOTICE_ICON[tone]} size={22} />
      <div>
        <p className="notice-title">{title}</p>
        {children ? <p className="notice-body">{children}</p> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-row">
      <h2 className="section-title">{children}</h2>
      {right}
    </div>
  );
}
