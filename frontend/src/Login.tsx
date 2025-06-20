// Login.tsx
// Handles Google OAuth login and user session initialization for the platform.
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  expired?: boolean;
}

const Login: React.FC<LoginProps> = ({ expired }) => {
  const navigate = useNavigate();

  const handleSuccess = (credentialResponse: any) => {
    const id_token = credentialResponse.credential;
    console.log("Google credentialResponse:", credentialResponse);
    console.log("id_token to send to backend:", id_token);
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token }),
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          console.log("Response from /api/login:", data);
          localStorage.setItem('user', JSON.stringify(data));
          navigate('/dashboard'); // Redirect after successful login
        } else {
          console.error("Login failed:", data);
          alert(data.detail || 'Login failed');
        }
      })
      .catch(err => {
        console.error("Network or server error during login:", err);
        alert('Network or server error during login');
      });
  };

  const handleError = () => {
    alert('Login Failed');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '5rem' }}>
      {expired ? (
        <>
          <h1 style={{ marginBottom: '2rem', color: '#e74c3c' }}>Session Expired</h1>
          <p style={{ marginBottom: '2rem', fontSize: 18 }}>Your session has expired. Please log in again to continue.</p>
        </>
      ) : (
        <h1 style={{ marginBottom: '2rem' }}>POV Platform</h1>
      )}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        text="signin_with"
        shape="rectangular"
        width="300"
      />
    </div>
  );
};

export default Login; 