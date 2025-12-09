import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function TenantLogin() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await axios.get(`${API_BASE}/auth/tenants`);
      setTenants(res.data);
      if (res.data.length === 1) {
        setSelectedTenant(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTenant) {
      alert('Please select a tenant');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email,
        password,
        tenant_slug: selectedTenant.slug
      });
      
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('tenant_id', user.tenant_id);
      localStorage.setItem('tenant_slug', user.tenant_slug);
      
      if (user.is_super_admin) {
        nav('/dashboard/admin');
      } else if (user.role === 'admin') {
        nav('/dashboard/admin');
      } else {
        nav('/dashboard/customer');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login to SimpleCRM</h2>
        
        {tenants.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Organization</label>
            <select
              value={selectedTenant?.id || ''}
              onChange={(e) => {
                const tenant = tenants.find(t => t.id === parseInt(e.target.value));
                setSelectedTenant(tenant);
              }}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select organization...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedTenant && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="text-sm text-slate-600 mb-4 p-2 bg-blue-50 rounded">
                Logging into: <strong>{selectedTenant.name}</strong>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => nav('/register')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Don't have an account? Register
          </button>
        </div>
      </div>
    </div>
  );
}

