import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon, EnvelopeIcon, BuildingLibraryIcon,
  ShieldCheckIcon, PencilIcon, CheckIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value || <span className="text-slate-400 italic">Not set</span>}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: user?.name || '', institution: user?.institution || '' });
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name cannot be empty.');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data.user);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name: user.name, institution: user.institution || '' });
    setEditing(false);
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const roleColor = user?.role === 'teacher' ? 'from-brand-500 to-brand-700' : 'from-emerald-500 to-emerald-700';

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account information</p>
      </div>

      {/* Avatar banner */}
      <div className="card overflow-hidden mb-6">
        <div className={`h-24 bg-gradient-to-r ${roleColor}`} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${roleColor} flex items-center justify-center border-4 border-white shadow-lg`}>
              <span className="text-2xl font-display font-bold text-white">{initials}</span>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
                <PencilIcon className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancel} className="btn-secondary text-sm">
                  <XMarkIcon className="w-4 h-4" />
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                  <CheckIcon className="w-4 h-4" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Institution</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your school or university"
                  value={form.institution}
                  onChange={e => setForm(p => ({ ...p, institution: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900">{user.name}</h2>
              {user.institution && <p className="text-sm text-slate-400 mt-0.5">{user.institution}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="card p-5 mb-6">
        <h2 className="section-title">Account Details</h2>
        <InfoRow icon={UserCircleIcon}        label="Full Name"    value={user.name} />
        <InfoRow icon={EnvelopeIcon}          label="Email"        value={user.email} />
        <InfoRow icon={BuildingLibraryIcon}   label="Institution"  value={user.institution} />
        <InfoRow icon={ShieldCheckIcon}       label="Role"         value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} />
        <InfoRow icon={UserCircleIcon}        label="Member Since" value={new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} />
      </div>

      {/* Role badge */}
      <div className={`card p-5 border-l-4 ${user.role === 'teacher' ? 'border-l-brand-500' : 'border-l-emerald-500'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColor} flex items-center justify-center`}>
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">
              {user.role === 'teacher' ? 'Teacher Account' : 'Student Account'}
            </p>
            <p className="text-sm text-slate-400">
              {user.role === 'teacher'
                ? 'You can create assignments, view all submissions, run plagiarism checks, and override grades.'
                : 'You can submit assignments and view your AI-generated feedback and scores.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
