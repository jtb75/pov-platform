import React, { useEffect, useState } from 'react';
import './Table.css';

// AccountsPage.tsx
// Admin-only page for managing user accounts, including promotion/demotion and user details.

interface User {
  email: string;
  name?: string;
  picture?: string;
  role: string;
}

const AccountsPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchUsers = () => {
    setLoading(true);
    setError(null);
    fetch('/api/users', {
      headers: { Authorization: `Bearer ${currentUser.token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handlePromote = (email: string, makeAdmin: boolean) => {
    fetch('/api/users/promote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ email, make_admin: makeAdmin }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update user role');
        return res.json();
      })
      .then(() => fetchUsers());
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h2>Accounts</h2>
      <table className="table-unified">
        <thead>
          <tr style={{ background: '#E8F0FF' }}>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #CADAFF', color: '#001142' }}>Avatar</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #CADAFF', color: '#001142' }}>Email</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #CADAFF', color: '#001142' }}>Name</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #CADAFF', color: '#001142' }}>Role</th>
            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #CADAFF', color: '#001142' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr
              key={u.email}
              className={u.email === currentUser.email ? 'current-user-row' : ''}
              style={{ transition: 'background 0.2s' }}
            >
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF' }}>
                {u.picture ? (
                  <img src={u.picture} alt={u.name || u.email} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 1px 4px rgba(2,84,236,0.08)' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7E7E7E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFF', fontWeight: 600 }}>
                    {u.name ? u.name[0] : u.email[0]}
                  </div>
                )}
              </td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', fontFamily: 'monospace', color: '#3C4948' }}>{u.email}</td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', color: '#3C4948' }}>{u.name}</td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', textTransform: 'capitalize', fontWeight: u.role === 'admin' ? 600 : 400, color: u.role === 'admin' ? '#0254EC' : '#3C4948' }}>{u.role}</td>
              <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF' }}>
                {u.email !== currentUser.email && (
                  u.role === 'admin' ? (
                    <button onClick={() => handlePromote(u.email, false)} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#F5F5F5', color: '#3C4948', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(2,84,236,0.03)' }}>Demote to Normal</button>
                  ) : (
                    <button onClick={() => handlePromote(u.email, true)} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: '#0254EC', color: '#FFFFF', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(2,84,236,0.03)' }}>Promote to Admin</button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountsPage; 