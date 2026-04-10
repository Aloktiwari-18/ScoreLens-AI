import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  CalendarIcon, UserGroupIcon, ClipboardDocumentListIcon,
  ArrowUpTrayIcon, CheckCircleIcon, ExclamationTriangleIcon,
  PencilSquareIcon, TrashIcon, EyeIcon,
} from '@heroicons/react/24/outline';

function StatusBadge({ status }) {
  const map = {
    evaluated:   ['badge-green',  'Evaluated'],
    processing:  ['badge-yellow', 'Processing'],
    ocr_complete:['badge-blue',   'OCR Done'],
    uploaded:    ['badge-gray',   'Uploaded'],
    error:       ['badge-red',    'Error'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={cls}>{label}</span>;
}

export default function AssignmentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isTeacher = user.role === 'teacher';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const aRes = await api.get(`/assignments/${id}`);
        setAssignment(aRes.data.assignment);
        if (isTeacher || aRes.data.assignment.isPublished) {
          const sRes = await api.get(`/assignments/${id}/submissions`);
          setSubmissions(sRes.data.submissions);
        }
      } catch (err) {
        toast.error('Assignment not found');
        navigate('/assignments');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, isTeacher, navigate]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await api.post(`/assignments/${id}/publish`);
      setAssignment(p => ({ ...p, isPublished: true }));
      toast.success('Assignment published!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this assignment and all its submissions? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/assignments/${id}`);
      toast.success('Assignment deleted');
      navigate('/assignments');
    } catch (err) {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 spinner" /></div>;
  if (!assignment) return null;

  const isPastDue = assignment.dueDate && new Date() > new Date(assignment.dueDate);
  const ownSubmission = submissions.find(s => s.student?._id === user._id || s.student === user._id);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {assignment.course && (
                <span className="badge-blue text-xs">{assignment.course}</span>
              )}
              <span className={assignment.isPublished ? 'badge-green' : 'badge-gray'}>
                {assignment.isPublished ? 'Published' : 'Draft'}
              </span>
              {isPastDue && <span className="badge-red">Past Due</span>}
            </div>
            <h1 className="page-title">{assignment.title}</h1>
            {assignment.description && (
              <p className="text-slate-500 text-sm mt-1">{assignment.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isTeacher && !assignment.isPublished && (
              <button onClick={handlePublish} disabled={publishing} className="btn-primary">
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            )}
            {!isTeacher && assignment.isPublished && !ownSubmission && !isPastDue && (
              <Link to={`/assignments/${id}/submit`} className="btn-primary">
                <ArrowUpTrayIcon className="w-4 h-4" />
                Submit
              </Link>
            )}
            {!isTeacher && ownSubmission && (
              <Link to={`/submissions/${ownSubmission._id}`} className="btn-secondary">
                <EyeIcon className="w-4 h-4" />
                View My Submission
              </Link>
            )}
            {isTeacher && (
              <button onClick={handleDelete} disabled={deleting}
                      className="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200">
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <ClipboardDocumentListIcon className="w-4 h-4" />
            <strong className="text-slate-700">{assignment.totalMarks}</strong> total marks
          </span>
          {assignment.dueDate && (
            <span className={`flex items-center gap-1.5 ${isPastDue ? 'text-red-500' : ''}`}>
              <CalendarIcon className="w-4 h-4" />
              Due: {new Date(assignment.dueDate).toLocaleString()}
            </span>
          )}
          {isTeacher && (
            <span className="flex items-center gap-1.5">
              <UserGroupIcon className="w-4 h-4" />
              {submissions.length} submissions
            </span>
          )}
          <span className="flex items-center gap-1.5">
            By: {assignment.teacher?.name}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Questions */}
          {assignment.questions?.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title">Questions ({assignment.questions.length})</h2>
              <div className="space-y-3">
                {assignment.questions.map(q => (
                  <div key={q.number} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className="w-6 h-6 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {q.number}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{q.text}</p>
                      <p className="text-xs text-slate-400 mt-1">{q.maxMarks} marks</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submissions list for teacher */}
          {isTeacher && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="section-title mb-0">Submissions</h2>
              </div>
              {submissions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No submissions yet.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="table-header">Student</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Score</th>
                      <th className="table-header">Similarity</th>
                      <th className="table-header">Submitted</th>
                      <th className="table-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s._id} className="table-row">
                        <td className="table-cell font-medium">{s.student?.name}</td>
                        <td className="table-cell"><StatusBadge status={s.status} /></td>
                        <td className="table-cell">
                          {s.status === 'evaluated'
                            ? <span className="font-semibold">{s.totalMarks}/{s.maxPossibleMarks} <span className="text-slate-400 font-normal">({s.percentage?.toFixed(1)}%)</span></span>
                            : '—'
                          }
                        </td>
                        <td className="table-cell">
                          {s.highestSimilarity > 0 ? (
                            <span className={s.isPlagiarismSuspect ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                              {s.isPlagiarismSuspect && <ExclamationTriangleIcon className="w-3.5 h-3.5 inline mr-1" />}
                              {s.highestSimilarity}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="table-cell text-slate-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="table-cell">
                          <Link to={`/submissions/${s._id}`} className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Rubric */}
          {assignment.globalRubric?.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title">Global Rubric</h2>
              <div className="space-y-3">
                {assignment.globalRubric.map((r, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.name}</p>
                      {r.description && <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>}
                    </div>
                    <span className="text-sm font-semibold text-brand-600 flex-shrink-0">{r.maxMarks}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats for teacher */}
          {isTeacher && submissions.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title">Stats</h2>
              <div className="space-y-3">
                {[
                  ['Avg Score', `${assignment.averageScore || 0}%`],
                  ['Evaluated', `${submissions.filter(s => s.status === 'evaluated').length}/${submissions.length}`],
                  ['Plagiarism Alerts', submissions.filter(s => s.isPlagiarismSuspect).length],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
