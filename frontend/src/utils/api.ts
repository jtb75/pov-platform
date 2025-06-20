// api.ts
// Utility functions for handling API calls and authentication

const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));

    const { exp } = JSON.parse(jsonPayload);
    if (!exp) return true;

    // Add a 5-minute buffer to handle clock skew
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= (exp - 300); // 300 seconds = 5 minutes
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Treat parsing errors as expired token
  }
};

export const handleApiResponse = async (response: Response) => {
  if (response.status === 401) {
    // Clear user data but let the component handle the redirect
    localStorage.removeItem('user');
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'An error occurred');
  }
  
  return response.json();
};

export const getAuthHeaders = (): Record<string, string> => {
  const user = localStorage.getItem('user');
  const token = user ? JSON.parse(user).token : null;
  
  // Check if token exists and is not expired
  if (token && isTokenExpired(token)) {
    localStorage.removeItem('user');
    throw new Error('Session expired');
  }
  
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...getAuthHeaders(),
    };

    const response = await fetch(url, { ...options, headers });
    return handleApiResponse(response);
  } catch (error: any) {
    // Let the error propagate to the component
    throw error;
  }
};

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) {
    return 'N/A';
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    // Fallback for formats not directly supported by new Date()
    // E.g., "YYYY-MM-DD HH:MM:SS.mmmmmm" from Python's datetime
    const parts = dateString.split(/[- :.]/);
    if (parts.length >= 6) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const day = parseInt(parts[2], 10);
      const hour = parseInt(parts[3], 10);
      const minute = parseInt(parts[4], 10);
      const second = parseInt(parts[5], 10);
      const adjustedDate = new Date(year, month, day, hour, minute, second);
      if (!isNaN(adjustedDate.getTime())) {
        return adjustedDate.toLocaleString();
      }
    }
    return 'Invalid Date';
  }
  return date.toLocaleString();
}; 