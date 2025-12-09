import React from 'react'
import { Link } from 'react-router-dom'

export default function AdminDashboard() {
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.is_super_admin;
  
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        
        {isSuperAdmin && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded">
            <h3 className="font-semibold text-purple-800 mb-2">Super Admin Access</h3>
            <p className="text-sm text-purple-700 mb-3">
              You have super admin privileges. You can manage all tenants and view cross-tenant data.
            </p>
            <Link
              to="/tenants"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Manage Tenants
            </Link>
          </div>
        )}
        
        {user?.tenant_name && (
          <div className="mb-4 text-sm text-slate-600">
            Current Organization: <strong>{user.tenant_name}</strong>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded shadow">Customer Details (placeholder)</div>
          <div className="p-4 bg-white rounded shadow">Calendar / ToDo (placeholder)</div>
          <div className="p-4 bg-white rounded shadow">Email Box & Tickets (placeholder)</div>
        </div>
      </div>
    </div>
  )
}
