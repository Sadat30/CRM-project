import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/api';

const STANDARD_FIELDS = [
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'notes', label: 'Notes' },
  { value: 'tags', label: 'Tags' }
];

export default function Import() {
  const [file, setFile] = useState(null);
  const [importJobs, setImportJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fieldMapping, setFieldMapping] = useState({});
  const [showMapping, setShowMapping] = useState(false);

  useEffect(() => {
    loadImportJobs();
    const interval = setInterval(() => {
      if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing')) {
        checkJobStatus(currentJob.id);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [currentJob]);

  const loadImportJobs = async () => {
    try {
      const res = await axios.get(`${API_BASE}/import/jobs`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setImportJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const checkJobStatus = async (jobId) => {
    try {
      const res = await axios.get(`${API_BASE}/import/jobs/${jobId}`, {
        headers: { authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      setCurrentJob(res.data);
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        loadImportJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Get preview and suggested mappings
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const res = await axios.post(`${API_BASE}/import/preview`, formData, {
          headers: {
            authorization: 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'multipart/form-data'
          }
        });
        
        setPreview(res.data);
        setFieldMapping(res.data.suggestedMappings);
        setShowMapping(true);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to preview file');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fieldMapping', JSON.stringify(fieldMapping));

      const res = await axios.post(`${API_BASE}/import/contacts`, formData, {
        headers: {
          authorization: 'Bearer ' + localStorage.getItem('token'),
          'Content-Type': 'multipart/form-data'
        }
      });

      setCurrentJob({ id: res.data.job_id, status: 'processing', total_rows: preview?.totalRows || 0 });
      checkJobStatus(res.data.job_id);
      setFile(null);
      setPreview(null);
      setShowMapping(false);
      e.target.reset();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start import');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'processing': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Bulk Import Contacts</h2>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Upload File</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select CSV or Excel File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
            <p className="text-xs text-slate-500 mt-2">
              Supported formats: CSV, Excel (.xlsx, .xls). The system will automatically detect and suggest field mappings.
            </p>
          </div>

          {/* Field Mapping UI */}
          {showMapping && preview && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold mb-3">Field Mapping</h4>
              <p className="text-sm text-slate-600 mb-3">
                Map your file columns to contact fields. {preview.totalRows} rows detected.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {preview.headers.map((header) => (
                  <div key={header} className="flex items-center gap-3">
                    <div className="w-48 text-sm font-medium">{header}</div>
                    <div className="flex-1">
                      <select
                        value={fieldMapping[header] || ''}
                        onChange={(e) => setFieldMapping({ ...fieldMapping, [header]: e.target.value })}
                        className="w-full px-3 py-1 border rounded text-sm"
                      >
                        <option value="">-- Skip this column --</option>
                        <optgroup label="Standard Fields">
                          {STANDARD_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Custom Field">
                          <option value={`custom_${header.toLowerCase().replace(/\s+/g, '_')}`}>
                            Custom: {header}
                          </option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Preview Table */}
              <div className="mt-4">
                <h5 className="font-medium mb-2 text-sm">Preview (first 5 rows):</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border">
                    <thead>
                      <tr className="bg-slate-100">
                        {preview.headers.map((header) => (
                          <th key={header} className="px-2 py-1 border text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, idx) => (
                        <tr key={idx}>
                          {preview.headers.map((header) => (
                            <td key={header} className="px-2 py-1 border">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file || !showMapping}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Uploading...' : 'Start Import'}
          </button>
        </form>
      </div>

      {currentJob && (currentJob.status === 'pending' || currentJob.status === 'processing') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Import in Progress</h4>
              <p className="text-sm text-slate-600">
                Processing {currentJob.total_rows || 0} rows...
              </p>
            </div>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Import History</h3>
        {importJobs.length === 0 ? (
          <p className="text-slate-500">No import jobs yet</p>
        ) : (
          <div className="space-y-3">
            {importJobs.map((job) => (
              <div key={job.id} className="border rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">{job.filename}</div>
                    <div className="text-sm text-slate-600">
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                {job.status === 'completed' && (
                  <div className="text-sm text-slate-600">
                    Successfully imported {job.successful_rows} of {job.total_rows} rows
                    {job.failed_rows > 0 && (
                      <span className="text-red-600 ml-2">
                        ({job.failed_rows} failed)
                      </span>
                    )}
                  </div>
                )}
                {job.errors && typeof job.errors === 'string' && (
                  <div className="mt-2 text-xs text-red-600">
                    {JSON.parse(job.errors).slice(0, 5).map((err, i) => (
                      <div key={i}>Row {err.row}: {err.error}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
