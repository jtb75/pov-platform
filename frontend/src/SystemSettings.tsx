import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import './Table.css';

// SystemSettings.tsx
// Admin-only page for managing system settings, including system status, audit logs, and user accounts.

const navStyle = {
  display: 'flex',
  gap: '1rem',
  marginBottom: '2rem',
};

const SystemSettings: React.FC = () => (
  <div>
    <h1>System Settings</h1>
    <nav style={navStyle}>
      <NavLink to="/settings/status" className={({ isActive }) => isActive ? 'primary-btn' : 'primary-btn'} style={({ isActive }) => ({ fontWeight: isActive ? 700 : 500 })}>
        System Status
      </NavLink>
      <NavLink to="/settings/audit-logs" className={({ isActive }) => isActive ? 'primary-btn' : 'primary-btn'} style={({ isActive }) => ({ fontWeight: isActive ? 700 : 500 })}>
        Audit Logs
      </NavLink>
      <NavLink to="/settings/accounts" className={({ isActive }) => isActive ? 'primary-btn' : 'primary-btn'} style={({ isActive }) => ({ fontWeight: isActive ? 700 : 500 })}>
        Accounts
      </NavLink>
    </nav>
    <div>
      <Outlet />
    </div>
  </div>
);

export default SystemSettings; 