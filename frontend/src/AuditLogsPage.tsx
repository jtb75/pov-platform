import React, { useEffect, useState } from 'react';
import './Table.css';

// AuditLogsPage.tsx
// Admin-only page for viewing and filtering audit logs of user actions in the system.

interface AuditLog {
  id: number;
  timestamp: string;
  user_email: string;
  action: string;
  details: string;
  ip_address: string;
}

const MAX_LOGS = 5000;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    user_email: '',
    action: '',
    details: '',
    ip_address: '',
    dateFrom: '',
    dateTo: '',
  });
  const [total, setTotal] = useState(0);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Helper to build query string for backend filters
  const buildQuery = () => {
    const params = new URLSearchParams();
    params.append('limit', String(MAX_LOGS));
    params.append('offset', '0');
    if (filters.user_email) params.append('email', filters.user_email);
    if (filters.action) params.append('action', filters.action);
    if (filters.dateFrom) params.append('start_date', filters.dateFrom);
    if (filters.dateTo) params.append('end_date', filters.dateTo);
    return params.toString();
  };

  // Fetch logs from backend with filters
  useEffect(() => {
    if (!currentUser.token) {
      setError('You must be logged in as an admin to view audit logs.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/audit-logs?${buildQuery()}`, {
      headers: { Authorization: `Bearer ${currentUser.token}` },
    })
      .then(res => {
        if (res.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        }
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        return res.json();
      })
      .then(data => {
        setLogs(data);
        setTotal(data.length);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [filters.user_email, filters.action, filters.dateFrom, filters.dateTo]);

  // Filtering (client-side only for details and ip_address)
  const filteredLogs = logs.filter(log => {
    const { details, ip_address } = filters;
    let match = true;
    if (details && !log.details.toLowerCase().includes(details.toLowerCase())) match = false;
    if (ip_address && !log.ip_address.toLowerCase().includes(ip_address.toLowerCase())) match = false;
    return match;
  });

  // Pagination
  const pageCount = Math.ceil(filteredLogs.length / pageSize);
  const pagedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  if (loading) return <div>Loading audit logs...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div>
      <h2>Audit Logs</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-unified">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User Email</th>
              <th>Action</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
            <tr>
              {/* Timestamp filter: date range */}
              <th>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleDateChange} style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', minWidth: 0 }} placeholder="From" />
                  <input type="date" name="dateTo" value={filters.dateTo} onChange={handleDateChange} style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', minWidth: 0 }} placeholder="To" />
                </div>
              </th>
              {/* User Email filter */}
              <th>
                <input name="user_email" value={filters.user_email} onChange={handleFilterChange} placeholder="Search" style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', width: '100%' }} />
              </th>
              {/* Action filter */}
              <th>
                <input name="action" value={filters.action} onChange={handleFilterChange} placeholder="Search" style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', width: '100%' }} />
              </th>
              {/* Details filter */}
              <th>
                <input name="details" value={filters.details} onChange={handleFilterChange} placeholder="Search" style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', width: '100%' }} />
              </th>
              {/* IP Address filter */}
              <th>
                <input name="ip_address" value={filters.ip_address} onChange={handleFilterChange} placeholder="Search" style={{ padding: 6, borderRadius: 4, border: '1px solid #CADAFF', width: '100%' }} />
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedLogs.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#888' }}>No logs found.</td></tr>
            ) : (
              pagedLogs.map((log, idx) => (
                <tr key={log.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', fontFamily: 'Inter, Arial, sans-serif', fontSize: 15, color: '#3C4948', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', fontFamily: 'Inter, Arial, sans-serif', fontSize: 15, color: '#3C4948' }}>{log.user_email}</td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', color: '#3C4948' }}>{log.action}</td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', color: '#3C4948', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.details}>{log.details}</td>
                  <td style={{ padding: '10px 16px', borderBottom: '1px solid #CADAFF', color: '#3C4948' }}>{log.ip_address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: page === 1 ? '#eee' : '#0254EC', color: page === 1 ? '#888' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Prev</button>
        <span>Page {page} of {pageCount}</span>
        <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount} style={{ padding: '6px 14px', borderRadius: 4, border: 'none', background: page === pageCount ? '#eee' : '#0254EC', color: page === pageCount ? '#888' : '#fff', cursor: page === pageCount ? 'not-allowed' : 'pointer', fontWeight: 500 }}>Next</button>
      </div>
      <div style={{ marginTop: 8, color: '#888', fontSize: 14 }}>Showing {filteredLogs.length} of {logs.length} logs (max {MAX_LOGS})</div>
    </div>
  );
};

export default AuditLogsPage; 