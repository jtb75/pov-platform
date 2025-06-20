import React, { useState, useEffect } from 'react';
import { apiRequest, formatDate } from './utils/api';
import './Table.css';
import { Link } from 'react-router-dom';

// Corresponds to the User schema in the backend
interface User {
  email: string;
  name?: string | null;
  picture?: string | null;
  role: string;
}

// Corresponds to the SCDRequirementOut schema
interface SCDRequirementOut {
  id: number;
  document_id: number;
  category: string;
  requirement: string;
  product?: string | null;
  doc_link?: string | null;
  tenant_link?: string | null;
  original_requirement_id?: number | null;
  order: number;
}

// Corresponds to the SCDOut schema
interface SCDOut {
  id: number;
  name: string;
  description?: string | null;
  owner: User;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  requirements: SCDRequirementOut[];
}

const SuccessCriteriaPage: React.FC = () => {
  const [scds, setScds] = useState<SCDOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newScdName, setNewScdName] = useState('');
  const [newScdDescription, setNewScdDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [cloneLoading, setCloneLoading] = useState<number | null>(null);

  const fetchScds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/api/scd');
      setScds(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Success Criteria Documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScds();
  }, []);

  const handleCreateScd = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      const newScd = await apiRequest('/api/scd', {
        method: 'POST',
        body: JSON.stringify({
          name: newScdName,
          description: newScdDescription,
          requirements: [], // Start with no requirements
        }),
      });
      setScds([newScd, ...scds]);
      setCreateModalOpen(false);
      setNewScdName('');
      setNewScdDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create SCD.');
    }
  };

  const handleCloneScd = async (scdId: number) => {
    if (!window.confirm("Are you sure you want to clone this document?")) {
      return;
    }
    setCloneLoading(scdId);
    setError(null);
    try {
      const clonedScd = await apiRequest(`/api/scd/${scdId}/clone`, {
        method: 'POST',
      });
      setScds(prevScds => [clonedScd, ...prevScds]);
    } catch (err: any) {
      setError(err.message || `Failed to clone document.`);
    } finally {
      setCloneLoading(null);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Success Criteria Documents</h1>
        <button className="primary-btn" onClick={() => setCreateModalOpen(true)}>Create New SCD</button>
      </div>

      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Create New Success Criteria Document</h2>
            <form onSubmit={handleCreateScd}>
              <div className="form-group">
                <label htmlFor="scd-name">Name</label>
                <input
                  id="scd-name"
                  type="text"
                  value={newScdName}
                  onChange={(e) => setNewScdName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="scd-description">Description</label>
                <textarea
                  id="scd-description"
                  value={newScdDescription}
                  onChange={(e) => setNewScdDescription(e.target.value)}
                />
              </div>
              {createError && <p className="error-message">{createError}</p>}
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {scds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
          <h3>No Documents Found</h3>
          <p>Get started by creating your first Success Criteria Document.</p>
        </div>
      ) : (
        <table className="table-unified requirements-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Owner</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scds.map((scd) => (
              <tr key={scd.id}>
                <td>
                  <Link to={`/success-criteria/${scd.id}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--primary-color)' }}>
                    {scd.name}
                  </Link>
                </td>
                <td>{scd.description}</td>
                <td>{scd.owner.name || scd.owner.email}</td>
                <td>{formatDate(scd.updated_at)}</td>
                <td>
                  <button
                    className="icon-btn"
                    title="Clone"
                    onClick={(e) => { e.stopPropagation(); handleCloneScd(scd.id); }}
                    disabled={cloneLoading === scd.id}
                  >
                    {cloneLoading === scd.id ? '...' : '📄'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SuccessCriteriaPage; 