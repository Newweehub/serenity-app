import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useUser } from '../../hooks/useUser.js';
import './Layout.css';

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '◎' },
  { to: '/journal',     label: 'Journal',      icon: '✦' },
  { to: '/mindfulness', label: 'Mindfulness',  icon: '◌' },
  { to: '/habits',      label: 'Habit Board',  icon: '▦' },
  { to: '/insight',     label: 'Insight',      icon: '◈' },
  { to: '/settings',    label: 'Settings',     icon: '⚙' },
];

function handleLogout() {
  if (window.location.hostname !== 'localhost') {
    window.location.href = '/.auth/logout';
  } else {
    localStorage.removeItem('serenity_user_id');
    window.location.reload();
  }
}

export default function Layout() {
  const { user } = useUser();
  const location = useLocation();
  const currentPage = NAV.find(n => location.pathname.startsWith(n.to))?.label ?? '';
  const displayName = user?.profile?.displayName ?? '—';
  const initial     = displayName[0] ?? '?';

  return (
    <div className="layout">

      {/* ── Desktop sidebar ── */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-leaf">🌿</span>
          <span className="brand-name">Serenity</span>
        </div>

        <ul className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* User row — avatar + name (no logout button here) */}
        <div className="sidebar-user">
          <NavLink to="/settings" className="sidebar-user-link">
            <div className="user-avatar">{initial}</div>
            <span className="user-name">{displayName}</span>
          </NavLink>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="main-area">

        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <div className="mobile-brand">
            <span className="brand-leaf">🌿</span>
            <span className="brand-name">Serenity</span>
          </div>
          <div className="mobile-topbar-right">
            <NavLink to="/settings" className="mobile-avatar" title="Settings">
              {initial}
            </NavLink>
          </div>
        </div>

        <header className="topbar">
          <h1 className="page-title">{currentPage}</h1>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
