import React, { useEffect, useState } from 'react';
import { apiRequest } from './utils/api';
import './Table.css';

interface SessionConfig {
  duration: number;
}

const SessionSettingsPage: React.FC = () => {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [editDuration, setEditDuration] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const configData = await apiRequest('/api/session-config');
        setConfig(configData);
        setEditDuration(String(configData.duration / 60)); // Convert to minutes for display
      } catch (e: any) {
        setError(e.message || 'Failed to fetch session config');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const durationInSeconds = Math.round(parseFloat(editDuration) * 60);
      
      if (isNaN(durationInSeconds)) {
        throw new Error('Please enter a valid number for the session duration.');
      }

      const data = await apiRequest('/api/session-config', {
        method: 'POST',
        body: JSON.stringify({ duration: durationInSeconds }),
      });

      setConfig({ duration: durationInSeconds }); // Optimistically update the UI
      setSuccess('Session duration updated successfully.');
    } catch (e: any) {
      setError(e.message || 'Failed to update session configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading session settings...</div>;

  return (
    <>
      <h2>Session Settings</h2>
      <div className="table-unified" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3>Session Configuration</h3>
        <form onSubmit={handleSessionSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Session Duration (minutes):
            </label>
            <input
              type="number"
              value={editDuration}
              onChange={(e) => setEditDuration(e.target.value)}
              min="5"
              max="1440"
              className="filter-input"
              style={{ maxWidth: '300px' }}
            />
            <div style={{ fontSize: 14, color: '#666', marginTop: '0.5rem' }}>
              Minimum: 5 minutes, Maximum: 24 hours (1440 minutes)
            </div>
          </div>
          
          <button type="submit" disabled={saving} className="primary-btn">
            {saving ? 'Saving...' : 'Update Session Duration'}
          </button>
        </form>

        <div style={{ marginTop: '1rem' }}>
          <strong>Current Duration:</strong>{' '}
          {config ? `${config.duration / 60} minutes (${config.duration} seconds)` : 'N/A'}
        </div>

        {error && (
          <div style={{ color: 'red', marginTop: '1rem' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ color: 'green', marginTop: '1rem' }}>
            {success}
          </div>
        )}
      </div>
    </>
  );
};

export default SessionSettingsPage; 