import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon, DocumentIcon, XMarkIcon,
  CheckCircleIcon, InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function SubmitAssignmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Invalid file. Please upload PDF or image files only (max 20MB).');
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (!file) return toast.error('Please select a file first.');
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('assignmentId', id);

    try {
      const res = await api.post('/submissions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success('Submission uploaded! AI evaluation is starting…');
      navigate(`/submissions/${res.data.submission._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Submit Assignment</h1>
        <p className="page-subtitle">Upload your answer sheet as a PDF or image for AI evaluation</p>
      </div>

      <div className="space-y-6">
        {/* Info box */}
        <div className="flex gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl">
          <InformationCircleIcon className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-brand-800">
            <p className="font-semibold mb-1">How it works</p>
            <ul className="space-y-1 text-brand-700">
              <li>• Upload your answer sheet (PDF or image)</li>
              <li>• Our OCR engine extracts your text automatically</li>
              <li>• AI evaluates each answer against the rubric</li>
              <li>• You'll receive detailed feedback and marks</li>
            </ul>
          </div>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-brand-500 bg-brand-50'
              : file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
          }`}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="flex flex-col items-center">
              <CheckCircleIcon className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-slate-800 font-semibold">{file.name}</p>
              <p className="text-slate-500 text-sm mt-1">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CloudArrowUpIcon className={`w-12 h-12 mb-3 ${isDragActive ? 'text-brand-500' : 'text-slate-400'}`} />
              {isDragActive ? (
                <p className="text-brand-600 font-semibold">Drop your file here</p>
              ) : (
                <>
                  <p className="text-slate-700 font-semibold">Drag & drop or click to upload</p>
                  <p className="text-slate-400 text-sm mt-1">PDF, JPG, PNG, TIFF up to 20MB</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* File preview */}
        {file && (
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <DocumentIcon className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{file.type} · {formatSize(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Progress bar */}
        {uploading && progress > 0 && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar h-2">
              <div className="progress-fill bg-brand-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary" disabled={uploading}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="btn-primary px-6"
          >
            {uploading
              ? <><span className="w-4 h-4 spinner inline-block" /> Uploading…</>
              : <><CloudArrowUpIcon className="w-4 h-4" /> Submit Assignment</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
