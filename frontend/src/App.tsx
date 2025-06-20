import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './Login';
import Dashboard from './Dashboard';
import RequirementsPage from './RequirementsPage';
import SuccessCriteriaPage from './SuccessCriteriaPage';
import SCDDetailPage from './SCDDetailPage';
import SystemSettings from './SystemSettings';
import SystemStatusPage from './SystemStatusPage';
import AuditLogsPage from './AuditLogsPage';
import UserManagementPage from './UserManagementPage';
import SessionSettingsPage from './SessionSettingsPage';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from './MainLayout';

// App.tsx
// Main application component handling routing and layout
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/session-expired" element={<Login expired={true} />} />
        
        {/* Protected Routes with MainLayout */}
        <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/requirements" element={<ProtectedRoute><MainLayout><RequirementsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/success-criteria" element={<ProtectedRoute><MainLayout><SuccessCriteriaPage /></MainLayout></ProtectedRoute>} />
        <Route path="/success-criteria/:id" element={<ProtectedRoute><MainLayout><SCDDetailPage /></MainLayout></ProtectedRoute>} />
        
        <Route path="/settings/*" element={
          <ProtectedRoute requiredRole="admin">
            <MainLayout>
              <SystemSettings />
            </MainLayout>
          </ProtectedRoute>
        }>
          <Route path="status" element={<SystemStatusPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="session" element={<SessionSettingsPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
