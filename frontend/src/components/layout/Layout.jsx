import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useUser } from '../../hooks/useUser.js';
import './Layout.css';

const NAV = [
  { to: '/dashboard',   label: 'Dashboard',   icon: '◎' },
  { to: '/journal',     label: 'Journal',      icon: '✦' },
  { to: '/mindfulness', label: 'Mindfulness',  icon: '◌' },
  { to: '/habits',      label: 'Habit Board',  icon: '▦' },
  { to: '/insight',     label: 'Insight',      icon: '◈' },
];

export default function Layout() {
  const { user } = useUser();
  const location = useLocation();
  const currentPage = NAV.find(n => location.pathname.startsWith(n.to))?.label ?? '';

  return (
    <div className="layout">
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
          <div className="user-avatar">
            {user?.profile?.displayName?.[0] ?? '?'}
          </div>
          <span className="user-name">{user?.profile?.displayName ?? '—'}</span>
        </div>
      </nav>

      <main className="main-area">
        <header className="topbar">
          <h1 className="page-title">{currentPage}</h1>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
