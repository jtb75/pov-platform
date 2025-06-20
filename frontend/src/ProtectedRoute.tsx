import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { apiRequest } from './utils/api';

// ProtectedRoute.tsx
// Restricts access to child routes based on user role (e.g., admin-only pages).
// Also handles token validation and session expiration.

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // e.g., 'admin'
}

// Only validate token every 5 minutes
const VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastValidationTime = 0;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const navigate = useNavigate();

  useEffect(() => {
    // Validate token on mount and when user data changes
    const validateToken = async () => {
      try {
        const user = localStorage.getItem('user');
        if (!user) {
          navigate('/login');
          return;
        }

        // Skip validation if we've validated recently
        const now = Date.now();
        if (now - lastValidationTime < VALIDATION_INTERVAL) {
          return;
        }

        // Validate token with backend
        await apiRequest('/api/me');
        lastValidationTime = now;
      } catch (error: any) {
        console.error('Token validation error:', error);
        // Only redirect if it's an auth error
        if (error.message === 'Session expired' || error.message === 'Invalid authentication credentials') {
          localStorage.removeItem('user');
          navigate('/session-expired');
        }
      }
    };

    // Add a small delay before first validation to avoid race conditions
    const timer = setTimeout(validateToken, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const user = localStorage.getItem('user');
  if (!user) return <Navigate to="/login" replace />;
  
  try {
    const { role } = JSON.parse(user);
    if (requiredRole && role !== requiredRole) {
      // Not authorized
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  } catch (error) {
    // Invalid user data in localStorage
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute; 