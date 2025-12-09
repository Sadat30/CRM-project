import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function TenantManagement() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    domain: ''
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/tenants`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setTenants(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await axios.put(`${API_BASE}/tenants/${editingTenant.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        await axios.post(`${API_BASE}/tenants`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      }
      setShowModal(false);
      setEditingTenant(null);
      setFormData({ name: '', slug: '', domain: '' });
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save tenant');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tenant? This will delete all associated data.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/tenants/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadTenants();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete tenant');
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tenant Management</h2>
        <button
          onClick={() => {
            setEditingTenant(null);
            setFormData({ name: '', slug: '', domain: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Create Tenant
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacts</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{tenant.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.slug}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tenant.domain || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{tenant.user_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{tenant.contact_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{tenant.deal_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => {
                      setEditingTenant(tenant);
                      setFormData({
                        name: tenant.name || '',
                        slug: tenant.slug || '',
                        domain: tenant.domain || ''
                      });
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  {tenant.slug !== 'default' && (
                    <button
                      onClick={() => handleDelete(tenant.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingTenant ? 'Edit Tenant' : 'Create New Tenant'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: editingTenant ? formData.slug : generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., acme-corp"
                    pattern="[a-z0-9-]+"
                    title="Only lowercase letters, numbers, and hyphens"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    URL-friendly identifier (lowercase, numbers, hyphens only)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Domain (optional)</label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., acme.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {editingTenant ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

