import React from 'react'
import { Link } from 'react-router-dom'
export default function Nav(){
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isSuperAdmin = user?.is_super_admin;
  
  return (
    <nav className="bg-white p-3 shadow mb-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to='/' className="font-bold text-lg">SimpleCRM</Link>
          {token && (
            <>
              <Link to='/contacts' className="text-sm hover:text-blue-600">Contacts</Link>
              <Link to='/deals' className="text-sm hover:text-blue-600">Deals</Link>
              <Link to='/tasks' className="text-sm hover:text-blue-600">Tasks</Link>
              <Link to='/tickets' className="text-sm hover:text-blue-600">Tickets</Link>
              <Link to='/import' className="text-sm hover:text-blue-600">Import</Link>
              <Link to='/knowledge-base' className="text-sm hover:text-blue-600">Knowledge Base</Link>
              {isSuperAdmin && (
                <Link to='/tenants' className="text-sm hover:text-blue-600 font-semibold text-purple-600">Tenants</Link>
              )}
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {token ? (
            <>
              {user?.tenant_name && (
                <span className="text-xs text-slate-500">{user.tenant_name}</span>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  localStorage.removeItem('tenant_id');
                  localStorage.removeItem('tenant_slug');
                  window.location.href = '/';
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to='/login' className="text-sm hover:text-blue-600">Login</Link>
              <Link to='/register' className="text-sm hover:text-blue-600">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
