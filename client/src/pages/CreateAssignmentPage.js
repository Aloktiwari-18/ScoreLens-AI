import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

function RubricBuilder({ rubric, onChange }) {
  const addCriterion = () => onChange([...rubric, { name: '', maxMarks: 0, description: '' }]);
  const removeCriterion = (i) => onChange(rubric.filter((_, idx) => idx !== i));
  const updateCriterion = (i, field, val) => {
    const updated = [...rubric];
    updated[i] = { ...updated[i], [field]: field === 'maxMarks' ? Number(val) : val };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {rubric.map((c, i) => (
        <div key={i} className="flex gap-2 items-start">
          <input className="input-field flex-1" placeholder="Criterion name (e.g. Content Accuracy)"
                 value={c.name} onChange={e => updateCriterion(i, 'name', e.target.value)} />
          <input type="number" className="input-field w-20" placeholder="Marks"
                 min="0" value={c.maxMarks} onChange={e => updateCriterion(i, 'maxMarks', e.target.value)} />
          <input className="input-field flex-1" placeholder="Description (optional)"
                 value={c.description} onChange={e => updateCriterion(i, 'description', e.target.value)} />
          <button type="button" onClick={() => removeCriterion(i)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addCriterion}
              className="text-sm text-brand-600 font-medium hover:text-brand-700 flex items-center gap-1 mt-1">
        <PlusIcon className="w-4 h-4" /> Add Criterion
      </button>
    </div>
  );
}

function QuestionBuilder({ questions, onChange }) {
  const [expanded, setExpanded] = useState({});

  const addQuestion = () => {
    onChange([...questions, { number: questions.length + 1, text: '', maxMarks: 10, rubric: [], idealAnswer: '' }]);
    setExpanded(p => ({ ...p, [questions.length]: true }));
  };

  const removeQuestion = (i) => onChange(questions.filter((_, idx) => idx !== i));

  const updateQuestion = (i, field, val) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [field]: field === 'maxMarks' ? Number(val) : val };
    onChange(updated);
  };

  const updateRubric = (i, rubric) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], rubric };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer"
               onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}>
            <span className="w-6 h-6 bg-brand-600 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
              {q.number}
            </span>
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">
              {q.text || `Question ${q.number}`}
            </span>
            <span className="text-xs text-slate-500">{q.maxMarks} marks</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); removeQuestion(i); }}
                    className="text-slate-400 hover:text-red-500 ml-2">
              <TrashIcon className="w-4 h-4" />
            </button>
            {expanded[i] ? <ChevronUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400" />}
          </div>
          {expanded[i] && (
            <div className="p-4 space-y-4 border-t border-slate-100">
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="label">Question Text</label>
                  <textarea className="input-field resize-none" rows={2}
                            placeholder="Enter the question..."
                            value={q.text} onChange={e => updateQuestion(i, 'text', e.target.value)} />
                </div>
                <div>
                  <label className="label">Max Marks</label>
                  <input type="number" className="input-field" min="0"
                         value={q.maxMarks} onChange={e => updateQuestion(i, 'maxMarks', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Ideal Answer (helps AI evaluate)</label>
                <textarea className="input-field resize-none" rows={2}
                          placeholder="Optional: provide an ideal answer for better AI evaluation..."
                          value={q.idealAnswer} onChange={e => updateQuestion(i, 'idealAnswer', e.target.value)} />
              </div>
              <div>
                <label className="label">Question-Specific Rubric (overrides global rubric)</label>
                <RubricBuilder rubric={q.rubric} onChange={r => updateRubric(i, r)} />
              </div>
            </div>
          )}
        </div>
      ))}
      <button type="button" onClick={addQuestion} className="btn-secondary w-full justify-center">
        <PlusIcon className="w-4 h-4" /> Add Question
      </button>
    </div>
  );
}

export default function CreateAssignmentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', course: '', totalMarks: 100,
    globalRubric: [
      { name: 'Content Accuracy', maxMarks: 50, description: 'Correctness and completeness of the answer' },
      { name: 'Depth & Analysis', maxMarks: 30, description: 'Depth of understanding and analytical thinking' },
      { name: 'Structure & Clarity', maxMarks: 20, description: 'Organization, grammar, and presentation' },
    ],
    questions: [],
    dueDate: '',
    isPublished: false,
    allowLateSubmissions: false,
  });

  const set = (field) => (e) => setForm(p => ({
    ...p,
    [field]: e.target.type === 'checkbox' ? e.target.checked
           : field === 'totalMarks' ? Number(e.target.value)
           : e.target.value,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required');
    if (form.totalMarks <= 0) return toast.error('Total marks must be > 0');

    setLoading(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || undefined };
      const res = await api.post('/assignments', payload);
      toast.success('Assignment created!');
      navigate(`/assignments/${res.data.assignment._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Create Assignment</h1>
        <p className="page-subtitle">Define your rubric and questions for AI-powered evaluation</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Assignment Title <span className="text-red-500">*</span></label>
              <input type="text" className="input-field" placeholder="e.g. Midterm Exam - Chapter 5"
                     value={form.title} onChange={set('title')} />
            </div>
            <div>
              <label className="label">Course</label>
              <input type="text" className="input-field" placeholder="e.g. CS301, Physics 101"
                     value={form.course} onChange={set('course')} />
            </div>
            <div>
              <label className="label">Total Marks <span className="text-red-500">*</span></label>
              <input type="number" className="input-field" min="1"
                     value={form.totalMarks} onChange={set('totalMarks')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea className="input-field resize-none" rows={2}
                        placeholder="Brief description of this assignment..."
                        value={form.description} onChange={set('description')} />
            </div>
            <div>
              <label className="label">Due Date (optional)</label>
              <input type="datetime-local" className="input-field"
                     value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-brand-600 rounded"
                     checked={form.isPublished} onChange={set('isPublished')} />
              <span className="text-sm font-medium text-slate-700">Publish immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-brand-600 rounded"
                     checked={form.allowLateSubmissions} onChange={set('allowLateSubmissions')} />
              <span className="text-sm font-medium text-slate-700">Allow late submissions</span>
            </label>
          </div>
        </div>

        {/* Global Rubric */}
        <div className="card p-6">
          <h2 className="section-title">Global Rubric</h2>
          <p className="text-xs text-slate-500 mb-4">Applied to all questions unless overridden per-question. Total should equal total marks.</p>
          <RubricBuilder rubric={form.globalRubric} onChange={r => setForm(p => ({ ...p, globalRubric: r }))} />
        </div>

        {/* Questions */}
        <div className="card p-6">
          <h2 className="section-title">Questions</h2>
          <p className="text-xs text-slate-500 mb-4">Adding questions helps AI evaluate each answer independently with the correct marks allocation.</p>
          <QuestionBuilder questions={form.questions} onChange={q => setForm(p => ({ ...p, questions: q }))} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/assignments')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary px-6">
            {loading ? <><span className="w-4 h-4 spinner inline-block" /> Creating…</> : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
