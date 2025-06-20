import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/requirements', label: 'Requirements' },
    { path: '/success-criteria', label: 'Success Criteria' },
    ...(isAdmin ? [
      { 
        label: 'System Settings', 
        path: '/settings',
        children: [
          { path: '/settings/status', label: 'System Status' },
          { path: '/settings/audit-logs',label: 'Audit Logs' },
          { path: '/settings/users', label: 'User Management' },
          { path: '/settings/session', label: 'Session Settings' },
        ]
      },
    ] : []),
  ];

  const getOpenSubMenu = () => {
    const activeParent = navLinks.find(link => link.children && link.path && location.pathname.startsWith(link.path));
    return activeParent ? activeParent.path : null;
  }
  
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(getOpenSubMenu());

  useEffect(() => {
    setOpenSubMenu(getOpenSubMenu());
  }, [location.pathname]);

  const toggleSubMenu = (path: string) => {
    setOpenSubMenu(openSubMenu === path ? null : path);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className={`main-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>PoV Platform</h2>
        </div>
        <nav>
          <ul>
            {navLinks.map(link => {
              if (link.children) {
                const isParentActive = link.path && location.pathname.startsWith(link.path);
                return (
                  <li key={link.label} className={`submenu-parent ${isParentActive ? 'active' : ''}`}>
                    <div className="submenu-toggle" onClick={() => toggleSubMenu(link.path!)}>
                      {link.label}
                      <span className={`arrow ${openSubMenu === link.path ? 'open' : ''}`}>&#9662;</span>
                    </div>
                    {openSubMenu === link.path && (
                      <ul className="submenu">
                        {link.children.map(child => (
                          <li key={child.path} className={location.pathname === child.path ? 'active' : ''}>
                            <Link to={child.path}>{child.label}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li key={link.path} className={location.pathname === link.path ? 'active' : ''}>
                  <Link to={link.path!}>{link.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="content-wrapper">
        <header className="main-header">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? '‹' : '›'}
          </button>
          <div className="header-placeholder"></div>
          <div className="user-profile">
            {user && (
              <>
                <img src={user.picture} alt={user.name} className="profile-pic" />
                <span>{user.name}</span>
              </>
            )}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 