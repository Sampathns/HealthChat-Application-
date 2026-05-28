import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon, CalendarDaysIcon, DocumentTextIcon, FolderIcon,
  UserGroupIcon, SparklesIcon, ShieldCheckIcon, UserCircleIcon,
  Bars3Icon, XMarkIcon, ArrowRightOnRectangleIcon, MoonIcon, SunIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../context/authStore';
import NotificationBell from './NotificationBell';
import toast from 'react-hot-toast';

function ChatIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}

const NAV = [
  { to:'/dashboard', icon:HomeIcon, label:'Dashboard', roles:['patient','doctor','admin'] },
  { to:'/chat', icon:ChatIcon, label:'Chat', roles:['patient','doctor','admin'] },
  { to:'/appointments', icon:CalendarDaysIcon, label:'Appointments', roles:['patient','doctor','admin'] },
  { to:'/prescriptions', icon:DocumentTextIcon, label:'Prescriptions', roles:['patient','doctor'] },
  { to:'/reports', icon:FolderIcon, label:'Reports', roles:['patient','doctor'] },
  { to:'/doctors', icon:UserGroupIcon, label:'Find Doctors', roles:['patient'] },
  { to:'/ai-assistant', icon:SparklesIcon, label:'AI Assistant', roles:['patient','doctor'] },
  { to:'/admin', icon:ShieldCheckIcon, label:'Admin Panel', roles:['admin'] },
];

const ROLE_PILL = {
  patient: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  doctor:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  admin:   'bg-violet-500/20 text-violet-300 border border-violet-500/30',
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  const filtered = NAV.filter(n => n.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    const d = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', d ? 'dark' : 'light');
    setDark(d);
  };

  const SidebarInner = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', boxShadow:'0 4px 14px rgb(14 165 233/.5)' }}>H</div>
        <div>
          <p className="font-heading font-bold text-white text-sm leading-none">HealthChat</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Healthcare Platform</p>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 mx-3 mt-3 rounded-2xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                  style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
            }
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0b1120]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md capitalize ${ROLE_PILL[user?.role] || ''}`}>{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2">Navigation</p>
        {filtered.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => setMobileOpen(false)}>
            <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width:'18px', height:'18px' }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/5 pt-3">
        <NavLink to="/profile" className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
          <UserCircleIcon className="w-4 h-4" /> Profile
        </NavLink>
        <button onClick={toggleDark} className="sidebar-item w-full text-left">
          {dark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={handleLogout} className="sidebar-item w-full text-left" style={{ color:'#f87171' }}>
          <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background:'var(--hc-bg)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background:'#0b1120' }}>
        <SidebarInner />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex-col flex z-10" style={{ background:'#0b1120' }}>
            <button onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarInner />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <Bars3Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-sm"
              style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>H</div>
            <span className="font-heading font-bold text-slate-900 dark:text-white text-sm">HealthChat</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop topbar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800">
          <div /> {/* spacer */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl object-cover" />
              : <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs"
                  style={{ background:'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>{user?.name?.[0]}</div>
            }
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f0f4f8] dark:bg-gray-950">
          <Outlet />
        </div>
      </main>
    </div>
  );
}