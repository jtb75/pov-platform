import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { apiRequest, parseProducts } from './utils/api';

interface Requirement {
  category: string;
  product?: string;
}

const Dashboard: React.FC = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        const data = await apiRequest('/api/requirements');
        setRequirements(data);
      } catch (e: any) {
        setError(e.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchRequirements();
  }, []);

  const { chartData, products } = useMemo(() => {
    if (requirements.length === 0) {
      return { chartData: [], products: [] };
    }

    const productsSet = new Set<string>();
    const dataMap = new Map<string, any>();

    requirements.forEach(req => {
      const category = req.category || 'Uncategorized';
      
      const productNames = parseProducts(req.product);
      if (productNames.length === 0) {
        productNames.push('N/A');
      }
      
      productNames.forEach(pName => productsSet.add(pName));

      if (!dataMap.has(category)) {
        dataMap.set(category, { name: category });
      }

      const categoryData = dataMap.get(category);
      productNames.forEach(pName => {
        categoryData[pName] = (categoryData[pName] || 0) + 1;
      });
    });

    return { 
      chartData: Array.from(dataMap.values()), 
      products: Array.from(productsSet).sort()
    };
  }, [requirements]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

  const CustomYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <g transform={`translate(${x},${y})`}>
        <Link to="/requirements" state={{ category: payload.value }}>
          <text x={0} y={0} dy={4} textAnchor="end" fill="#666" fontSize={12}>
            {payload.value}
          </text>
        </Link>
      </g>
    );
  };

  if (loading) return <div>Loading dashboard data...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 120px)' }}>
      <h1>Dashboard</h1>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{
            top: 20, right: 30, left: 100, bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={250} tick={<CustomYAxisTick />} />
          <Tooltip />
          <Legend />
          {products.map((product, index) => (
            <Bar key={product} dataKey={product} stackId="a" fill={COLORS[index % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Dashboard; 