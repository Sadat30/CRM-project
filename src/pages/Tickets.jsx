import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [suggestedArticles, setSuggestedArticles] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    title: '',
    description: '',
    priority: 'medium',
    workflow_stage: 'open'
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // Search knowledge base when title or description changes
  useEffect(() => {
    const searchKB = async () => {
      if (formData.title || formData.description) {
        const searchQuery = `${formData.title} ${formData.description}`.trim();
        if (searchQuery.length > 3) {
          try {
            const res = await axios.get(`${API_BASE}/knowledge-base?search=${encodeURIComponent(searchQuery)}&limit=3`);
            setSuggestedArticles(res.data);
            setShowSuggestions(res.data.length > 0);
          } catch (err) {
            console.error('Failed to search knowledge base:', err);
          }
        } else {
          setSuggestedArticles([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestedArticles([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(searchKB, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.title, formData.description]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, contactsRes] = await Promise.all([
        axios.get(`${API_BASE}/tickets${filterStatus ? `?status=${filterStatus}` : ''}`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }),
        axios.get(`${API_BASE}/contacts`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        })
      ]);
      
      setTickets(ticketsRes.data);
      setContacts(contactsRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedTicket) {
        await axios.put(`${API_BASE}/tickets/${selectedTicket.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        await axios.post(`${API_BASE}/tickets`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      }
      setShowModal(false);
      setSelectedTicket(null);
      setFormData({
        customer_id: '', title: '', description: '', priority: 'medium', workflow_stage: 'open'
      });
      setSuggestedArticles([]);
      setShowSuggestions(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save ticket');
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await axios.put(
        `${API_BASE}/tickets/${ticketId}`,
        { status: newStatus },
        {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      );
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await axios.delete(`${API_BASE}/tickets/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete ticket');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Support Tickets</h2>
        <button
          onClick={() => {
            setSelectedTicket(null);
            setFormData({
              customer_id: '', title: '', description: '', priority: 'medium', workflow_stage: 'open'
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Ticket
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-4 py-2 rounded ${filterStatus === '' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('open')}
          className={`px-4 py-2 rounded ${filterStatus === 'open' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          Open
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`px-4 py-2 rounded ${filterStatus === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilterStatus('closed')}
          className={`px-4 py-2 rounded ${filterStatus === 'closed' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
        >
          Closed
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold">{ticket.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </div>
                {ticket.customer_name && (
                  <div className="text-sm text-slate-600 mb-2">
                    Customer: {ticket.customer_name} {ticket.customer_email ? `(${ticket.customer_email})` : ''}
                  </div>
                )}
                {ticket.description && (
                  <p className="text-sm text-slate-700 mb-2">{ticket.description}</p>
                )}
                <div className="text-xs text-slate-500">
                  Created: {new Date(ticket.created_at).toLocaleString()}
                  {ticket.assigned_to_name && ` • Assigned to: ${ticket.assigned_to_name}`}
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                  className="text-sm px-2 py-1 border rounded"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setFormData({
                      customer_id: ticket.customer_id || '',
                      title: ticket.title || '',
                      description: ticket.description || '',
                      priority: ticket.priority || 'medium',
                      workflow_stage: ticket.workflow_stage || 'open'
                    });
                    setShowModal(true);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(ticket.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-8 text-slate-500">No tickets found</div>
        )}
      </div>

      {/* Add/Edit Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">{selectedTicket ? 'Edit Ticket' : 'New Ticket'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="">Select customer...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    rows="4"
                  />
                  {/* Knowledge Base Suggestions */}
                  {showSuggestions && suggestedArticles.length > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-800">
                          💡 Suggested Solutions (Case Deflection)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="space-y-2">
                        {suggestedArticles.map((article) => (
                          <div key={article.id} className="bg-white p-2 rounded border border-blue-100">
                            <div className="font-medium text-sm">{article.title}</div>
                            <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                              {article.content.substring(0, 150)}...
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-slate-500">
                                {article.views} views • {article.helpful_count} helpful
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowModal(false);
                                  window.location.href = `/knowledge-base`;
                                  setTimeout(() => {
                                    const articleElement = document.querySelector(`[data-article-id="${article.id}"]`);
                                    if (articleElement) {
                                      articleElement.scrollIntoView({ behavior: 'smooth' });
                                      articleElement.click();
                                    }
                                  }, 100);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                View Article →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        These articles might help resolve the issue without creating a ticket.
                      </p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Workflow Stage</label>
                    <select
                      value={formData.workflow_stage}
                      onChange={(e) => setFormData({ ...formData, workflow_stage: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {selectedTicket ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

