// SystemStatusPage.tsx
// Displays system health and status information for the platform.
import React, { useEffect, useState } from 'react';
import './Table.css';
import { apiRequest } from './utils/api';

interface HealthStatus {
  status: string;
  version: string;
  uptime: string;
  uptime_seconds: number;
  db_connection: boolean;
  last_check: string;
  db?: {
    status: string;
    version: string;
  };
  python_version?: string;
  platform?: string;
  memory_mb?: number;
  total_memory_mb?: number;
  build_time?: string;
  service?: string;
}

const SystemStatusPage: React.FC = () => {
  const [backend, setBackend] = useState<HealthStatus | null>(null);
  const [frontend, setFrontend] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiRequest('/api/health').catch(() => null),
      fetch('/health.json').then(r => r.json()).catch(() => null), // Keep direct fetch for frontend health check
    ])
      .then(([backendRes, frontendRes]) => {
        setBackend(backendRes);
        setFrontend(frontendRes);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading system status...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <>
      <h2>System Status</h2>
      <table className="table-unified requirements-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Backend API</td>
            <td>{backend?.status === 'ok' ? 'green' : 'red'}</td>
            <td>
              {backend && (
                <div>
                  DB: {backend.db?.status}<br />
                  Uptime: {backend.uptime_seconds}s<br />
                  Python: {backend.python_version?.split(' ')[0]}<br />
                  Platform: {backend.platform}<br />
                  Memory: {backend.memory_mb}MB / {backend.total_memory_mb}MB
                </div>
              )}
            </td>
          </tr>
          <tr>
            <td>Frontend</td>
            <td>{frontend?.status === 'ok' ? 'green' : 'red'}</td>
            <td>
              {frontend && (
                <div>
                  Build: {frontend.build_time}<br />
                  Service: {frontend.service}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
};

export default SystemStatusPage; 