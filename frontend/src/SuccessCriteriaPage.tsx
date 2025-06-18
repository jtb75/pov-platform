import React, { useEffect, useState } from "react";
import './Table.css';
import { useNavigate } from "react-router-dom";
import Tooltip from './Tooltip';

interface Requirement {
  id: number;
  category: string;
  requirement: string;
  product?: string;
}

interface SuccessCriteriaRequirement {
  id: number;
  requirement_id?: number;
  custom_text?: string;
  order?: number;
  requirement?: Requirement | null;
}

interface SuccessCriteria {
  id: number;
  title: string;
  description?: string;
  owner_email: string;
  created_at: string;
  updated_at?: string;
  shared_with: string[];
  requirements: SuccessCriteriaRequirement[];
}

// SuccessCriteriaPage.tsx
// Lists all Success Criteria documents. Users can create, view, and delete documents.
// Clicking a document opens a popup to view, reorder, add, or remove requirements within the document.
// Unified table and icon styles are used for consistency.

const SuccessCriteriaPage: React.FC = () => {
  const [criteria, setCriteria] = useState<SuccessCriteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    shared_with: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [detailDoc, setDetailDoc] = useState<SuccessCriteria | null>(null);
  const [editReqs, setEditReqs] = useState<SuccessCriteriaRequirement[] | null>(null);
  const [addReqId, setAddReqId] = useState<string>('');
  const [addReqError, setAddReqError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCriteria = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = localStorage.getItem('user');
        const token = user ? JSON.parse(user).token : null;
        let headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/success-criteria", { headers });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setCriteria(data);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchCriteria();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Success Criteria?')) return;
    setDeleteLoadingId(id);
    setDeleteError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/success-criteria/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      setCriteria(list => list.filter(c => c.id !== id));
      setSelected(null);
    } catch (e: any) {
      setDeleteError(e.message || 'Unknown error');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const formatDate = (dt?: string) => dt ? new Date(dt).toLocaleString() : '';

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch('/api/success-criteria', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: createForm.title,
          description: createForm.description,
          shared_with: createForm.shared_with.split(',').map(e => e.trim()).filter(Boolean),
          requirements: [],
        }),
      });
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
      const newDoc = await res.json();
      setCriteria(list => [newDoc, ...list]);
      setShowCreate(false);
      setCreateForm({ title: '', description: '', shared_with: '' });
    } catch (e: any) {
      setCreateError(e.message || 'Unknown error');
    } finally {
      setCreateLoading(false);
    }
  };

  // When opening detail, copy requirements for editing
  const openDetail = (doc: SuccessCriteria) => {
    setDetailDoc(doc);
    setEditReqs(doc.requirements.map(r => ({ ...r })));
    setAddReqId('');
    setAddReqError(null);
    setSaveError(null);
  };

  // Move requirement up/down
  const moveReq = (idx: number, dir: -1 | 1) => {
    if (!editReqs) return;
    const newReqs = [...editReqs];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= newReqs.length) return;
    [newReqs[idx], newReqs[swapIdx]] = [newReqs[swapIdx], newReqs[idx]];
    setEditReqs(newReqs);
  };

  // Remove requirement
  const removeReq = (idx: number) => {
    if (!editReqs) return;
    setEditReqs(editReqs.filter((_, i) => i !== idx));
  };

  // Add requirement by ID (minimal, for demo)
  const handleAddReq = async () => {
    setAddReqError(null);
    const id = parseInt(addReqId, 10);
    if (!id || isNaN(id)) return setAddReqError('Enter a valid requirement ID');
    // Fetch requirement from backend
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/requirements`, { headers });
      if (!res.ok) throw new Error('Failed to fetch requirements');
      const allReqs = await res.json();
      const req = allReqs.find((r: any) => r.id === id);
      if (!req) return setAddReqError('Requirement not found');
      setEditReqs(editReqs ? [...editReqs, { id: Date.now(), requirement_id: req.id, custom_text: '', order: (editReqs.length), requirement: req }] : null);
      setAddReqId('');
    } catch (e: any) {
      setAddReqError(e.message || 'Error adding requirement');
    }
  };

  // Save changes (reorder/add/remove)
  const handleSave = async () => {
    if (!detailDoc || !editReqs) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/success-criteria/${detailDoc.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: detailDoc.title,
          description: detailDoc.description,
          shared_with: detailDoc.shared_with,
          requirements: editReqs.map((r, i) => ({ requirement_id: r.requirement_id, custom_text: r.custom_text, order: i })),
        }),
      });
      if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
      setDetailDoc(null);
      setEditReqs(null);
    } catch (e: any) {
      setSaveError(e.message || 'Error saving changes');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1>Success Criteria</h1>
      <button className="primary-btn" style={{ marginBottom: 16 }} onClick={() => setShowCreate(true)}>Create New</button>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <table className="table-unified requirements-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Owner</th>
            <th>Shared With</th>
            <th>Created</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {criteria.map(c => (
            <tr key={c.id} style={{ background: selected === c.id ? '#e8f0ff' : undefined, cursor: 'pointer' }}
                onClick={e => { if ((e.target as HTMLElement).tagName !== 'BUTTON') openDetail(c); }}>
              <td style={{ fontWeight: 600 }}>{c.title}</td>
              <td>{c.description}</td>
              <td>{c.owner_email}</td>
              <td>{c.shared_with.join(", ")}</td>
              <td>{formatDate(c.created_at)}</td>
              <td>{formatDate(c.updated_at)}</td>
              <td>
                <Tooltip content="Delete">
                  <button className="icon-btn" style={{ color: '#e74c3c' }} disabled={deleteLoadingId === c.id} onClick={e => { e.stopPropagation(); handleDelete(c.id); }} title="Delete">
                    {deleteLoadingId === c.id ? '...' : (
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="5" y="7" width="10" height="8" rx="2" fill="#e74c3c"/>
                        <rect x="8" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                        <rect x="10.5" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                        <rect x="7" y="4" width="6" height="2" rx="1" fill="#e74c3c"/>
                      </svg>
                    )}
                  </button>
                </Tooltip>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {deleteError && <div style={{ color: 'red', marginTop: 8 }}>{deleteError}</div>}
      {/* Detail Popup */}
      {detailDoc && editReqs && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal" style={{ minWidth: 900, minHeight: 600, maxHeight: '90vh', overflow: 'auto', width: '90vw', boxSizing: 'border-box' }}>
            <h2>{detailDoc.title}</h2>
            <div style={{ marginBottom: 8, color: '#555' }}>{detailDoc.description}</div>
            <div style={{ marginBottom: 8 }}><b>Owner:</b> {detailDoc.owner_email}</div>
            <div style={{ marginBottom: 8 }}><b>Shared With:</b> {detailDoc.shared_with.join(", ") || '-'}</div>
            <div style={{ margin: '16px 0' }}>
              <b>Add Requirement by ID:</b>
              <input type="text" value={addReqId} onChange={e => setAddReqId(e.target.value)} style={{ marginLeft: 8, width: 80 }} />
              <button className="primary-btn" style={{ marginLeft: 8 }} onClick={handleAddReq}>Add</button>
              {addReqError && <span style={{ color: 'red', marginLeft: 8 }}>{addReqError}</span>}
            </div>
            <table className="table-unified requirements-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Requirement</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {editReqs.length === 0 ? (
                  <tr><td colSpan={3} style={{ color: '#aaa', textAlign: 'center' }}>No requirements</td></tr>
                ) : editReqs.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.requirement ? r.requirement.requirement : r.requirement_id}</td>
                    <td>
                      <button className="icon-btn" title="Up" onClick={() => moveReq(i, -1)} disabled={i === 0}>
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 5l-5 7h10l-5-7z" fill="#0254EC"/>
                        </svg>
                      </button>
                      <button className="icon-btn" title="Down" onClick={() => moveReq(i, 1)} disabled={i === editReqs.length - 1}>
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M10 15l5-7H5l5 7z" fill="#0254EC"/>
                        </svg>
                      </button>
                      <button className="icon-btn" title="Remove" onClick={() => removeReq(i)} style={{ color: '#e74c3c' }}>
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="5" y="7" width="10" height="8" rx="2" fill="#e74c3c"/>
                          <rect x="8" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                          <rect x="10.5" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                          <rect x="7" y="4" width="6" height="2" rx="1" fill="#e74c3c"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {saveError && <div style={{ color: 'red', marginTop: 8 }}>{saveError}</div>}
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button className="primary-btn" onClick={handleSave} disabled={saveLoading}>{saveLoading ? 'Saving...' : 'Save Changes'}</button>
              <button className="primary-btn" style={{ background: '#888' }} onClick={() => { setDetailDoc(null); setEditReqs(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showCreate && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal">
            <h2>Create Success Criteria</h2>
            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label>Title:<br />
                  <input name="title" value={createForm.title} onChange={handleCreateChange} required style={{ width: '100%' }} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Description:<br />
                  <textarea name="description" value={createForm.description} onChange={handleCreateChange} style={{ width: '100%' }} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Shared With (comma-separated emails):<br />
                  <input name="shared_with" value={createForm.shared_with} onChange={handleCreateChange} style={{ width: '100%' }} />
                </label>
              </div>
              {createError && <div style={{ color: 'red', marginBottom: 8 }}>{createError}</div>}
              <button type="submit" className="primary-btn" disabled={createLoading}>{createLoading ? 'Creating...' : 'Create'}</button>
              <button type="button" onClick={() => setShowCreate(false)} style={{ marginLeft: 8 }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessCriteriaPage; 