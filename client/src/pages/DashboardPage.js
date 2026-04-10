import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  ClipboardDocumentListIcon, DocumentTextIcon, ChartBarIcon,
  ExclamationTriangleIcon, CheckCircleIcon, ClockIcon,
  ArrowRightIcon, PlusIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline';

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:   'bg-brand-50 text-brand-600',
    green:   'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
    purple:  'bg-purple-50 text-purple-600',
    slate:   'bg-slate-100 text-slate-600',
  };
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-display font-bold text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    evaluated:   { cls: 'badge-green',  label: 'Evaluated' },
    processing:  { cls: 'badge-yellow', label: 'Processing' },
    ocr_complete:{ cls: 'badge-blue',   label: 'OCR Done' },
    uploaded:    { cls: 'badge-gray',   label: 'Uploaded' },
    error:       { cls: 'badge-red',    label: 'Error' },
  };
  const { cls, label } = map[status] || { cls: 'badge-gray', label: status };
  return <span className={cls}>{label}</span>;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, assignmentsRes] = await Promise.all([
          api.get(user.role === 'teacher' ? '/analytics/teacher' : '/analytics/student'),
          api.get('/assignments'),
        ]);
        setData(analyticsRes.data.analytics);
        setRecentAssignments(assignmentsRes.data.assignments.slice(0, 5));

        if (user.role === 'student') {
          const subRes = await api.get('/submissions/my');
          setRecentSubmissions(subRes.data.submissions.slice(0, 5));
        } else {
          const allSubs = [];
          for (const a of assignmentsRes.data.assignments.slice(0, 3)) {
            const sRes = await api.get(`/assignments/${a._id}/submissions`);
            allSubs.push(...sRes.data.submissions.map(s => ({ ...s, assignmentTitle: a.title })));
          }
          setRecentSubmissions(allSubs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user.role]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 spinner" />
    </div>
  );

  const isTeacher = user.role === 'teacher';
  const overview = data?.overview || {};

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {isTeacher
              ? `Manage assignments and review AI-evaluated submissions`
              : `Track your academic progress and AI feedback`}
          </p>
        </div>
        {isTeacher && (
          <Link to="/assignments/new" className="btn-primary">
            <PlusIcon className="w-4 h-4" />
            New Assignment
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isTeacher ? (
          <>
            <StatCard icon={ClipboardDocumentListIcon} label="Total Assignments" value={overview.totalAssignments || 0} color="brand" />
            <StatCard icon={DocumentTextIcon} label="Total Submissions" value={overview.totalSubmissions || 0} color="green" />
            <StatCard icon={ChartBarIcon} label="Avg Score" value={`${overview.avgScore || 0}%`} color="purple" />
            <StatCard icon={ExclamationTriangleIcon} label="Plagiarism Alerts" value={overview.plagiarismAlerts || 0} color={overview.plagiarismAlerts > 0 ? 'red' : 'slate'} />
          </>
        ) : (
          <>
            <StatCard icon={DocumentTextIcon} label="Submissions" value={overview.totalSubmissions || 0} color="brand" />
            <StatCard icon={ChartBarIcon} label="Avg Score" value={`${overview.avgScore || 0}%`} color="green" />
            <StatCard icon={AcademicCapIcon} label="Best Score" value={`${overview.bestScore || 0}%`} color="purple" />
            <StatCard icon={CheckCircleIcon} label="Latest Grade" value={overview.latestGrade || 'N/A'} color="slate" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Assignments */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="section-title mb-0">
              {isTeacher ? 'Your Assignments' : 'Open Assignments'}
            </h2>
            <Link to="/assignments" className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentAssignments.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                No assignments yet.{' '}
                {isTeacher && <Link to="/assignments/new" className="text-brand-600 font-medium">Create one →</Link>}
              </div>
            ) : recentAssignments.map(a => (
              <Link key={a._id} to={`/assignments/${a._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-700">{a.title}</p>
                  <p className="text-xs text-slate-400">{a.course || 'No course'} · {a.totalMarks} marks</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={a.isPublished ? 'badge-green' : 'badge-gray'}>
                    {a.isPublished ? 'Published' : 'Draft'}
                  </span>
                  {isTeacher && (
                    <p className="text-xs text-slate-400 mt-1">{a.submissionsCount || 0} submissions</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="section-title mb-0">
              {isTeacher ? 'Recent Submissions' : 'My Submissions'}
            </h2>
            {!isTeacher && (
              <Link to="/submissions" className="text-xs text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1">
                View all <ArrowRightIcon className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {recentSubmissions.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                No submissions yet.
              </div>
            ) : recentSubmissions.map(s => (
              <Link key={s._id} to={`/submissions/${s._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-brand-700">
                    {isTeacher ? (s.student?.name || 'Student') : (s.assignment?.title || s.assignmentTitle || 'Assignment')}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isTeacher ? s.assignmentTitle : ''}{' '}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <StatusBadge status={s.status} />
                  {s.status === 'evaluated' && (
                    <p className="text-xs font-semibold text-slate-700">{s.percentage?.toFixed(1)}%</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Plagiarism alerts for teacher */}
      {isTeacher && data?.plagiarismAlerts?.length > 0 && (
        <div className="mt-6 card border-red-200 bg-red-50">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-semibold text-red-700">Plagiarism Alerts</h2>
          </div>
          <div className="divide-y divide-red-100">
            {data.plagiarismAlerts.map((alert, i) => (
              <Link key={i} to={`/submissions/${alert.submissionId}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-red-100/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-red-800">{alert.studentName}</p>
                  <p className="text-xs text-red-500">{alert.assignmentTitle}</p>
                </div>
                <div className="text-right">
                  <span className="badge-red">{alert.highestSimilarity}% similar</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
