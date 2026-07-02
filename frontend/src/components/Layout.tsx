import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

// ─── SVG Icon Components ──────────────────────────────────────────────────────

const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IconMic = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const IconLinkedIn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

const IconFileText = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const IconX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconLogOut = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

// ─── Nav Items ────────────────────────────────────────────────────────────────

const navItems = [
  { to: '/live-jobs',     Icon: IconBolt,     label: 'Live Jobs',       live: true  },
  { to: '/interview',     Icon: IconMic,      label: 'Interview',       live: false },
  { to: '/linkedin',      Icon: IconLinkedIn, label: 'LinkedIn Analysis', live: false },
  { to: '/resume-review', Icon: IconFileText, label: 'Resume Review',   live: false },
];

// ─── Avatar helper ─────────────────────────────────────────────────────────
function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// ─── Layout Component ─────────────────────────────────────────────────────────

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className={`layout${isCollapsed ? ' collapsed' : ''}${isMobileOpen ? ' mobile-open' : ''}`}>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setIsMobileOpen(true)} aria-label="Open navigation menu">
          <IconMenu />
        </button>
        <div className="mobile-brand">
          <span className="brand-icon-small">CD</span>
          <span className="mobile-brand-title">Candidate Discovery</span>
        </div>
        <div style={{ width: 36 }} />
      </header>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}${isMobileOpen ? ' mobile-open' : ''}`}>
        {/* Brand */}
        <div className="brand">
          <div className="brand-logo-group">
            <span className="brand-icon" aria-label="Candidate Discovery">CD</span>
            <div className="brand-text">
              <strong>Candidate Discovery</strong>
              <small>AI Recruiting Workspace</small>
            </div>
          </div>
          <button
            className="collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
          <button
            className="mobile-close-btn"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <IconX />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Primary navigation">
          <span className="nav-section-label">Workspace</span>
          {navItems.map(({ to, Icon, label, live }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}
              aria-current={undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              {({ isActive }) => (
                <div className="nav-item-content">
                  <span className="nav-icon" title={label} aria-hidden="true">
                    <Icon />
                  </span>
                  <span className="nav-label">{label}</span>
                  {live && (
                    <span className="nav-live-badge" aria-label="Live feed">
                      <span className="nav-live-dot" />
                      <span className="nav-live-text">LIVE</span>
                    </span>
                  )}
                  {/* Screen reader text for active state */}
                  {isActive && <span className="sr-only">(current page)</span>}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="profile-pill" aria-label={`Logged in as ${user?.name || 'User'}`}>
            <span className="profile-avatar" aria-hidden="true">
              {getInitials(user?.name)}
            </span>
            <div className="profile-info">
              <p className="profile-name">{user?.name || 'Recruiter'}</p>
              <p className="profile-role">{user?.role || 'Workspace Member'}</p>
            </div>
          </div>

          <div className="footer-actions">
            <button
              className="footer-icon-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span className="btn-text">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              className="footer-icon-btn"
              onClick={logout}
              title="Log out"
              aria-label="Log out"
            >
              <IconLogOut />
              <span className="btn-text">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Shell */}
      <div className="app-shell">
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
