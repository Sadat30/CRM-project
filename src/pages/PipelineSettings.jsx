import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function PipelineSettings() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [draggedStage, setDraggedStage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    display_order: 0
  });

  useEffect(() => {
    loadStages();
  }, []);

  const loadStages = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/pipeline-stages`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setStages(res.data.sort((a, b) => a.display_order - b.display_order));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load pipeline stages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStage) {
        await axios.put(`${API_BASE}/pipeline-stages/${editingStage.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        // Set display_order to be after the last stage
        const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.display_order)) : 0;
        await axios.post(
          `${API_BASE}/pipeline-stages`,
          { ...formData, display_order: maxOrder + 1 },
          {
            headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
          }
        );
      }
      setShowModal(false);
      setEditingStage(null);
      setFormData({ name: '', color: '#3B82F6', display_order: 0 });
      loadStages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save stage');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stage? Deals in this stage will need to be moved first.')) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/pipeline-stages/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadStages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete stage');
    }
  };

  const handleDragStart = (e, stage) => {
    setDraggedStage(stage);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (!draggedStage || draggedStage.id === targetStage.id) {
      setDraggedStage(null);
      return;
    }

    // Reorder stages
    const newStages = [...stages];
    const draggedIndex = newStages.findIndex(s => s.id === draggedStage.id);
    const targetIndex = newStages.findIndex(s => s.id === targetStage.id);
    
    newStages.splice(draggedIndex, 1);
    newStages.splice(targetIndex, 0, draggedStage);

    // Update display orders
    const stagesToUpdate = newStages.map((stage, index) => ({
      id: stage.id,
      display_order: index + 1
    }));

    try {
      await axios.post(
        `${API_BASE}/pipeline-stages/reorder`,
        { stages: stagesToUpdate },
        {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        }
      );
      loadStages();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reorder stages');
    } finally {
      setDraggedStage(null);
    }
  };

  const presetColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Pipeline Settings</h2>
          <p className="text-sm text-slate-600 mt-1">
            Configure your sales pipeline stages. Drag stages to reorder them.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStage(null);
            setFormData({ name: '', color: '#3B82F6', display_order: 0 });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Stage
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Pipeline Stages</h3>
        {stages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No pipeline stages yet. Create your first stage to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                draggable
                onDragStart={(e) => handleDragStart(e, stage)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 cursor-move transition"
              >
                <div className="flex-shrink-0 text-slate-400">⋮⋮</div>
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: stage.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold">{stage.name}</div>
                  <div className="text-sm text-slate-500">
                    Order: {stage.display_order} {stage.is_default && '• Default Stage'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingStage(stage);
                      setFormData({
                        name: stage.name,
                        color: stage.color,
                        display_order: stage.display_order
                      });
                      setShowModal(true);
                    }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  {!stage.is_default && (
                    <button
                      onClick={() => handleDelete(stage.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Stage Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingStage ? 'Edit Stage' : 'Add New Stage'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Stage Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="e.g., Qualified, Proposal, Negotiation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 mb-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded border-2 ${
                          formData.color === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border rounded"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingStage(null);
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  {editingStage ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

