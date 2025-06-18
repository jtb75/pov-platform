import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

// Root.tsx
// Top-level component that loads the Google OAuth client ID and wraps the app in the OAuth provider and router.

const Root: React.FC = () => {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/public-google-client-id')
      .then(res => res.json())
      .then(data => setClientId(data.client_id));
  }, []);

  if (!clientId) return <div>Loading...</div>;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Router>
        <App />
      </Router>
    </GoogleOAuthProvider>
  );
};

export default Root; 