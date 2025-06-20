import React from 'react';
import { Outlet } from 'react-router-dom';
import './Table.css';

// SystemSettings.tsx
// Admin-only page for managing system settings, including system status, audit logs, and user accounts.

const SystemSettings: React.FC = () => (
  <div>
    <Outlet />
  </div>
);

export default SystemSettings; 