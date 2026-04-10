import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  PlusIcon, ClipboardDocumentListIcon, CalendarIcon,
  UserGroupIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

function AssignmentCard({ assignment, isTeacher }) {
  const isPastDue = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  return (
    <Link
      to={`/assignments/${assignment._id}`}
      className="card-hover p-5 block transition-all duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate">{assignment.title}</h3>
          {assignment.course && (
            <p className="text-xs text-slate-400 mt-0.5">{assignment.course}</p>
          )}
        </div>
        <span className={assignment.isPublished ? 'badge-green' : 'badge-gray'}>
          {assignment.isPublished ? 'Published' : 'Draft'}
        </span>
      </div>

      {assignment.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{assignment.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="font-semibold text-slate-700">{assignment.totalMarks}</span> marks
        </span>
        {assignment.dueDate && (
          <span className={`flex items-center gap-1 ${isPastDue ? 'text-red-500' : ''}`}>
            <CalendarIcon className="w-3.5 h-3.5" />
            {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {isPastDue && ' (Past due)'}
          </span>
        )}
        {isTeacher && (
          <span className="flex items-center gap-1">
            <UserGroupIcon className="w-3.5 h-3.5" />
            {assignment.submissionsCount || 0} submissions
          </span>
        )}
      </div>

      {isTeacher && assignment.averageScore > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Avg Score</span>
            <span className="font-medium text-slate-700">{assignment.averageScore}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-brand-500"
              style={{ width: `${assignment.averageScore}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    api.get('/assignments')
      .then(r => setAssignments(r.data.assignments))
      .catch(() => toast.error('Failed to load assignments'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assignments.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
                        a.course?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'published') return matchSearch && a.isPublished;
    if (filter === 'draft')     return matchSearch && !a.isPublished;
    return matchSearch;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">{isTeacher ? 'Assignments' : 'Available Assignments'}</h1>
          <p className="page-subtitle">
            {isTeacher ? 'Create and manage your assignments' : 'Browse and submit your assignments'}
          </p>
        </div>
        {isTeacher && (
          <Link to="/assignments/new" className="btn-primary self-start">
            <PlusIcon className="w-4 h-4" />
            New Assignment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input-field pl-9"
            placeholder="Search assignments…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />
            {['all', 'published', 'draft'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <ClipboardDocumentListIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No assignments found</p>
          {isTeacher && (
            <Link to="/assignments/new" className="btn-primary mx-auto mt-4 w-fit">
              <PlusIcon className="w-4 h-4" />
              Create your first assignment
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <AssignmentCard key={a._id} assignment={a} isTeacher={isTeacher} />
          ))}
        </div>
      )}
    </div>
  );
}
