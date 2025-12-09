import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function Register() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [full_name, setFull] = useState('');
  const [username, setUser] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
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

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedTenant) {
      alert('Please select a tenant');
      return;
    }

    try {
      await axios.post(`${API_BASE}/auth/register`, {
        full_name,
        username,
        email,
        password,
        phone,
        role,
        tenant_id: selectedTenant.id
      });
      alert('Registered. Please login.');
      nav('/login');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="p-8 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Register</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Organization *</label>
          <select
            value={selectedTenant?.id || ''}
            onChange={(e) => {
              const tenant = tenants.find(t => t.id === parseInt(e.target.value));
              setSelectedTenant(tenant);
            }}
            className="w-full p-2 border rounded"
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
        
        <label className="block mb-2">
          Full name
          <input value={full_name} onChange={e => setFull(e.target.value)} className="w-full p-2 border rounded" required />
        </label>
        <label className="block mb-2">
          Username
          <input value={username} onChange={e => setUser(e.target.value)} className="w-full p-2 border rounded" required />
        </label>
        <label className="block mb-2">
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
        </label>
        <label className="block mb-2">
          Phone
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded" />
        </label>
        <label className="block mb-2">
          Password
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
        </label>
        <div className="mb-4">
          <label className="mr-2">
            <input type="radio" checked={role === 'admin'} onChange={() => setRole('admin')} /> Register as Admin
          </label>
          <label className="ml-4">
            <input type="radio" checked={role === 'customer'} onChange={() => setRole('customer')} /> Register as Customer
          </label>
        </div>
        <button
          type="submit"
          disabled={!selectedTenant}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          Register
        </button>
        
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => nav('/login')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Already have an account? Login
          </button>
        </div>
      </form>
    </div>
  );
}
