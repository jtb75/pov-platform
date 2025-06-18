import React, { useState, useEffect } from "react";
import './Table.css';
import Tooltip from './Tooltip';
import Select from 'react-select';
import SuccessCriteriaPage from "./SuccessCriteriaPage";

// RequirementsPage.tsx
// Displays all requirements in a table with filtering, add, edit, delete, bulk upload, mass edit/delete, and mass add to Success Criteria.
// Uses unified table and icon button styles for a consistent UI.

// Placeholder data type
interface Requirement {
  id: number;
  category: string;
  requirement: string;
  product?: string;
  doc_link?: string;
  tenant_link?: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
  updated_by?: string;
}

const RequirementsPage: React.FC = () => {
  // Placeholder state
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    category: '',
    requirement: '',
    product: '',
    doc_link: '',
    tenant_link: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [metaPopup, setMetaPopup] = useState<{ anchor: HTMLElement | null, req: Requirement | null }>({ anchor: null, req: null });
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    id: 0,
    category: '',
    requirement: '',
    product: '',
    doc_link: '',
    tenant_link: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const [massDeleteLoading, setMassDeleteLoading] = useState(false);
  const [massDeleteError, setMassDeleteError] = useState<string | null>(null);
  const [showMassEdit, setShowMassEdit] = useState(false);
  const [massEditForm, setMassEditForm] = useState({ category: '', product: '' });
  const [massEditLoading, setMassEditLoading] = useState(false);
  const [massEditError, setMassEditError] = useState<string | null>(null);
  const [massEditSuccess, setMassEditSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    requirement: '',
    product: [] as string[],
  });
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [showMassAdd, setShowMassAdd] = useState(false);
  const [criteriaList, setCriteriaList] = useState<any[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);
  const [selectedCriteriaId, setSelectedCriteriaId] = useState<number | null>(null);
  const [massAddLoading, setMassAddLoading] = useState(false);
  const [massAddError, setMassAddError] = useState<string | null>(null);
  const [showCreateCriteria, setShowCreateCriteria] = useState(false);
  const [createCriteriaForm, setCreateCriteriaForm] = useState({ title: '', description: '', shared_with: '' });
  const [createCriteriaLoading, setCreateCriteriaLoading] = useState(false);
  const [createCriteriaError, setCreateCriteriaError] = useState<string | null>(null);

  // For react-select
  const productOptions = allProducts.map(p => ({ value: p, label: p }));

  // Parse product string into array
  const parseProducts = (product: string | undefined | null): string[] => {
    if (!product) return [];
    return product
      .split(/[,;]/)
      .map(p => p.trim())
      .filter(Boolean);
  };

  // Collect all unique product values
  useEffect(() => {
    const productsSet = new Set<string>();
    requirements.forEach(r => {
      parseProducts(r.product).forEach(p => productsSet.add(p));
    });
    setAllProducts(Array.from(productsSet).sort());
  }, [requirements]);

  // Fetch requirements from API
  useEffect(() => {
    const fetchRequirements = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = localStorage.getItem('user');
        const token = user ? JSON.parse(user).token : null;
        let headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/requirements", {
          headers,
        });
        if (!res.ok) throw new Error(`Failed to fetch requirements: ${res.status}`);
        const data = await res.json();
        setRequirements(data);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchRequirements();
  }, []);

  // Filtered requirements
  const filteredRequirements = requirements.filter(r =>
    (filters.category === '' || r.category.toLowerCase().includes(filters.category.toLowerCase())) &&
    (filters.requirement === '' || r.requirement.toLowerCase().includes(filters.requirement.toLowerCase())) &&
    (
      filters.product.length === 0 ||
      parseProducts(r.product).some(p => filters.product.includes(p))
    )
  );

  // Placeholder handlers
  const handleAdd = () => {
    setEditing(null);
    setShowAddEdit(true);
  };
  const handleEdit = (req: Requirement) => {
    setEditing(req);
    setEditForm({
      id: req.id,
      category: req.category,
      requirement: req.requirement,
      product: req.product || '',
      doc_link: req.doc_link || '',
      tenant_link: req.tenant_link || '',
    });
    setShowAddEdit(true);
  };
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this requirement?')) return;
    setDeleteLoadingId(id);
    setDeleteError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/requirements/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error(`Failed to delete requirement: ${res.status}`);
      setRequirements(reqs => reqs.filter(r => r.id !== id));
    } catch (e: any) {
      setDeleteError(e.message || 'Unknown error');
    } finally {
      setDeleteLoadingId(null);
    }
  };
  const handleMassDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selected.length} requirements?`)) return;
    setMassDeleteLoading(true);
    setMassDeleteError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch('/api/requirements/mass-delete', {
        method: 'POST',
        headers,
        body: JSON.stringify(selected),
      });
      if (!res.ok) throw new Error(`Failed to mass delete: ${res.status}`);
      setRequirements(reqs => reqs.filter(r => !selected.includes(r.id)));
      setSelected([]);
    } catch (e: any) {
      setMassDeleteError(e.message || 'Unknown error');
    } finally {
      setMassDeleteLoading(false);
    }
  };
  const handleMassEdit = () => {
    setShowMassEdit(true);
    setMassEditForm({ category: '', product: '' });
    setMassEditError(null);
    setMassEditSuccess(null);
  };
  const handleBulkUpload = () => {
    setShowBulkUpload(true);
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers,
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error(`Failed to add requirement: ${res.status}`);
      const newReq = await res.json();
      setRequirements(reqs => [...reqs, newReq]);
      setShowAddEdit(false);
      setAddForm({ category: '', requirement: '', product: '', doc_link: '', tenant_link: '' });
    } catch (e: any) {
      setAddError(e.message || 'Unknown error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/requirements/${editForm.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          category: editForm.category,
          requirement: editForm.requirement,
          product: editForm.product,
          doc_link: editForm.doc_link,
          tenant_link: editForm.tenant_link,
        }),
      });
      if (!res.ok) throw new Error(`Failed to update requirement: ${res.status}`);
      const updated = await res.json();
      setRequirements(reqs => reqs.map(r => r.id === updated.id ? updated : r));
      setShowAddEdit(false);
      setEditing(null);
    } catch (e: any) {
      setEditError(e.message || 'Unknown error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
    setBulkError(null);
    setBulkSuccess(null);
  };

  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return setBulkError('Please select a CSV file.');
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      const formData = new FormData();
      formData.append('file', bulkFile);
      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch('/api/requirements/bulk-upload', {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error(`Failed to upload: ${res.status}`);
      const data = await res.json();
      setBulkSuccess(`Uploaded ${data.count} requirements.`);
      setBulkFile(null);
      // Refresh requirements list
      const reqRes = await fetch('/api/requirements', { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequirements(reqData);
      }
      // Auto-close dialog after short delay
      setTimeout(() => {
        setShowBulkUpload(false);
        setBulkFile(null);
        setBulkError(null);
        setBulkSuccess(null);
      }, 1000);
    } catch (e: any) {
      setBulkError(e.message || 'Unknown error');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleMassEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMassEditForm({ ...massEditForm, [e.target.name]: e.target.value });
  };

  const handleMassEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMassEditLoading(true);
    setMassEditError(null);
    setMassEditSuccess(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // Only include fields that are non-empty
      const updates: any = {};
      if (massEditForm.category.trim() !== "") updates.category = massEditForm.category;
      if (massEditForm.product.trim() !== "") updates.product = massEditForm.product;
      const res = await fetch('/api/requirements/mass-edit', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ids: selected,
          updates,
        }),
      });
      if (!res.ok) throw new Error(`Failed to mass edit: ${res.status}`);
      setMassEditSuccess('Mass edit successful.');
      // Refresh requirements list
      const reqRes = await fetch('/api/requirements', { headers });
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequirements(reqData);
      }
      setTimeout(() => {
        setShowMassEdit(false);
        setMassEditForm({ category: '', product: '' });
        setMassEditError(null);
        setMassEditSuccess(null);
        setSelected([]);
      }, 1000);
    } catch (e: any) {
      setMassEditError(e.message || 'Unknown error');
    } finally {
      setMassEditLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleProductSelect = (selected: any) => {
    setFilters(f => ({ ...f, product: selected ? selected.map((s: any) => s.value) : [] }));
  };

  const handleResetFilters = () => {
    setFilters({ category: '', requirement: '', product: [] });
  };

  const handleToggleFilters = () => setShowFilters(f => !f);

  // Helper to format datetime
  const formatDate = (dt?: string | Date) => dt ? new Date(dt).toLocaleString() : '';

  const handleMassAdd = () => {
    setShowMassAdd(true);
    setCriteriaLoading(true);
    setCriteriaError(null);
    setSelectedCriteriaId(null);
    // Fetch user's Success Criteria docs
    const fetchCriteria = async () => {
      try {
        const user = localStorage.getItem('user');
        const token = user ? JSON.parse(user).token : null;
        let headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch('/api/success-criteria', { headers });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        setCriteriaList(data);
      } catch (e: any) {
        setCriteriaError(e.message || 'Unknown error');
      } finally {
        setCriteriaLoading(false);
      }
    };
    fetchCriteria();
  };

  const handleMassAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCriteriaId) return setMassAddError('Please select a Success Criteria document.');
    setMassAddLoading(true);
    setMassAddError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // Fetch the selected criteria to get its requirements
      const res = await fetch(`/api/success-criteria/${selectedCriteriaId}`, { headers });
      if (!res.ok) throw new Error(`Failed to fetch criteria: ${res.status}`);
      const criteria = await res.json();
      // Add selected requirements to the end
      const newReqs = [
        ...criteria.requirements.map((r: any) => ({ requirement_id: r.requirement_id, custom_text: r.custom_text, order: r.order })),
        ...requirements.filter(r => selected.includes(r.id)).map((r, i) => ({ requirement_id: r.id, custom_text: undefined, order: (criteria.requirements.length || 0) + i })),
      ];
      // Update the criteria
      const putRes = await fetch(`/api/success-criteria/${selectedCriteriaId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          title: criteria.title,
          description: criteria.description,
          shared_with: criteria.shared_with,
          requirements: newReqs,
        }),
      });
      if (!putRes.ok) throw new Error(`Failed to update: ${putRes.status}`);
      setShowMassAdd(false);
      setSelected([]);
    } catch (e: any) {
      setMassAddError(e.message || 'Unknown error');
    } finally {
      setMassAddLoading(false);
    }
  };

  const handleCreateCriteriaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCreateCriteriaForm({ ...createCriteriaForm, [e.target.name]: e.target.value });
  };

  const handleCreateCriteriaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCriteriaLoading(true);
    setCreateCriteriaError(null);
    try {
      const user = localStorage.getItem('user');
      const token = user ? JSON.parse(user).token : null;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch('/api/success-criteria', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: createCriteriaForm.title,
          description: createCriteriaForm.description,
          shared_with: createCriteriaForm.shared_with.split(',').map(e => e.trim()).filter(Boolean),
          requirements: requirements.filter(r => selected.includes(r.id)).map((r, i) => ({ requirement_id: r.id, order: i })),
        }),
      });
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
      setShowCreateCriteria(false);
      setShowMassAdd(false);
      setSelected([]);
    } catch (e: any) {
      setCreateCriteriaError(e.message || 'Unknown error');
    } finally {
      setCreateCriteriaLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Requirements</h1>
      {loading && <div>Loading requirements...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginBottom: 16 }}>
        <button onClick={handleAdd} className="primary-btn">Add Requirement</button>
        <button onClick={handleBulkUpload} className="primary-btn" style={{ marginLeft: 8 }}>Bulk Upload</button>
        <button onClick={handleMassEdit} className="primary-btn" style={{ marginLeft: 8 }} disabled={selected.length === 0}>Mass Edit</button>
        <button onClick={handleMassDelete} className="primary-btn" style={{ marginLeft: 8 }} disabled={selected.length === 0 || massDeleteLoading}>
          {massDeleteLoading ? 'Deleting...' : 'Mass Delete'}
        </button>
        <button onClick={handleMassAdd} className="primary-btn" style={{ marginLeft: 8 }} disabled={selected.length === 0}>Mass Add to Success Criteria</button>
        <button onClick={handleToggleFilters} className="primary-btn" style={{ marginLeft: 8 }}>
          {showFilters ? 'Hide Filters' : 'Filter'}
        </button>
      </div>
      <table className="table-unified requirements-table">
        <thead>
          <tr>
            <th><input type="checkbox" checked={selected.length === requirements.length && requirements.length > 0} onChange={e => setSelected(e.target.checked ? requirements.map(r => r.id) : [])} /></th>
            <th>Category</th>
            <th>Requirement</th>
            <th>Product</th>
            <th>Platform Links</th>
            <th>Meta</th>
            <th>Actions</th>
          </tr>
          {showFilters && (
            <tr>
              <th>
                <button onClick={handleResetFilters} style={{ padding: '4px 12px', borderRadius: 4, border: 'none', background: '#eee', color: '#222', cursor: 'pointer', fontWeight: 500 }}>Reset</button>
              </th>
              <th><input name="category" value={filters.category} onChange={handleFilterChange} placeholder="Filter" style={{ width: '100%', padding: 4, borderRadius: 4, border: '1px solid #CADAFF', minHeight: 32, boxSizing: 'border-box' }} /></th>
              <th><input name="requirement" value={filters.requirement} onChange={handleFilterChange} placeholder="Filter" style={{ width: '100%', padding: 4, borderRadius: 4, border: '1px solid #CADAFF', minHeight: 32, boxSizing: 'border-box' }} /></th>
              <th>
                <Select
                  isMulti
                  name="product"
                  options={productOptions}
                  value={productOptions.filter(opt => filters.product.includes(opt.value))}
                  onChange={handleProductSelect}
                  placeholder="Filter"
                  styles={{
                    control: base => ({ ...base, minHeight: 32, borderColor: '#CADAFF', borderRadius: 4, boxSizing: 'border-box', padding: 0 }),
                    valueContainer: base => ({ ...base, padding: '0 4px' }),
                    input: base => ({ ...base, margin: 0, padding: 0 }),
                    menu: base => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          )}
        </thead>
        <tbody>
          {filteredRequirements.length === 0 && !loading ? (
            <tr><td colSpan={7} style={{ textAlign: "center" }}>No requirements yet.</td></tr>
          ) : filteredRequirements.map(req => (
            <tr key={req.id}>
              <td><input type="checkbox" checked={selected.includes(req.id)} onChange={e => setSelected(e.target.checked ? [...selected, req.id] : selected.filter(id => id !== req.id))} /></td>
              <td>{req.category}</td>
              <td>{req.requirement}</td>
              <td>{parseProducts(req.product).join(', ')}</td>
              <td>
                {req.doc_link && (
                  <Tooltip content="Doc Link">
                    <a className="icon-btn" href={req.doc_link} target="_blank" rel="noopener noreferrer" aria-label="Doc Link">
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="2" width="12" height="16" rx="2" fill="#E8F0FF" stroke="#0254EC" strokeWidth="1.5"/>
                        <rect x="6" y="6" width="8" height="1.2" rx="0.6" fill="#0254EC" />
                        <rect x="6" y="9" width="8" height="1.2" rx="0.6" fill="#0254EC" />
                        <rect x="6" y="12" width="5" height="1.2" rx="0.6" fill="#0254EC" />
                      </svg>
                    </a>
                  </Tooltip>
                )}
                {req.tenant_link && (
                  <Tooltip content="Tenant Link">
                    <a className="icon-btn" href={req.tenant_link} target="_blank" rel="noopener noreferrer" aria-label="Tenant Link">
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <text x="3" y="16" fontFamily="Inter, Arial, sans-serif" fontWeight="bold" fontSize="14" fill="#0254EC">W</text>
                        <g>
                          <line x1="15" y1="5" x2="19" y2="5" stroke="#0254EC" strokeWidth="1.5"/>
                          <line x1="17" y1="3" x2="17" y2="7" stroke="#0254EC" strokeWidth="1.5"/>
                        </g>
                      </svg>
                    </a>
                  </Tooltip>
                )}
              </td>
              <td>
                <a href="#" onClick={e => { e.preventDefault(); setMetaPopup({ anchor: e.currentTarget, req }); }}>Meta</a>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tooltip content="Edit">
                    <button className="icon-btn" onClick={() => handleEdit(req)} aria-label="Edit">
                      <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 13.5V16h2.5l7.1-7.1-2.5-2.5L4 13.5z" fill="#0254EC"/>
                        <path d="M14.7 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.13 1.13 2.5 2.5 1.13-1.13z" fill="#0254EC"/>
                      </svg>
                    </button>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <button className="icon-btn" style={{ color: '#e74c3c' }} disabled={deleteLoadingId === req.id} onClick={() => handleDelete(req.id)} title="Delete">
                      {deleteLoadingId === req.id ? '...' : (
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="5" y="7" width="10" height="8" rx="2" fill="#e74c3c"/>
                          <rect x="8" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                          <rect x="10.5" y="9" width="1.5" height="4" rx="0.75" fill="#fff"/>
                          <rect x="7" y="4" width="6" height="2" rx="1" fill="#e74c3c"/>
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Meta Popup */}
      {metaPopup.req && (
        <div
          style={{
            position: 'fixed',
            top: (metaPopup.anchor?.getBoundingClientRect().bottom || 100) + window.scrollY + 8,
            left: (metaPopup.anchor?.getBoundingClientRect().left || 100) + window.scrollX,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 6,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            padding: 16,
            zIndex: 1000,
            minWidth: 260,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Meta Data</div>
          <div><b>Created By:</b> {metaPopup.req.created_by}</div>
          <div><b>Created At:</b> {formatDate(metaPopup.req.created_at)}</div>
          <div><b>Updated By:</b> {metaPopup.req.updated_by || '-'}</div>
          <div><b>Updated At:</b> {formatDate(metaPopup.req.updated_at) || '-'}</div>
          <button style={{ marginTop: 10 }} onClick={() => setMetaPopup({ anchor: null, req: null })}>Close</button>
        </div>
      )}
      {/* Click outside to close meta popup */}
      {metaPopup.req && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }}
          onClick={() => setMetaPopup({ anchor: null, req: null })}
        />
      )}
      {/* Add/Edit Dialog Placeholder */}
      {showAddEdit && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 400 }}>
            <h2>{editing ? "Edit Requirement" : "Add Requirement"}</h2>
            {!editing && (
              <form onSubmit={handleAddSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label>Category:<br />
                    <input name="category" value={addForm.category} onChange={handleAddChange} required style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Requirement:<br />
                    <input name="requirement" value={addForm.requirement} onChange={handleAddChange} required style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Product:<br />
                    <input name="product" value={addForm.product} onChange={handleAddChange} style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Doc Link:<br />
                    <input name="doc_link" value={addForm.doc_link} onChange={handleAddChange} style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Tenant Link:<br />
                    <input name="tenant_link" value={addForm.tenant_link} onChange={handleAddChange} style={{ width: '100%' }} />
                  </label>
                </div>
                {addError && <div style={{ color: 'red', marginBottom: 8 }}>{addError}</div>}
                <button type="submit" disabled={addLoading}>{addLoading ? 'Adding...' : 'Add Requirement'}</button>
                <button type="button" onClick={() => setShowAddEdit(false)} style={{ marginLeft: 8 }}>Cancel</button>
              </form>
            )}
            {editing && (
              <form onSubmit={handleEditSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label>Category:<br />
                    <input name="category" value={editForm.category} onChange={handleEditChange} required style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Requirement:<br />
                    <input name="requirement" value={editForm.requirement} onChange={handleEditChange} required style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Product:<br />
                    <input name="product" value={editForm.product} onChange={handleEditChange} style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Doc Link:<br />
                    <input name="doc_link" value={editForm.doc_link} onChange={handleEditChange} style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label>Tenant Link:<br />
                    <input name="tenant_link" value={editForm.tenant_link} onChange={handleEditChange} style={{ width: '100%' }} />
                  </label>
                </div>
                {editError && <div style={{ color: 'red', marginBottom: 8 }}>{editError}</div>}
                <button type="submit" disabled={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={() => { setShowAddEdit(false); setEditing(null); }} style={{ marginLeft: 8 }}>Cancel</button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Bulk Upload Dialog */}
      {showBulkUpload && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 400 }}>
            <h2>Bulk Upload</h2>
            <form onSubmit={handleBulkUploadSubmit}>
              <div style={{ marginBottom: 12 }}>
                <input type="file" accept=".csv" onChange={handleBulkFileChange} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <a href="/api/requirements/template" download>Download CSV Template</a>
              </div>
              {bulkError && <div style={{ color: 'red', marginBottom: 8 }}>{bulkError}</div>}
              {bulkSuccess && <div style={{ color: 'green', marginBottom: 8 }}>{bulkSuccess}</div>}
              <button type="submit" disabled={bulkLoading}>{bulkLoading ? 'Uploading...' : 'Upload'}</button>
              <button type="button" onClick={() => { setShowBulkUpload(false); setBulkFile(null); setBulkError(null); setBulkSuccess(null); }} style={{ marginLeft: 8 }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
      {deleteError && <div style={{ color: 'red', marginTop: 8 }}>{deleteError}</div>}
      {massDeleteError && <div style={{ color: 'red', marginTop: 8 }}>{massDeleteError}</div>}
      {/* Mass Edit Dialog */}
      {showMassEdit && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 8, minWidth: 400 }}>
            <h2>Mass Edit Requirements</h2>
            <form onSubmit={handleMassEditSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label>Category:<br />
                  <input name="category" value={massEditForm.category} onChange={handleMassEditChange} style={{ width: '100%' }} />
                </label>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Product:<br />
                  <input name="product" value={massEditForm.product} onChange={handleMassEditChange} style={{ width: '100%' }} />
                </label>
              </div>
              {massEditError && <div style={{ color: 'red', marginBottom: 8 }}>{massEditError}</div>}
              {massEditSuccess && <div style={{ color: 'green', marginBottom: 8 }}>{massEditSuccess}</div>}
              <button type="submit" disabled={massEditLoading}>{massEditLoading ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setShowMassEdit(false)} style={{ marginLeft: 8 }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
      {/* Mass Add Dialog */}
      {showMassAdd && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="modal" style={{ minWidth: 420 }}>
            <h2>Add to Success Criteria</h2>
            {criteriaLoading ? <div>Loading...</div> : criteriaError ? <div style={{ color: 'red' }}>{criteriaError}</div> : (
              <form onSubmit={handleMassAddSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label>Select Document:<br />
                    <select value={selectedCriteriaId || ''} onChange={e => setSelectedCriteriaId(Number(e.target.value))} style={{ width: '100%' }} required>
                      <option value="" disabled>Select...</option>
                      {criteriaList.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="button" className="primary-btn" style={{ marginBottom: 12 }} onClick={() => setShowCreateCriteria(true)}>Create New</button>
                {massAddError && <div style={{ color: 'red', marginBottom: 8 }}>{massAddError}</div>}
                <button type="submit" className="primary-btn" disabled={massAddLoading}>{massAddLoading ? 'Adding...' : 'Add to Selected'}</button>
                <button type="button" onClick={() => setShowMassAdd(false)} style={{ marginLeft: 8 }}>Cancel</button>
              </form>
            )}
            {/* Create New Criteria Dialog (nested) */}
            {showCreateCriteria && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
                <div className="modal" style={{ minWidth: 400 }}>
                  <h3>Create Success Criteria</h3>
                  <form onSubmit={handleCreateCriteriaSubmit}>
                    <div style={{ marginBottom: 12 }}>
                      <label>Title:<br />
                        <input name="title" value={createCriteriaForm.title} onChange={handleCreateCriteriaChange} required style={{ width: '100%' }} />
                      </label>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label>Description:<br />
                        <textarea name="description" value={createCriteriaForm.description} onChange={handleCreateCriteriaChange} style={{ width: '100%' }} />
                      </label>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label>Shared With (comma-separated emails):<br />
                        <input name="shared_with" value={createCriteriaForm.shared_with} onChange={handleCreateCriteriaChange} style={{ width: '100%' }} />
                      </label>
                    </div>
                    {createCriteriaError && <div style={{ color: 'red', marginBottom: 8 }}>{createCriteriaError}</div>}
                    <button type="submit" className="primary-btn" disabled={createCriteriaLoading}>{createCriteriaLoading ? 'Creating...' : 'Create'}</button>
                    <button type="button" onClick={() => setShowCreateCriteria(false)} style={{ marginLeft: 8 }}>Cancel</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsPage; 