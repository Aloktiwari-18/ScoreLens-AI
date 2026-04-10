import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HomeIcon, ClipboardDocumentListIcon, ChartBarIcon,
  UserCircleIcon, ArrowLeftOnRectangleIcon, Bars3Icon,
  XMarkIcon, DocumentTextIcon, AcademicCapIcon,
  BellIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';

const teacherNav = [
  { to: '/dashboard',   label: 'Dashboard',    icon: HomeIcon },
  { to: '/assignments', label: 'Assignments',   icon: ClipboardDocumentListIcon },
  { to: '/analytics',  label: 'Analytics',     icon: ChartBarIcon },
];

const studentNav = [
  { to: '/dashboard',   label: 'Dashboard',    icon: HomeIcon },
  { to: '/assignments', label: 'Assignments',   icon: ClipboardDocumentListIcon },
  { to: '/submissions', label: 'My Submissions',icon: DocumentTextIcon },
  { to: '/analytics',  label: 'Progress',      icon: ChartBarIcon },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const nav = user?.role === 'teacher' ? teacherNav : studentNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColor = user?.role === 'teacher' ? 'bg-brand-600' : 'bg-emerald-600';
  const roleLabel = user?.role === 'teacher' ? 'Teacher' : 'Student';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200
        flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <AcademicCapIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-slate-900 text-base leading-none">ScoreLens</span>
              <span className="block text-[10px] text-brand-600 font-semibold tracking-wide uppercase leading-none mt-0.5">AI</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-100 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {user?.role === 'teacher' && (
            <div className="pt-3 mt-3 border-t border-slate-100">
              <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Actions</p>
              <NavLink
                to="/assignments/new"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <span className="w-5 h-5 flex items-center justify-center text-lg leading-none">＋</span>
                New Assignment
              </NavLink>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
               onClick={() => navigate('/profile')}>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-brand-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          <div className="flex-1 lg:hidden" />

          <div className="hidden lg:block">
            <h1 className="text-sm font-medium text-slate-500">
              Welcome back, <span className="text-slate-900 font-semibold">{user?.name}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold text-white px-2.5 py-1 rounded-full ${roleColor}`}>
              {roleLabel}
            </span>
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center cursor-pointer"
                 onClick={() => navigate('/profile')}>
              <span className="text-sm font-semibold text-brand-700">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
