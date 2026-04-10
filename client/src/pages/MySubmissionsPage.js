import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon, MagnifyingGlassIcon, FunnelIcon,
  ClockIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';

const STATUS_META = {
  evaluated:    { badge: 'badge-green',  label: 'Evaluated',   icon: CheckCircleIcon },
  processing:   { badge: 'badge-yellow', label: 'Processing',  icon: ClockIcon       },
  ocr_complete: { badge: 'badge-blue',   label: 'Evaluating',  icon: ClockIcon       },
  uploaded:     { badge: 'badge-gray',   label: 'Queued',      icon: ClockIcon       },
  error:        { badge: 'badge-red',    label: 'Error',       icon: XCircleIcon     },
};

function GradePill({ grade }) {
  const color =
    grade?.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
    grade?.startsWith('B') ? 'bg-brand-100 text-brand-700' :
    grade?.startsWith('C') ? 'bg-amber-100 text-amber-700' :
    grade === 'F'           ? 'bg-red-100 text-red-700'    :
                              'bg-slate-100 text-slate-500';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${color}`}>
      {grade || '—'}
    </span>
  );
}

export default function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');

  useEffect(() => {
    api.get('/submissions/my')
      .then(r => setSubmissions(r.data.submissions))
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = submissions.filter(s => {
    const matchSearch = s.assignment?.title?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchSearch;
    return matchSearch && s.status === filter;
  });

  const statuses = ['all', 'evaluated', 'processing', 'uploaded', 'error'];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Submissions</h1>
        <p className="page-subtitle">All your assignment submissions and AI evaluation results</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Search by assignment name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FunnelIcon className="w-4 h-4 text-slate-400" />
          <div className="flex flex-wrap gap-1.5">
            {statuses.map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s === 'all' ? 'All' : STATUS_META[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary row */}
      {!loading && submissions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            ['Total', submissions.length, 'bg-brand-50 text-brand-700'],
            ['Evaluated', submissions.filter(s => s.status === 'evaluated').length, 'bg-emerald-50 text-emerald-700'],
            ['Avg Score', submissions.filter(s => s.status === 'evaluated').length > 0
              ? `${(submissions.filter(s => s.status === 'evaluated').reduce((a, s) => a + s.percentage, 0) / submissions.filter(s => s.status === 'evaluated').length).toFixed(1)}%`
              : '—', 'bg-purple-50 text-purple-700'],
            ['Pending', submissions.filter(s => ['processing','uploaded','ocr_complete'].includes(s.status)).length, 'bg-amber-50 text-amber-700'],
          ].map(([label, val, cls]) => (
            <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
              <div className="text-xl font-bold">{val}</div>
              <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No submissions found</p>
          <p className="text-slate-400 text-sm mt-1">
            {search ? 'Try a different search term.' : 'Submit an assignment to see results here.'}
          </p>
          <Link to="/assignments" className="btn-primary mx-auto mt-4 w-fit text-sm">
            Browse Assignments
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="table-header">Assignment</th>
                <th className="table-header hidden sm:table-cell">Course</th>
                <th className="table-header">Status</th>
                <th className="table-header">Score</th>
                <th className="table-header">Grade</th>
                <th className="table-header hidden md:table-cell">Submitted</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const meta = STATUS_META[s.status] || STATUS_META.uploaded;
                const Icon = meta.icon;
                return (
                  <tr key={s._id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <DocumentTextIcon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
                            {s.assignment?.title || 'Assignment'}
                          </p>
                          {s.isLate && <span className="text-xs text-amber-500 font-medium">Late</span>}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell hidden sm:table-cell text-slate-400 text-xs">
                      {s.assignment?.course || '—'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${meta.badge} flex items-center gap-1 w-fit`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="table-cell">
                      {s.status === 'evaluated' ? (
                        <div>
                          <span className="font-semibold text-slate-800">{s.totalMarks}</span>
                          <span className="text-slate-400">/{s.maxPossibleMarks}</span>
                          <div className="progress-bar mt-1 max-w-[64px]">
                            <div
                              className={`progress-fill ${s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
                              style={{ width: `${s.percentage}%` }}
                            />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="table-cell">
                      {s.status === 'evaluated' ? <GradePill grade={s.grade} /> : '—'}
                    </td>
                    <td className="table-cell hidden md:table-cell text-slate-400 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="table-cell">
                      <Link to={`/submissions/${s._id}`}
                            className="text-brand-600 hover:text-brand-700 text-sm font-medium whitespace-nowrap">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
