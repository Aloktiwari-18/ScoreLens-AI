import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
  XCircleIcon, ArrowPathIcon, DocumentTextIcon,
  ChevronDownIcon, ChevronUpIcon, ShieldExclamationIcon,
  StarIcon, LightBulbIcon, AcademicCapIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  evaluated:    { icon: CheckCircleIcon,        color: 'text-emerald-500', bg: 'bg-emerald-50',  label: 'Evaluated'   },
  processing:   { icon: ClockIcon,              color: 'text-amber-500',   bg: 'bg-amber-50',    label: 'Processing…' },
  ocr_complete: { icon: ClockIcon,              color: 'text-blue-500',    bg: 'bg-blue-50',     label: 'AI Evaluating…' },
  uploaded:     { icon: ClockIcon,              color: 'text-slate-500',   bg: 'bg-slate-100',   label: 'Queued'      },
  error:        { icon: XCircleIcon,            color: 'text-red-500',     bg: 'bg-red-50',      label: 'Error'       },
};

function GradeCircle({ percentage, grade }) {
  const color =
    percentage >= 80 ? '#10b981' :
    percentage >= 60 ? '#6172f3' :
    percentage >= 40 ? '#f59e0b' : '#ef4444';

  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (percentage / 100) * circ;

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
        <circle
          cx="50" cy="50" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold text-slate-900">{grade || 'N/A'}</span>
        <span className="text-xs text-slate-500">{percentage?.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function RubricBar({ criterion, score, maxScore, comment }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const barColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-brand-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-700 capitalize">{criterion}</span>
        <span className="text-slate-500">{score} / {maxScore}</span>
      </div>
      <div className="progress-bar mb-1">
        <div className={`progress-fill ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {comment && <p className="text-xs text-slate-400 italic">{comment}</p>}
    </div>
  );
}

function QuestionEvaluationCard({ evaluation, number }) {
  const [open, setOpen] = useState(number === 1);
  const pct = evaluation.maxMarks > 0 ? (evaluation.marks / evaluation.maxMarks) * 100 : 0;
  const scoreColor = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-brand-600' : pct >= 25 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <span className="w-7 h-7 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
          {evaluation.questionNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {evaluation.questionText || `Question ${evaluation.questionNumber}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{evaluation.studentAnswer?.slice(0, 80)}…</p>
        </div>
        <div className="text-right flex-shrink-0 mr-2">
          <p className={`text-base font-bold ${scoreColor}`}>
            {evaluation.marks} <span className="text-slate-400 font-normal text-sm">/ {evaluation.maxMarks}</span>
          </p>
          <p className="text-xs text-slate-400">{pct.toFixed(0)}%</p>
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5 animate-slide-up">
          {/* Student Answer */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Student's Answer</p>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
              {evaluation.studentAnswer || <span className="italic text-slate-400">No answer provided</span>}
            </div>
          </div>

          {/* Rubric scores */}
          {evaluation.rubricScores?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rubric Breakdown</p>
              <div className="space-y-3">
                {evaluation.rubricScores.map((r, i) => (
                  <RubricBar key={i} criterion={r.criterion} score={r.score} maxScore={r.maxScore} comment={r.comment} />
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {evaluation.feedback && (
            <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <StarIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">AI Feedback</p>
                <p className="text-sm text-blue-800 leading-relaxed">{evaluation.feedback}</p>
              </div>
            </div>
          )}

          {/* Improvements */}
          {evaluation.improvements && (
            <div className="flex gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <LightBulbIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-1">Improvements</p>
                <p className="text-sm text-amber-800 leading-relaxed">{evaluation.improvements}</p>
              </div>
            </div>
          )}

          {/* Ideal answer */}
          {evaluation.idealAnswer && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Model Answer</p>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-800 leading-relaxed">
                {evaluation.idealAnswer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProcessingState({ status, error }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.uploaded;
  const Icon = cfg.icon;
  const steps = ['uploaded', 'processing', 'ocr_complete', 'evaluated'];
  const currentStep = steps.indexOf(status);

  return (
    <div className={`card p-8 text-center ${cfg.bg}`}>
      <Icon className={`w-14 h-14 mx-auto mb-4 ${cfg.color} ${status !== 'evaluated' && status !== 'error' ? 'animate-pulse-slow' : ''}`} />
      <h2 className="font-display text-xl font-bold text-slate-800 mb-2">{cfg.label}</h2>

      {status === 'error' ? (
        <p className="text-sm text-red-600 mt-2">{error || 'An error occurred during processing.'}</p>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-6">
            {status === 'uploaded' && 'Your submission is queued for processing.'}
            {status === 'processing' && 'OCR is extracting text from your document…'}
            {status === 'ocr_complete' && 'AI is evaluating your answers against the rubric…'}
          </p>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
            {['Uploaded', 'OCR', 'AI Eval', 'Done'].map((label, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    i < currentStep + 1
                      ? 'bg-brand-600 text-white'
                      : i === currentStep + 1
                      ? 'bg-brand-200 text-brand-600 animate-pulse'
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className="text-xs text-slate-400 mt-1">{label}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 mb-4 ${i < currentStep ? 'bg-brand-600' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRawText, setShowRawText] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [gradeOverride, setGradeOverride] = useState(null);
  const [overriding, setOverriding] = useState(false);

  const isTeacher = user.role === 'teacher';

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await api.get(`/submissions/${id}`);
      setSubmission(res.data.submission);
      return res.data.submission;
    } catch (err) {
      toast.error('Submission not found');
      navigate('/dashboard');
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchSubmission().then(sub => {
      if (sub) setLoading(false);
    });
  }, [fetchSubmission]);

  // Poll every 5s while processing
  useEffect(() => {
    if (!submission) return;
    if (['evaluated', 'error'].includes(submission.status)) return;

    const interval = setInterval(async () => {
      const updated = await fetchSubmission();
      if (updated && ['evaluated', 'error'].includes(updated.status)) {
        clearInterval(interval);
        if (updated.status === 'evaluated') toast.success('✅ Evaluation complete!');
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [submission?.status, fetchSubmission]);

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      await api.post(`/submissions/${id}/reprocess`);
      toast.success('Reprocessing started…');
      await fetchSubmission();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reprocess failed');
    } finally {
      setReprocessing(false);
    }
  };

  const handleGradeOverride = async () => {
    if (!gradeOverride) return;
    setOverriding(true);
    try {
      const res = await api.put(`/submissions/${id}/grade-override`, {
        totalMarks: Number(gradeOverride.marks),
        overallFeedback: gradeOverride.feedback,
      });
      setSubmission(res.data.submission);
      setGradeOverride(null);
      toast.success('Grade updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Override failed');
    } finally {
      setOverriding(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><div className="w-8 h-8 spinner" /></div>
  );
  if (!submission) return null;

  const isEvaluated = submission.status === 'evaluated';
  const a = submission.assignment;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-brand-600 font-medium flex items-center gap-1">
          ← Back
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">
            {a?.title || 'Assignment'} {a?.course && `· ${a.course}`}
          </p>
          <h1 className="page-title">
            {isTeacher ? `${submission.student?.name}'s Submission` : 'My Submission'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`badge ${
              isEvaluated ? 'badge-green' :
              submission.status === 'error' ? 'badge-red' : 'badge-yellow'
            }`}>
              {STATUS_CONFIG[submission.status]?.label || submission.status}
            </span>
            {submission.isLate && <span className="badge-yellow">Late Submission</span>}
            {submission.isPlagiarismSuspect && (
              <span className="badge-red">
                <ShieldExclamationIcon className="w-3 h-3 inline mr-1" />
                Plagiarism Alert
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(isTeacher || submission.status === 'error') && (
            <button onClick={handleReprocess} disabled={reprocessing} className="btn-secondary text-sm">
              <ArrowPathIcon className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
              {reprocessing ? 'Reprocessing…' : 'Re-evaluate'}
            </button>
          )}
        </div>
      </div>

      {/* Processing state */}
      {!isEvaluated && (
        <div className="mb-6">
          <ProcessingState status={submission.status} error={submission.processingError} />
        </div>
      )}

      {isEvaluated && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT: evaluations */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="section-title">Question Evaluations</h2>
            {submission.evaluations?.length > 0
              ? submission.evaluations.map((ev, i) => (
                  <QuestionEvaluationCard key={i} evaluation={ev} number={i} />
                ))
              : <p className="text-slate-400 text-sm">No evaluations available.</p>
            }

            {/* Overall Feedback */}
            {submission.overallFeedback && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AcademicCapIcon className="w-5 h-5 text-brand-600" />
                  <h3 className="font-semibold text-slate-800">Overall Feedback</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{submission.overallFeedback}</p>
              </div>
            )}

            {/* Plagiarism Section */}
            {submission.plagiarismMatches?.length > 0 && (
              <div className={`card p-5 ${submission.isPlagiarismSuspect ? 'border-red-200' : ''}`}>
                <div className="flex items-center gap-2 mb-4">
                  <ShieldExclamationIcon className={`w-5 h-5 ${submission.isPlagiarismSuspect ? 'text-red-500' : 'text-slate-400'}`} />
                  <h3 className="font-semibold text-slate-800">Plagiarism Report</h3>
                  {submission.isPlagiarismSuspect && (
                    <span className="badge-red ml-auto">⚠ Suspicious</span>
                  )}
                </div>
                <div className="space-y-3">
                  {submission.plagiarismMatches.map((m, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${m.isSuspicious ? 'bg-red-50 border border-red-100' : 'bg-slate-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{m.studentName}</p>
                        {m.matchedSections?.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{m.matchedSections.join(', ')}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${m.isSuspicious ? 'text-red-600' : 'text-slate-600'}`}>
                          {m.similarityScore}%
                        </span>
                        <p className="text-xs text-slate-400">similarity</p>
                      </div>
                      {m.isSuspicious && (
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw OCR text toggle */}
            {submission.rawText && (
              <div className="card">
                <button
                  onClick={() => setShowRawText(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <DocumentTextIcon className="w-4 h-4" />
                    Extracted Text (OCR)
                  </span>
                  {showRawText ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                </button>
                {showRawText && (
                  <div className="border-t border-slate-100 p-5">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {submission.rawText}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: sidebar */}
          <div className="space-y-4">
            {/* Score card */}
            <div className="card p-5 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Final Score</p>
              <GradeCircle percentage={submission.percentage} grade={submission.grade} />
              <div className="mt-4 text-2xl font-display font-bold text-slate-900">
                {submission.totalMarks}
                <span className="text-slate-400 font-normal text-base"> / {submission.maxPossibleMarks}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">marks awarded</p>
            </div>

            {/* Quick stats */}
            <div className="card p-5">
              <h3 className="section-title">Submission Info</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  ['File', submission.fileName],
                  ['Submitted', new Date(submission.createdAt).toLocaleString()],
                  ['Evaluated', submission.evaluatedAt ? new Date(submission.evaluatedAt).toLocaleString() : 'N/A'],
                  ['Questions', submission.evaluations?.length || 0],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-slate-800 font-medium text-right truncate max-w-[60%]">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher grade override */}
            {isTeacher && (
              <div className="card p-5">
                <h3 className="section-title">Grade Override</h3>
                {gradeOverride ? (
                  <div className="space-y-3">
                    <div>
                      <label className="label">New Total Marks</label>
                      <input
                        type="number"
                        className="input-field"
                        min="0"
                        max={submission.maxPossibleMarks}
                        value={gradeOverride.marks}
                        onChange={e => setGradeOverride(p => ({ ...p, marks: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="label">Feedback Note</label>
                      <textarea
                        className="input-field resize-none"
                        rows={2}
                        value={gradeOverride.feedback}
                        onChange={e => setGradeOverride(p => ({ ...p, feedback: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setGradeOverride(null)} className="btn-secondary flex-1 text-xs justify-center">Cancel</button>
                      <button onClick={handleGradeOverride} disabled={overriding} className="btn-primary flex-1 text-xs justify-center">
                        {overriding ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setGradeOverride({ marks: submission.totalMarks, feedback: submission.overallFeedback || '' })}
                    className="btn-secondary w-full justify-center text-sm"
                  >
                    Override Grade
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
