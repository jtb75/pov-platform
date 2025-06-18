import React from 'react';
import { Navigate } from 'react-router-dom';

// ProtectedRoute.tsx
// Restricts access to child routes based on user role (e.g., admin-only pages).

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // e.g., 'admin'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/dashboard" replace />;
  const { role } = JSON.parse(user);

  if (requiredRole && role !== requiredRole) {
    // Not authorized
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute; 