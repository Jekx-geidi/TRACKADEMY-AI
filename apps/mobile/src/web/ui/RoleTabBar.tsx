import { NavLink } from 'react-router';

import { Icon, type IconName } from './Icon';

export interface TabSpec {
  /** Path relative to the role, e.g. '' for home or 'records'. */
  path: string;
  label: string;
  icon: IconName;
  iconOutline: IconName;
  /** The raised, emphasised centre action (Upload / Scan / Create). */
  center?: boolean;
}

/** Floating bottom bar for one role. Screens under it use <Screen tabs> to leave room. */
export function RoleTabBar({ base, tabs }: { base: string; tabs: readonly TabSpec[] }) {
  return (
    <nav className="tab-bar-wrap" aria-label="Main">
      <div className="tab-bar">
        {tabs.map((t) => (
          <NavLink key={t.path} to={t.path ? `${base}/${t.path}` : base} end className={({ isActive }) => `tab${t.center ? ' center' : ''}${isActive ? ' active' : ''}`}>
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
                  <Icon name={isActive ? t.icon : t.iconOutline} size={24} />
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
