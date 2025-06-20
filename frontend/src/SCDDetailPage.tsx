import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest, formatDate } from './utils/api';
import './Table.css';
import Select from 'react-select';

// These interfaces can be moved to a shared types file later
interface User {
  email: string;
  name?: string | null;
  picture?: string | null;
  role: string;
}

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

interface SCDOut {
  id: number;
  name: string;
  description?: string | null;
  owner: User;
  created_at: string;
  updated_at: string;
  requirements: SCDRequirementOut[];
}

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

const SCDDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [scd, setScd] = useState<SCDOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New state for the "Add Requirements" modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [masterRequirements, setMasterRequirements] = useState<Requirement[]>([]);
  const [selectedReqs, setSelectedReqs] = useState<Set<number>>(new Set());
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // New state for modal filters
  const [modalFilters, setModalFilters] = useState({
    category: [] as string[],
    requirement: '',
    product: [] as string[],
  });

  // State for dropdown options
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allProducts, setAllProducts] = useState<string[]>([]);

  const fetchScd = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/api/scd/${id}`);
      setScd(data);
    } catch (err: any) {
      setError(err.message || `Failed to fetch document with ID ${id}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScd();
  }, [id]);

  const handleOpenAddModal = async () => {
    setShowAddModal(true);
    setAddLoading(true);
    setAddError(null);
    try {
      const masterList = await apiRequest('/api/requirements');
      // Filter out requirements already in the SCD
      const existingIds = new Set(scd?.requirements.map((r: SCDRequirementOut) => r.original_requirement_id));
      const availableReqs = masterList.filter((r: Requirement) => !existingIds.has(r.id));
      setMasterRequirements(availableReqs);

      // Pre-populate filter dropdowns
      const categoriesSet = new Set<string>();
      const productsSet = new Set<string>();
      availableReqs.forEach((r: Requirement) => {
        categoriesSet.add(r.category);
        (r.product || '').split(/[,;]/).map(p => p.trim()).filter(Boolean).forEach(p => productsSet.add(p));
      });
      setAllCategories(Array.from(categoriesSet).sort());
      setAllProducts(Array.from(productsSet).sort());

    } catch (err: any) {
      setAddError(err.message || "Failed to load master requirements list.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleModalFilterChange = (filterName: 'requirement', value: string) => {
    setModalFilters(prev => ({ ...prev, [filterName]: value }));
  };
  
  const handleMultiSelectChange = (filterName: 'category' | 'product', selectedOptions: any) => {
    const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
    setModalFilters(prev => ({ ...prev, [filterName]: values }));
  };

  const filteredMasterRequirements = React.useMemo(() => {
    return masterRequirements.filter(req => {
      const categoryMatch = modalFilters.category.length === 0 || modalFilters.category.includes(req.category);
      const requirementMatch = req.requirement.toLowerCase().includes(modalFilters.requirement.toLowerCase());
      const productMatch = modalFilters.product.length === 0 || (req.product || '').split(/[,;]/).map(p => p.trim()).filter(Boolean).some(p => modalFilters.product.includes(p));
      return categoryMatch && requirementMatch && productMatch;
    });
  }, [masterRequirements, modalFilters]);

  const handleReqSelect = (reqId: number) => {
    const newSelection = new Set(selectedReqs);
    if (newSelection.has(reqId)) {
      newSelection.delete(reqId);
    } else {
      newSelection.add(reqId);
    }
    setSelectedReqs(newSelection);
  };

  const handleAddSubmit = async () => {
    if (!id || selectedReqs.size === 0) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await apiRequest(`/api/scd/${id}/requirements`, {
        method: 'PUT',
        body: JSON.stringify({ requirement_ids: Array.from(selectedReqs) }),
      });
      setShowAddModal(false);
      setSelectedReqs(new Set());
      await fetchScd(); // Refresh the SCD data
    } catch (err: any)
    {
      setAddError(err.message || "Failed to add requirements.");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return <div>Loading document...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!scd) {
    return <div>Document not found.</div>;
  }

  return (
    <div className="page-container">
      <h1>{scd.name}</h1>
      <p style={{ color: 'var(--text-color-light)', marginTop: '-10px', marginBottom: '20px' }}>
        Owned by {scd.owner.name || scd.owner.email}
      </p>
      {scd.description && <p>{scd.description}</p>}

      <hr style={{ margin: '20px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Requirements in this Document</h2>
        <button className="primary-btn" onClick={handleOpenAddModal}>Add Requirements</button>
      </div>

      {scd.requirements.length === 0 ? (
        <p>This document does not contain any requirements yet.</p>
      ) : (
        <table className="table-unified requirements-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Category</th>
              <th>Requirement</th>
              <th>Product(s)</th>
            </tr>
          </thead>
          <tbody>
            {scd.requirements.sort((a, b) => a.order - b.order).map((req, index) => (
              <tr key={req.id}>
                <td>{index + 1}</td>
                <td>{req.category}</td>
                <td>{req.requirement}</td>
                <td>{req.product}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ minWidth: '80vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2>Add Master Requirements</h2>
            {addError && <p className="error-message">{addError}</p>}
            <div style={{ flexGrow: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px', marginBottom: '16px' }}>
              <table className="table-unified">
                <thead>
                  <tr>
                    <th></th>
                    <th>Category</th>
                    <th>Requirement</th>
                    <th>Product(s)</th>
                  </tr>
                  <tr>
                    <th></th>
                    <th>
                      <Select
                        isMulti
                        options={allCategories.map(c => ({ value: c, label: c }))}
                        onChange={selected => handleMultiSelectChange('category', selected)}
                        placeholder="Filter by category..."
                        styles={{ container: base => ({ ...base, fontSize: '14px' }) }}
                      />
                    </th>
                    <th>
                      <input type="text" name="requirement" placeholder="Filter by keyword..." onChange={(e) => handleModalFilterChange('requirement', e.target.value)} className="filter-input" />
                    </th>
                    <th>
                      <Select
                        isMulti
                        options={allProducts.map(p => ({ value: p, label: p }))}
                        onChange={selected => handleMultiSelectChange('product', selected)}
                        placeholder="Filter by product..."
                        styles={{ container: base => ({ ...base, fontSize: '14px' }) }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {addLoading && !masterRequirements.length ? (
                    <tr><td colSpan={4}>Loading...</td></tr>
                  ) : filteredMasterRequirements.map(req => (
                    <tr key={req.id} onClick={() => handleReqSelect(req.id)} style={{ cursor: 'pointer', background: selectedReqs.has(req.id) ? 'var(--primary-color-light)' : 'transparent' }}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedReqs.has(req.id)}
                          onChange={() => handleReqSelect(req.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="wrap-text">{req.category}</td>
                      <td className="wrap-text">{req.requirement}</td>
                      <td>{req.product}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              <button className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleAddSubmit} disabled={addLoading || selectedReqs.size === 0}>
                {addLoading ? 'Adding...' : `Add ${selectedReqs.size} Selected Requirement(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SCDDetailPage; 