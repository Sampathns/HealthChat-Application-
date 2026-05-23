import React, { useState, useEffect, useRef } from 'react';
import {
  FolderIcon, PlusIcon, DocumentIcon, EyeIcon,
  ArrowDownTrayIcon, TrashIcon, ShareIcon, UserIcon,
} from '@heroicons/react/24/outline';
import { reportsAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const REPORT_TYPES = ['lab','xray','mri','ultrasound','ecg','blood','urine','other'];

const TYPE_COLORS = {
  lab:        'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  xray:       'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  mri:        'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  blood:      'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  urine:      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  ecg:        'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  ultrasound: 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  other:      'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-slate-400',
};

function UploadModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title:'', type:'lab', description:'' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!file || !form.title) return toast.error('Please provide a title and select a file');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k,v]) => fd.append(k, v));
      await reportsAPI.uploadReport(fd);
      toast.success('Report uploaded successfully ✅');
      onSuccess(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-md p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-5">Upload Medical Report</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Report Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
              className="input" placeholder="e.g. Blood Test Results — June 2025" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Report Type</label>
            <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))} className="input capitalize">
              {REPORT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
              rows={2} className="input resize-none" placeholder="Optional notes…" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">File *</label>
            <div onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                file ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                     : 'border-slate-300 dark:border-gray-600 hover:border-primary-400'
              }`}>
              <input type="file" ref={fileRef} onChange={e => setFile(e.target.files[0])}
                accept=".pdf,image/*" className="hidden" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size/1024/1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <FolderIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">Click to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleUpload} disabled={loading || !file || !form.title} className="btn-primary flex-1 justify-center">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Upload Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await reportsAPI.getReports();
      setReports(data.reports || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await reportsAPI.deleteReport(id);
      toast.success('Report deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleShare = async (id) => {
    try {
      const { data } = await reportsAPI.shareReport(id);
      toast.success(data.message);
      load();
    } catch { toast.error('Failed to update sharing'); }
  };

  const filtered = typeFilter === 'all' ? reports : reports.filter(r => r.type === typeFilter);
  const isImage  = (mime) => mime?.startsWith('image/');

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Medical Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Loading…' : `${filtered.length} report${filtered.length!==1?'s':''}`}
            {user.role === 'admin' && ' — All Patients'}
          </p>
        </div>
        {user.role === 'patient' && (
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Upload Report
          </button>
        )}
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            typeFilter==='all' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700'
          }`}>All</button>
        {REPORT_TYPES.map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
              typeFilter===t ? 'bg-primary-600 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_,i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-36 w-full" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-4 w-32 rounded" />
                <div className="skeleton h-3 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">No reports found</p>
          <p className="text-sm text-slate-400 mt-1">
            {user.role === 'patient' ? 'Upload your medical reports to keep them organized' : 'No reports available'}
          </p>
          {user.role === 'patient' && (
            <button onClick={() => setShowUpload(true)} className="btn-primary mt-4 inline-flex">
              Upload Report
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => (
            <div key={report._id} className="card overflow-hidden hover:shadow-md transition-shadow group">
              {/* Preview */}
              <div className="h-36 bg-slate-100 dark:bg-gray-700 flex items-center justify-center relative overflow-hidden">
                {isImage(report.mimeType) ? (
                  <img src={report.fileUrl} alt={report.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <DocumentIcon className="w-10 h-10 text-slate-400" />
                    <span className="text-xs text-slate-400 font-mono uppercase">
                      {report.mimeType === 'application/pdf' ? 'PDF' : 'File'}
                    </span>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <a href={report.fileUrl} target="_blank" rel="noreferrer"
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    onClick={e => e.stopPropagation()}>
                    <EyeIcon className="w-4 h-4 text-slate-700" />
                  </a>
                  <a href={report.fileUrl} download
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    onClick={e => e.stopPropagation()}>
                    <ArrowDownTrayIcon className="w-4 h-4 text-slate-700" />
                  </a>
                  {user.role === 'patient' && (
                    <button onClick={() => handleShare(report._id)}
                      className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                      <ShareIcon className={`w-4 h-4 ${report.isSharedWithDoctor ? 'text-primary-600' : 'text-slate-700'}`} />
                    </button>
                  )}
                  {(user.role === 'admin' || user.role === 'patient') && (
                    <button onClick={() => handleDelete(report._id)}
                      className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                {/* Admin: show patient name */}
                {user.role === 'admin' && report.patient && (
                  <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-slate-50 dark:bg-gray-700 rounded-lg">
                    <UserIcon className="w-3 h-3 text-slate-400" />
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {report.patient.name}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">{report.patient.email}</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{report.title}</p>
                  <span className={`badge flex-shrink-0 capitalize ${TYPE_COLORS[report.type] || TYPE_COLORS.other}`}>
                    {report.type}
                  </span>
                </div>

                {report.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{report.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{format(new Date(report.createdAt),'MMM d, yyyy')}</span>
                  <div className="flex items-center gap-2">
                    {report.isSharedWithDoctor && (
                      <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                        <ShareIcon className="w-3 h-3" /> Shared
                      </span>
                    )}
                    {report.fileSize && (
                      <span className="text-xs text-slate-400">{(report.fileSize/1024).toFixed(0)} KB</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={load} />}
    </div>
  );
}
