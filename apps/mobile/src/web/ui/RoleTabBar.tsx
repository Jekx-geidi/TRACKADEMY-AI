import { NavLink } from 'react-router';

import { Icon, type IconName } from './Icon';

export interface TabSpec {
  /** Path relative to the role, e.g. '' for home or 'records'. */
  path: string;
  label: string;
  icon: IconName;
  iconOutline: IconName;
  /** The raised, emphasised centre action (Upload / Scan). */
  center?: boolean;
  /** Small count on the icon, e.g. unread notifications. */
  badge?: number;
}

/**
 * Floating bottom bar for one role. Screens under it use <Screen tabs> to leave room.
 * A tab stays highlighted on its nested pages (e.g. Sections on /teacher/sections/123).
 */
export function RoleTabBar({ base, tabs }: { base: string; tabs: readonly TabSpec[] }) {
  return (
    <nav className="tab-bar-wrap" aria-label="Main">
      <div className="tab-bar">
        {tabs.map((t) => (
          <NavLink
            key={t.path}
            to={t.path ? `${base}/${t.path}` : base}
            end={!t.path}
            className={({ isActive }) => `tab${t.center ? ' center' : ''}${isActive ? ' active' : ''}`}
            aria-label={t.badge ? `${t.label}, ${t.badge} unread` : undefined}
          >
            {({ isActive }) =>
              t.center ? (
                <>
                  <span className="tab-center-btn">
                    <Icon name={t.icon} size={28} />
                  </span>
                  <span>{t.label}</span>
                </>
              ) : (
                <>
                  <span className="tab-icon">
                    <Icon name={isActive ? t.icon : t.iconOutline} size={24} />
                    {t.badge ? (
                      <span className="tab-badge" aria-hidden="true">
                        {t.badge > 99 ? '99+' : t.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="ellipsis">{t.label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
