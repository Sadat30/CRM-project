import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function Contacts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    job_title: '',
    dob: '',
    notes: '',
    tags: '',
    custom_fields: []
  });
  const [timeline, setTimeline] = useState([]);
  const [relationships, setRelationships] = useState([]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/contacts?q=${searchQuery}&include_fields=true`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setList(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedContact) {
        await axios.put(`${API_BASE}/contacts/${selectedContact.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        await axios.post(`${API_BASE}/contacts`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      }
      setShowModal(false);
      setSelectedContact(null);
      setFormData({
        name: '', company: '', phone: '', email: '', job_title: '', dob: '', notes: '', tags: '', custom_fields: []
      });
      loadContacts();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save contact');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await axios.delete(`${API_BASE}/contacts/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadContacts();
      if (selectedContact?.id === id) {
        setShowDetails(false);
        setSelectedContact(null);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete contact');
    }
  };

  const loadContactDetails = async (contact) => {
    try {
      const res = await axios.get(`${API_BASE}/contacts/${contact.id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setSelectedContact(res.data);
      setFormData({
        name: res.data.name || '',
        company: res.data.company || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
        job_title: res.data.job_title || '',
        dob: res.data.dob || '',
        notes: res.data.notes || '',
        tags: res.data.tags || '',
        custom_fields: res.data.custom_fields || []
      });

      // Load timeline
      const timelineRes = await axios.get(`${API_BASE}/contacts/${contact.id}/timeline`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setTimeline(timelineRes.data);
      setRelationships(res.data.relationships || []);
      setShowDetails(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load contact details');
    }
  };

  const addCustomField = () => {
    setFormData({
      ...formData,
      custom_fields: [...formData.custom_fields, { field_name: '', field_value: '', field_type: 'text' }]
    });
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...formData.custom_fields];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, custom_fields: updated });
  };

  const removeCustomField = (index) => {
    setFormData({
      ...formData,
      custom_fields: formData.custom_fields.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Contacts</h2>
        <button
          onClick={() => {
            setSelectedContact(null);
            setFormData({
              name: '', company: '', phone: '', email: '', job_title: '', dob: '', notes: '', tags: '', custom_fields: []
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Contact
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-lg shadow hover:shadow-lg cursor-pointer transition"
              onClick={() => loadContactDetails(c)}
            >
              <div className="font-semibold text-lg">{c.name}</div>
              {c.company && <div className="text-sm text-slate-600">{c.company}</div>}
              {c.email && <div className="text-sm text-slate-500">{c.email}</div>}
              {c.phone && <div className="text-sm text-slate-500">{c.phone}</div>}
              {c.tags && (
                <div className="mt-2">
                  {c.tags.split(',').map((tag, i) => (
                    <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{selectedContact ? 'Edit Contact' : 'Add Contact'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="tag1, tag2, tag3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows="3"
                />
              </div>

              {/* Custom Fields */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Custom Fields</label>
                  <button
                    type="button"
                    onClick={addCustomField}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Field
                  </button>
                </div>
                {formData.custom_fields.map((field, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Field name"
                      value={field.field_name}
                      onChange={(e) => updateCustomField(index, 'field_name', e.target.value)}
                      className="px-3 py-2 border rounded"
                    />
                    <select
                      value={field.field_type}
                      onChange={(e) => updateCustomField(index, 'field_type', e.target.value)}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="url">URL</option>
                      <option value="textarea">Textarea</option>
                    </select>
                    <input
                      type={field.field_type === 'date' ? 'date' : field.field_type === 'number' ? 'number' : 'text'}
                      placeholder="Value"
                      value={field.field_value}
                      onChange={(e) => updateCustomField(index, 'field_value', e.target.value)}
                      className="px-3 py-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedContact(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {selectedContact ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Details Modal */}
      {showDetails && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedContact.name}</h3>
                {selectedContact.company && <p className="text-slate-600">{selectedContact.company}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(selectedContact.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedContact(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedContact.email && <div><strong>Email:</strong> {selectedContact.email}</div>}
                  {selectedContact.phone && <div><strong>Phone:</strong> {selectedContact.phone}</div>}
                  {selectedContact.job_title && <div><strong>Job Title:</strong> {selectedContact.job_title}</div>}
                  {selectedContact.dob && <div><strong>Date of Birth:</strong> {selectedContact.dob}</div>}
                  {selectedContact.tags && (
                    <div>
                      <strong>Tags:</strong>{' '}
                      {selectedContact.tags.split(',').map((tag, i) => (
                        <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {selectedContact.custom_fields && selectedContact.custom_fields.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Custom Fields</h4>
                    <div className="space-y-1 text-sm">
                      {selectedContact.custom_fields.map((field, i) => (
                        <div key={i}>
                          <strong>{field.field_name}:</strong> {field.field_value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContact.notes && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Notes</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedContact.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Activity Timeline</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {timeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity yet</p>
                  ) : (
                    timeline.map((activity) => (
                      <div key={activity.id} className="p-2 bg-slate-50 rounded text-sm">
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
