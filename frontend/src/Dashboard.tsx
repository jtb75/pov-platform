import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { apiRequest } from './utils/api';

const COLORS = ['#0254EC', '#E8F0FF', '#FFBFD6', '#3C4948', '#CADAFF', '#7E7E7E', '#001142'];

// Dashboard.tsx
// Displays summary statistics and graphs for requirements, including breakdowns by category/product and link coverage.
const Dashboard: React.FC = () => {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Helper to parse product string
  const parseProducts = (product: string | undefined | null): string[] => {
    if (!product) return [];
    return product.split(/[,;]/).map(p => p.trim()).filter(Boolean);
  };

  // Data for graphs
  const total = requirements.length;
  const byCategory: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  let withDoc = 0;
  let withTenant = 0;
  requirements.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    parseProducts(r.product).forEach(p => {
      byProduct[p] = (byProduct[p] || 0) + 1;
    });
    if (r.doc_link) withDoc++;
    if (r.tenant_link) withTenant++;
  });
  const categoryData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  const productData = Object.entries(byProduct).map(([name, value]) => ({ name, value }));
  const docPie = [
    { name: 'With Doc Link', value: withDoc },
    { name: 'No Doc Link', value: total - withDoc },
  ];
  const tenantPie = [
    { name: 'With Tenant Link', value: withTenant },
    { name: 'No Tenant Link', value: total - withTenant },
  ];

  return (
    <>
      <h1>Dashboard</h1>
      {loading && <div>Loading requirements...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {!loading && !error && (
        <>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>
            Total Requirements: {total}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40 }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <h3>By Category</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={13} />
                  <YAxis allowDecimals={false} fontSize={13} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="var(--blue-wizard)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 320 }}>
              <h3>By Product</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={productData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={13} />
                  <YAxis allowDecimals={false} fontSize={13} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="var(--deep-gray)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3>Doc Link Coverage</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={docPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {docPie.map((entry, idx) => <Cell key={entry.name} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3>Tenant Link Coverage</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={tenantPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {tenantPie.map((entry, idx) => <Cell key={entry.name} fill={COLORS[(idx+2) % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default Dashboard; 