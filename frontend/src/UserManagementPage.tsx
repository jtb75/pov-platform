import React, { useEffect, useState } from 'react';
import { apiRequest } from './utils/api';
import './Table.css';

interface User {
  email: string;
  role: string;
  created_at: string;
  last_login: string | null;
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersData = await apiRequest('/api/users');
        setUsers(usersData);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handlePromote = async (email: string, makeAdmin: boolean) => {
    try {
      setError(null);
      setSuccess(null);
      
      await apiRequest('/api/users/promote', {
        method: 'POST',
        body: JSON.stringify({ email, make_admin: makeAdmin }),
      });

      const updatedUsers = await apiRequest('/api/users');
      setUsers(updatedUsers);
      setSuccess(`User ${email} ${makeAdmin ? 'promoted to admin' : 'demoted to normal user'}`);
    } catch (e: any) {
      setError(e.message || 'Failed to update user role');
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <>
      <h2>User Management</h2>
      <table className="table-unified requirements-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString()
                  : 'Never'}
              </td>
              <td>
                <button
                  onClick={() => handlePromote(user.email, user.role !== 'admin')}
                  className={user.role === 'admin' ? 'secondary-btn' : 'primary-btn'}
                  style={{ padding: '0.25rem 0.75rem' }}
                >
                  {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && (
        <div style={{ color: 'red', marginTop: '1rem', padding: '1rem', background: 'var(--white)' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: 'green', marginTop: '1rem', padding: '1rem', background: 'var(--white)' }}>
          {success}
        </div>
      )}
    </>
  );
};

export default UserManagementPage; 