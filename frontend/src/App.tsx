import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaCogs, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Dashboard from "./Dashboard";
import SystemSettings from "./SystemSettings";
import AdminPage from "./AdminPage";
import ProtectedRoute from "./ProtectedRoute";
import Login, { SessionExpired } from './Login';
import SystemStatusPage from "./SystemStatusPage";
import AuditLogsPage from "./AuditLogsPage";
import AccountsPage from "./AccountsPage";
import RequirementsPage from "./RequirementsPage";
import SuccessCriteriaPage from "./SuccessCriteriaPage";
import './App.css';

// Debug switch
const DEBUG = true;

// App.tsx
// Main application component. Handles routing, sidebar navigation, user session, and layout for all pages.
// Integrates all main pages and applies global styles.

const Sidebar: React.FC = () => {
  const user = localStorage.getItem('user');
  const role = user ? JSON.parse(user).role : null;
  const [collapsed, setCollapsed] = useState(false);

  const navItemStyle = {
    background: 'transparent',
    color: '#FFFFF',
    border: 'none',
    padding: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    marginBottom: '1rem',
    borderRadius: 4,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    fontWeight: 500,
    transition: 'background 0.2s, color 0.2s',
    fontSize: 18,
    justifyContent: collapsed ? 'center' : 'flex-start',
  } as React.CSSProperties;

  return (
    <nav style={{
      width: collapsed ? 64 : 220,
      background: '#001142',
      color: '#FFFFF',
      display: 'flex',
      flexDirection: 'column',
      padding: collapsed ? '1rem 0.5rem' : '2rem 1rem',
      minHeight: '100vh',
      borderTopRightRadius: 16,
      borderBottomRightRadius: 16,
      boxShadow: '2px 0 8px rgba(2,84,236,0.08)',
      alignItems: collapsed ? 'center' : 'flex-start',
      transition: 'width 0.2s',
      position: 'relative',
    }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          background: collapsed ? '#0254EC' : '#001142',
          border: '2px solid #0254EC',
          color: '#FFFFFF',
          cursor: 'pointer',
          marginBottom: collapsed ? 0 : 16,
          position: 'absolute',
          top: 16,
          left: 16,
          fontSize: 22,
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          transition: 'background 0.2s, left 0.2s, width 0.2s',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? FaChevronRight({}) : FaChevronLeft({})}
      </button>
      <div style={{ height: 56 }} />
      <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', color: '#0254EC', letterSpacing: 1, textAlign: collapsed ? 'center' : 'left', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden' }}>{collapsed ? 'POV' : 'POV Platform'}</h2>
      <Link to="/dashboard"
        className="sidebar-link"
      >
        <span style={{ minWidth: 22, display: 'inline-block', textAlign: 'center' }}>{FaTachometerAlt({ size: 22, style: { minWidth: 22, color: '#fff' } })}</span>
        {!collapsed && 'Dashboard'}
      </Link>
      <Link to="/requirements"
        className="sidebar-link"
      >
        <span style={{ minWidth: 22, display: 'inline-block', textAlign: 'center', color: '#fff' }}>📋</span>
        {!collapsed && 'Requirements'}
      </Link>
      <Link to="/success-criteria"
        className="sidebar-link"
      >
        <span style={{ minWidth: 22, display: 'inline-block', textAlign: 'center', color: '#fff' }}>✅</span>
        {!collapsed && 'Success Criteria'}
      </Link>
      {role === 'admin' && (
        <Link to="/settings"
          className="sidebar-link"
        >
          <span style={{ minWidth: 22, display: 'inline-block', textAlign: 'center' }}>{FaCogs({ size: 22, style: { minWidth: 22, color: '#fff' } })}</span>
          {!collapsed && 'System Settings'}
        </Link>
      )}
      <div style={{ flex: 1 }} />
    </nav>
  );
};

const UserMenu: React.FC = () => {
  const user = localStorage.getItem('user');
  const navigate = useNavigate();
  if (!user) return null;
  const { user: userName } = JSON.parse(user);
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };
  return (
    <div style={{ position: 'absolute', top: 20, right: 30, display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontWeight: 500 }}>{userName}</span>
      <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer' }}>Logout</button>
    </div>
  );
};

// Global fetch wrapper to catch 401/403 and redirect
const useAuthInterceptor = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await origFetch(...args);
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('user');
        navigate('/session-expired');
      }
      return response;
    };
    return () => {
      window.fetch = origFetch;
    };
  }, [navigate]);
};

function App() {
  const userStr = localStorage.getItem('user');
  const location = useLocation();

  useAuthInterceptor();

  useEffect(() => {
    if (DEBUG) {
      console.log('User from localStorage:', userStr);
      console.log('Current route:', location.pathname);
    }
  }, [userStr, location]);

  if (!userStr) {
    if (DEBUG) console.log('No user found in localStorage, rendering Login page.');
    return <Login />;
  }

  let user;
  try {
    user = JSON.parse(userStr);
    if (DEBUG) console.log('Parsed user object:', user);
  } catch (e) {
    if (DEBUG) console.error('Failed to parse user from localStorage:', e);
    return <Login />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', position: 'relative' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', background: '#f7f7f7', position: 'relative' }}>
        <UserMenu />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requirements" element={<RequirementsPage />} />
          <Route path="/success-criteria" element={<SuccessCriteriaPage />} />
          <Route path="/settings/*" element={
            <ProtectedRoute requiredRole="admin">
              <SystemSettings />
            </ProtectedRoute>
          }>
            <Route index element={<SystemStatusPage />} />
            <Route path="status" element={<SystemStatusPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
            <Route path="accounts" element={<AccountsPage />} />
          </Route>
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/session-expired" element={<SessionExpired />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
