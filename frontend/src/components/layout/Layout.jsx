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

export default function Layout() {
  const { user } = useUser();
  const location = useLocation();
  const currentPage = NAV.find(n => location.pathname.startsWith(n.to))?.label ?? '';

  return (
    <div className="layout">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <nav className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-leaf">🌿</span>
          <span className="brand-name">Serenity</span>
        </div>

        <ul className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-user">
          <NavLink to="/settings" className="sidebar-user-link">
            <div className="user-avatar">
              {user?.profile?.displayName?.[0] ?? '?'}
            </div>
            <span className="user-name">{user?.profile?.displayName ?? '—'}</span>
          </NavLink>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="main-area">

        {/* Mobile top bar — logo + page title (hidden on desktop) */}
        <div className="mobile-topbar">
          <div className="mobile-brand">
            <span className="brand-leaf">🌿</span>
            <span className="brand-name">Serenity</span>
          </div>
          <NavLink to="/settings" className="mobile-avatar">
            {user?.profile?.displayName?.[0] ?? '?'}
          </NavLink>
        </div>

        <header className="topbar">
          <h1 className="page-title">{currentPage}</h1>
        </header>

        {/* Extra bottom padding on mobile so content clears the bottom nav */}
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">{icon}</span>
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
