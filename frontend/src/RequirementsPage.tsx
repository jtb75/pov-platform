import React, { useState, useEffect, useMemo } from "react";
import './Table.css';
import Tooltip from './Tooltip';
import Select from 'react-select';
import { apiRequest, parseProducts } from './utils/api';
import { useLocation } from 'react-router-dom';

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

interface SortConfig {
  key: keyof Requirement | null;
  direction: 'ascending' | 'descending';
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
    category: [] as string[],
    requirement: '',
    product: [] as string[],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddToScdModal, setShowAddToScdModal] = useState(false);
  const [scdList, setScdList] = useState<any[]>([]);
  const [selectedScdId, setSelectedScdId] = useState<number | null>(null);
  const [addToScdLoading, setAddToScdLoading] = useState(false);
  const [addToScdError, setAddToScdError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.category) {
      setFilters(f => ({ ...f, category: [location.state.category] }));
      setShowFilters(true);
    }
  }, [location.state]);

  // Collect all unique category values
  useEffect(() => {
    const categoriesSet = new Set<string>();
    requirements.forEach(r => {
      if (r.category) {
        categoriesSet.add(r.category);
      }
    });
    setAllCategories(Array.from(categoriesSet).sort());
  }, [requirements]);

  // For react-select
  const productOptions = allProducts.map(p => ({ value: p, label: p }));
  const categoryOptions = allCategories.map(c => ({ value: c, label: c }));

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
        const data = await apiRequest("/api/requirements");
        setRequirements(data);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchRequirements();
  }, []);

  // Filtered and sorted requirements
  const sortedAndFilteredRequirements = useMemo(() => {
    let filtered = requirements.filter(r =>
      (filters.category.length === 0 || filters.category.includes(r.category)) &&
      (filters.requirement === '' || r.requirement.toLowerCase().includes(filters.requirement.toLowerCase())) &&
      (
        filters.product.length === 0 ||
        parseProducts(r.product).some(p => filters.product.includes(p))
      )
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [requirements, filters, sortConfig]);

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
      await apiRequest(`/api/requirements/${id}`, { method: 'DELETE' });
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
      await apiRequest('/api/requirements/mass-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      });
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
      const data = await apiRequest('/api/requirements', {
        method: 'POST',
        body: JSON.stringify(addForm),
      });
      setRequirements(reqs => [...reqs, data]);
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
      const data = await apiRequest(`/api/requirements/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category: editForm.category,
          requirement: editForm.requirement,
          product: editForm.product,
          doc_link: editForm.doc_link,
          tenant_link: editForm.tenant_link,
        }),
      });
      setRequirements(reqs => reqs.map(r => r.id === data.id ? data : r));
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
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', bulkFile);
      const data = await apiRequest('/api/requirements/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      setBulkSuccess(`Uploaded ${data.count} requirements.`);
      setBulkFile(null);
      // Refresh requirements list
      const reqData = await apiRequest('/api/requirements');
      setRequirements(reqData);
      // Auto-close dialog after short delay
      setTimeout(() => {
        setShowBulkUpload(false);
        setBulkSuccess(null);
      }, 2000);
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
      const data = await apiRequest('/api/requirements/mass-edit', {
        method: 'POST',
        body: JSON.stringify({
          ids: selected,
          updates: {
            category: massEditForm.category,
            product: massEditForm.product,
          },
        }),
      });
      // The API returns a count, not the updated list.
      // Re-fetch the requirements to get the latest data.
      const updatedRequirements = await apiRequest('/api/requirements');
      setRequirements(updatedRequirements);
      setMassEditSuccess('Mass edit successful.');
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

  const handleCategorySelect = (selected: any) => {
    setFilters(f => ({ ...f, category: selected ? selected.map((s: any) => s.value) : [] }));
  };

  const handleResetFilters = () => {
    setFilters({ category: [], requirement: '', product: [] });
  };

  const handleToggleFilters = () => setShowFilters(f => !f);

  const requestSort = (key: keyof Requirement) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Requirement) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  // Helper to format datetime
  const formatDate = (dt?: string | Date) => dt ? new Date(dt).toLocaleString() : '';

  const handleOpenAddToScdModal = async () => {
    if (selected.length === 0) return;
    setShowAddToScdModal(true);
    setAddToScdError(null);
    setAddToScdLoading(true);
    try {
      const data = await apiRequest('/api/scd');
      setScdList(data);
    } catch (err: any) {
      setAddToScdError(err.message || "Failed to fetch SCD list.");
    } finally {
      setAddToScdLoading(false);
    }
  };

  const handleAddToScdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScdId) {
      setAddToScdError("Please select a Success Criteria Document.");
      return;
    }
    setAddToScdLoading(true);
    setAddToScdError(null);
    try {
      // This endpoint doesn't exist yet, we will create it.
      await apiRequest(`/api/scd/${selectedScdId}/requirements`, {
        method: 'PUT',
        body: JSON.stringify({ requirement_ids: selected }),
      });
      setShowAddToScdModal(false);
      setSelected([]);
      setSelectedScdId(null);
      // Optionally, show a success message
    } catch (err: any) {
      setAddToScdError(err.message || "Failed to add requirements to SCD.");
    } finally {
      setAddToScdLoading(false);
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
        <button onClick={handleMassDelete} className="primary-btn danger" style={{ marginLeft: 8 }} disabled={selected.length === 0 || massDeleteLoading}>
          {massDeleteLoading ? 'Deleting...' : 'Mass Delete'}
        </button>
        <button onClick={handleOpenAddToScdModal} className="primary-btn" style={{ marginLeft: 8 }} disabled={selected.length === 0}>Add to SCD</button>
        <button onClick={handleToggleFilters} className="primary-btn" style={{ marginLeft: 8 }}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>
      {showFilters && (
        <div className="filter-panel">
          <Select
            isMulti
            name="category"
            options={categoryOptions}
            value={categoryOptions.filter(opt => filters.category.includes(opt.value))}
            onChange={handleCategorySelect}
            placeholder="Filter Category"
            styles={{
              container: base => ({...base, flex: 1}),
              control: base => ({ ...base, minHeight: 38, borderColor: '#CADAFF', borderRadius: 4, boxSizing: 'border-box' }),
            }}
          />
          <input name="requirement" value={filters.requirement} onChange={handleFilterChange} placeholder="Filter Requirement" className="filter-input" style={{flex: 2}} />
          <Select
            isMulti
            name="product"
            options={productOptions}
            value={productOptions.filter(option => filters.product.includes(option.value))}
            onChange={handleProductSelect}
            placeholder="Filter Product"
            styles={{
              container: base => ({...base, flex: 1}),
              control: base => ({ ...base, minHeight: 38, borderColor: '#CADAFF', borderRadius: 4, boxSizing: 'border-box' }),
            }}
          />
          <button onClick={handleResetFilters} className="reset-button">Reset</button>
        </div>
      )}
      <table className="table-unified requirements-table">
        <thead>
          <tr>
            <th><input type="checkbox" checked={sortedAndFilteredRequirements.length > 0 && selected.length === sortedAndFilteredRequirements.length} onChange={e => setSelected(e.target.checked ? sortedAndFilteredRequirements.map(r => r.id) : [])} /></th>
            <th onClick={() => requestSort('category')}>Category{getSortIndicator('category')}</th>
            <th onClick={() => requestSort('requirement')}>Requirement{getSortIndicator('requirement')}</th>
            <th onClick={() => requestSort('product')}>Product{getSortIndicator('product')}</th>
            <th>Platform Links</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAndFilteredRequirements.length === 0 && !loading ? (
            <tr><td colSpan={6} style={{ textAlign: "center" }}>No requirements yet.</td></tr>
          ) : sortedAndFilteredRequirements.map(req => (
            <tr key={req.id}>
              <td><input type="checkbox" checked={selected.includes(req.id)} onChange={e => setSelected(e.target.checked ? [...selected, req.id] : selected.filter(id => id !== req.id))} /></td>
              <td className="category-cell">{req.category}</td>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
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
      {/* Add to SCD Dialog */}
      {showAddToScdModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Add {selected.length} requirement(s) to...</h2>
            {addToScdError && <p className="error-message">{addToScdError}</p>}
            <form onSubmit={handleAddToScdSubmit}>
              <div className="form-group">
                <label htmlFor="scd-select">Select Document</label>
                {scdList.length > 0 ? (
                  <select
                    id="scd-select"
                    value={selectedScdId || ''}
                    onChange={e => setSelectedScdId(Number(e.target.value))}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="" disabled>Select an SCD...</option>
                    {scdList.map((scd: any) => (
                      <option key={scd.id} value={scd.id}>{scd.name}</option>
                    ))}
                  </select>
                ) : (
                  <p>No SCDs found. You can create one from the Success Criteria page.</p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddToScdModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={addToScdLoading || !selectedScdId}>
                  {addToScdLoading ? 'Adding...' : 'Add to SCD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementsPage; 