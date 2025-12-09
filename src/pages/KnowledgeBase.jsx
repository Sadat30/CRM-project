import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: ''
  });

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, [searchQuery, selectedCategory]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const res = await axios.get(`${API_BASE}/knowledge-base?${params.toString()}`);
      setArticles(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/knowledge-base/categories/list`);
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedArticle) {
        await axios.put(`${API_BASE}/knowledge-base/${selectedArticle.id}`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      } else {
        await axios.post(`${API_BASE}/knowledge-base`, formData, {
          headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
        });
      }
      setShowModal(false);
      setSelectedArticle(null);
      setFormData({ title: '', content: '', category: '', tags: '' });
      loadArticles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save article');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    try {
      await axios.delete(`${API_BASE}/knowledge-base/${id}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      loadArticles();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete article');
    }
  };

  const handleViewArticle = async (article) => {
    try {
      const res = await axios.get(`${API_BASE}/knowledge-base/${article.id}`);
      setSelectedArticle(res.data);
      setShowModal(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load article');
    }
  };

  const token = localStorage.getItem('token');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Knowledge Base</h2>
        {token && (
          <button
            onClick={() => {
              setSelectedArticle(null);
              setFormData({ title: '', content: '', category: '', tags: '' });
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Article
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              data-article-id={article.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition cursor-pointer"
              onClick={() => handleViewArticle(article)}
            >
              <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
              {article.category && (
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mb-2">
                  {article.category}
                </span>
              )}
              <p className="text-sm text-slate-600 line-clamp-3 mb-3">
                {article.content}
              </p>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>{article.views} views</span>
                {article.helpful_count > 0 && (
                  <span>👍 {article.helpful_count} helpful</span>
                )}
              </div>
              {token && (
                <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedArticle(article);
                      setFormData({
                        title: article.title || '',
                        content: article.content || '',
                        category: article.category || '',
                        tags: article.tags || ''
                      });
                      setShowModal(true);
                    }}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {articles.length === 0 && (
            <div className="col-span-full text-center py-8 text-slate-500">
              No articles found
            </div>
          )}
        </div>
      )}

      {/* Article Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedArticle ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">{selectedArticle.title}</h3>
                    {selectedArticle.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mt-2">
                        {selectedArticle.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedArticle(null);
                    }}
                    className="px-4 py-2 border rounded"
                  >
                    Close
                  </button>
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-slate-700">{selectedArticle.content}</div>
                </div>
                {selectedArticle.tags && (
                  <div className="mt-4">
                    <strong>Tags:</strong>{' '}
                    {selectedArticle.tags.split(',').map((tag, i) => (
                      <span key={i} className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded mr-1">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-4 text-sm text-slate-500">
                  <span>{selectedArticle.views} views</span>
                  {selectedArticle.helpful_count > 0 && <span>👍 {selectedArticle.helpful_count} helpful</span>}
                  {selectedArticle.created_by_name && <span>By {selectedArticle.created_by_name}</span>}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4">New Article</h3>
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
                      <label className="block text-sm font-medium mb-1">Content *</label>
                      <textarea
                        required
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        rows="8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border rounded"
                          placeholder="e.g., Getting Started"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          className="w-full px-3 py-2 border rounded"
                          placeholder="tag1, tag2, tag3"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setSelectedArticle(null);
                      }}
                      className="px-4 py-2 border rounded"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Create
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

