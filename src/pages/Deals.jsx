import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function Deals() {
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDealDetails, setSelectedDealDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [dealTimeline, setDealTimeline] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    contact_id: '',
    stage: '',
    value: '',
    probability: '',
    close_date: ''
  });

  // Calculate pipeline statistics
  const pipelineStats = {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
    weightedValue: deals.reduce((sum, d) => {
      const value = parseFloat(d.value) || 0;
      const probability = parseFloat(d.probability) || 0;
      return sum + (value * probability / 100);
    }, 0),
    wonDeals: deals.filter(d => d.stage === 'Closed Won').length,
    wonValue: deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
    lostDeals: deals.filter(d => d.stage === 'Closed Lost').length,
    activeDeals: deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dealsRes, stagesRes, contactsRes] = await Promise.all([
        axios.get(`${API_BASE}/deals`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }),
        axios.get(`${API_BASE}/pipeline-stages`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }),
        axios.get(`${API_BASE}/contacts`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        })
      ]);
      
      setDeals(dealsRes.data);
      setStages(stagesRes.data.sort((a, b) => a.display_order - b.display_order));
      setContacts(contactsRes.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getDealsByStage = (stageName) => {
    let filtered = deals.filter(d => d.stage === stageName || d.stage_name === stageName);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(query) ||
        d.contact_name?.toLowerCase().includes(query) ||
        d.contact_company?.toLowerCase().includes(query)
      );
    }
    return filtered;
  };

  const loadDealDetails = async (deal) => {
    try {
      const [dealRes, timelineRes] = await Promise.all([
        axios.get(`${API_BASE}/deals/${deal.id}`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }),
        axios.get(`${API_BASE}/deals/${deal.id}/timeline`, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        })
      ]);
      setSelectedDealDetails(dealRes.data);
      setDealTimeline(timelineRes.data);
      setShowDetailsModal(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load deal details');
    }
  };

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedDeal || draggedDeal.stage === targetStage) {
      setDraggedDeal(null);
      return;
    }

    try {
      const targetStageData = stages.find(s => s.name === targetStage);
      await axios.put(
        `${API_BASE}/deals/${draggedDeal.id}`,
        {
          stage: targetStage,
          stage_order: targetStageData?.display_order || 0
        },
        {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      );
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update deal');
    } finally {
      setDraggedDeal(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDeal) {
        await axios.put(`${API_BASE}/deals/${selectedDeal.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        await axios.post(`${API_BASE}/deals`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      }
      setShowModal(false);
      setSelectedDeal(null);
      setFormData({
        title: '', contact_id: '', stage: '', value: '', probability: '', close_date: ''
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save deal');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;
    try {
      await axios.delete(`${API_BASE}/deals/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete deal');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-full overflow-x-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Sales Pipeline</h2>
        <div className="flex gap-2">
          <Link
            to="/pipeline-settings"
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
          >
            ⚙️ Pipeline Settings
          </Link>
          <button
            onClick={() => {
              setSelectedDeal(null);
              setFormData({
                title: '', contact_id: '', stage: stages[0]?.name || '', value: '', probability: '', close_date: ''
              });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Deal
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search deals by title, contact, or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded"
        />
      </div>

      {/* Pipeline Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600">Total Pipeline Value</div>
          <div className="text-2xl font-bold text-blue-600">
            ${pipelineStats.totalValue.toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600">Weighted Value</div>
          <div className="text-2xl font-bold text-green-600">
            ${Math.round(pipelineStats.weightedValue).toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600">Active Deals</div>
          <div className="text-2xl font-bold">{pipelineStats.activeDeals}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-slate-600">Win Rate</div>
          <div className="text-2xl font-bold">
            {pipelineStats.totalDeals > 0
              ? Math.round((pipelineStats.wonDeals / (pipelineStats.wonDeals + pipelineStats.lostDeals || 1)) * 100)
              : 0}%
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.name);
          const stageValue = stageDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0);
          const stageWeightedValue = stageDeals.reduce((sum, d) => {
            const value = parseFloat(d.value) || 0;
            const probability = parseFloat(d.probability) || 0;
            return sum + (value * probability / 100);
          }, 0);
          
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80 bg-slate-100 rounded-lg p-4"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.name)}
            >
              <div
                className="font-bold text-lg mb-2 p-2 rounded"
                style={{ backgroundColor: stage.color + '20', color: stage.color }}
              >
                {stage.name}
                <span className="ml-2 text-sm font-normal">({stageDeals.length})</span>
              </div>
              {stageDeals.length > 0 && (
                <div className="text-xs text-slate-600 mb-3 px-2">
                  Value: ${stageValue.toLocaleString()} • Weighted: ${Math.round(stageWeightedValue).toLocaleString()}
                </div>
              )}
              <div className="space-y-2 min-h-[200px]">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => {
                      handleDragStart(e, deal);
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      if (e.target.tagName !== 'BUTTON') {
                        loadDealDetails(deal);
                      }
                    }}
                    className="bg-white p-3 rounded shadow cursor-move hover:shadow-md transition"
                  >
                    <div className="font-semibold cursor-pointer hover:text-blue-600">{deal.title}</div>
                    {deal.contact_name && (
                      <div className="text-sm text-slate-600">{deal.contact_name}</div>
                    )}
                    {deal.value && (
                      <div className="text-sm font-medium text-green-600">
                        ${parseFloat(deal.value).toLocaleString()}
                      </div>
                    )}
                    {deal.probability && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Probability</span>
                          <span>{deal.probability}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${deal.probability}%`,
                              backgroundColor: deal.probability >= 70 ? '#10B981' : deal.probability >= 40 ? '#F59E0B' : '#EF4444'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {deal.close_date && (
                      <div className="text-xs text-slate-500 mt-1">
                        Close: {new Date(deal.close_date).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDeal(deal);
                          setFormData({
                            title: deal.title || '',
                            contact_id: deal.contact_id || '',
                            stage: deal.stage || '',
                            value: deal.value || '',
                            probability: deal.probability || '',
                            close_date: deal.close_date || ''
                          });
                          setShowModal(true);
                        }}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(deal.id);
                        }}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    Drop deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">{selectedDeal ? 'Edit Deal' : 'New Deal'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
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
                  <label className="block text-sm font-medium mb-1">Contact</label>
                  <select
                    value={formData.contact_id}
                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Value ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Probability (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Close Date</label>
                  <input
                    type="date"
                    value={formData.close_date}
                    onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDeal(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {selectedDeal ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deal Details Modal */}
      {showDetailsModal && selectedDealDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold">{selectedDealDetails.title}</h3>
                {selectedDealDetails.contact_name && (
                  <p className="text-slate-600 mt-1">
                    {selectedDealDetails.contact_name}
                    {selectedDealDetails.contact_company && ` • ${selectedDealDetails.contact_company}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedDeal(selectedDealDetails);
                    setFormData({
                      title: selectedDealDetails.title || '',
                      contact_id: selectedDealDetails.contact_id || '',
                      stage: selectedDealDetails.stage || '',
                      value: selectedDealDetails.value || '',
                      probability: selectedDealDetails.probability || '',
                      close_date: selectedDealDetails.close_date || ''
                    });
                    setShowDetailsModal(false);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedDealDetails(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold mb-2">Deal Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Stage:</strong>{' '}
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: selectedDealDetails.stage_color + '20',
                        color: selectedDealDetails.stage_color
                      }}
                    >
                      {selectedDealDetails.stage || selectedDealDetails.stage_name}
                    </span>
                  </div>
                  {selectedDealDetails.value && (
                    <div>
                      <strong>Value:</strong> ${parseFloat(selectedDealDetails.value).toLocaleString()}
                    </div>
                  )}
                  {selectedDealDetails.probability && (
                    <div>
                      <strong>Probability:</strong> {selectedDealDetails.probability}%
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${selectedDealDetails.probability}%`,
                            backgroundColor: selectedDealDetails.probability >= 70 ? '#10B981' : selectedDealDetails.probability >= 40 ? '#F59E0B' : '#EF4444'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selectedDealDetails.close_date && (
                    <div>
                      <strong>Close Date:</strong> {new Date(selectedDealDetails.close_date).toLocaleDateString()}
                    </div>
                  )}
                  <div>
                    <strong>Created:</strong> {new Date(selectedDealDetails.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Activity Timeline</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dealTimeline.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity yet</p>
                  ) : (
                    dealTimeline.map((activity) => (
                      <div key={activity.id} className="p-2 bg-slate-50 rounded text-sm">
                        <div className="font-medium">{activity.title}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(activity.created_at).toLocaleString()}
                          {activity.user_name && ` • ${activity.user_name}`}
                        </div>
                        {activity.description && (
                          <div className="text-xs text-slate-600 mt-1">{activity.description}</div>
                        )}
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
