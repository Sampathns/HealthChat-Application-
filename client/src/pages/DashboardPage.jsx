import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon, SparklesIcon, ClockIcon, CheckCircleIcon,
  UserGroupIcon, ArrowTrendingUpIcon, ArrowRightIcon,
  DocumentTextIcon, FolderIcon, BellIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../context/authStore';
import { appointmentsAPI, prescriptionsAPI } from '../services/api';
import { format, isToday, isTomorrow } from 'date-fns';

const AVATAR_GRADIENTS = [
  ['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#10b981','#059669'],
  ['#f59e0b','#d97706'],['#f43f5e','#e11d48'],['#14b8a6','#0d9488'],
];

const getGradient = (i=0) => {
  const [f,t] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg,${f},${t})`;
};

const getDiceBearUrl = (name='User', i=0) => {
  const seed = encodeURIComponent(name.replace(/Dr\.?\s*/i,'').trim());
  const styles = ['lorelei','notionists','personas','avataaars'];
  return `https://api.dicebear.com/7.x/${styles[i%styles.length]}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

const STATUS_BADGE = {
  pending:   'badge-pending',
  approved:  'badge-approved',
  cancelled: 'badge-cancelled',
  completed: 'badge-completed',
};

const STAT_CONFIGS = {
  patient: [
    { key:'upcoming', label:'Upcoming',      icon:CalendarDaysIcon, cls:'stat-icon-blue',   link:'/appointments' },
    { key:'pending',  label:'Pending',        icon:ClockIcon,        cls:'stat-icon-amber',  link:'/appointments' },
    { key:'rxActive', label:'Prescriptions',  icon:DocumentTextIcon, cls:'stat-icon-green',  link:'/prescriptions' },
    { key:'total',    label:'Total Appts',    icon:CheckCircleIcon,  cls:'stat-icon-purple', link:'/appointments' },
  ],
  doctor: [
    { key:'pending',  label:'Pending Req',   icon:ClockIcon,        cls:'stat-icon-amber',  link:'/appointments' },
    { key:'today',    label:"Today's Appts", icon:CalendarDaysIcon, cls:'stat-icon-blue',   link:'/appointments' },
    { key:'rxActive', label:'Prescriptions', icon:DocumentTextIcon, cls:'stat-icon-green',  link:'/prescriptions' },
    { key:'patients', label:'Patients',      icon:UserGroupIcon,    cls:'stat-icon-purple', link:'/appointments' },
  ],
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const dateLabel = (d) => {
  const dt = new Date(d);
  if (isToday(dt)) return 'Today';
  if (isTomorrow(dt)) return 'Tomorrow';
  return format(dt, 'MMM d');
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, p] = await Promise.all([
          appointmentsAPI.getAppointments({ limit: 6 }),
          prescriptionsAPI.getPrescriptions(),
        ]);
        setAppointments(a.data.appointments || []);
        setPrescriptions(p.data.prescriptions || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const stats = {
    upcoming: appointments.filter(a => a.status === 'approved' && new Date(a.date) >= new Date()).length,
    pending:  appointments.filter(a => a.status === 'pending').length,
    rxActive: prescriptions.filter(p => p.isActive).length,
    total:    appointments.length,
    today:    appointments.filter(a => isToday(new Date(a.date))).length,
    patients: new Set(appointments.map(a => a.patient?._id)).size,
  };

  const configs = STAT_CONFIGS[user?.role] || STAT_CONFIGS.patient;
  const upcomingApts = appointments.filter(a => ['pending','approved'].includes(a.status)).slice(0, 4);

  const quickActions = [
    { label:'Book Appointment', icon:'🩺', to: user?.role==='patient' ? '/doctors' : '/appointments', gradient:'linear-gradient(135deg,#0ea5e9,#0284c7)', shadow:'rgb(14 165 233/.4)' },
    { label:'Open Chat',        icon:'💬', to:'/chat',            gradient:'linear-gradient(135deg,#10b981,#059669)', shadow:'rgb(16 185 129/.4)' },
    { label:'AI Health Check',  icon:'✨', to:'/ai-assistant',    gradient:'linear-gradient(135deg,#8b5cf6,#7c3aed)', shadow:'rgb(139 92 246/.4)' },
    { label:'View Reports',     icon:'📋', to:'/reports',         gradient:'linear-gradient(135deg,#f59e0b,#d97706)', shadow:'rgb(245 158 11/.4)', hide: user?.role==='admin' },
  ].filter(a => !a.hide);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* ── Hero greeting ─────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden p-6 lg:p-8 text-white"
        style={{ background:'linear-gradient(135deg,#0b1f3a 0%,#0c4a6e 50%,#0369a1 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#38bdf8,transparent)', transform:'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#818cf8,transparent)', transform:'translate(-50%,40%)' }} />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sky-300 text-sm font-medium">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            <h1 className="font-heading text-3xl font-bold mt-1">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-300 text-sm mt-2">
              {user?.role === 'doctor'
                ? `You have ${stats.pending} pending request${stats.pending !== 1 ? 's' : ''} today`
                : `You have ${stats.upcoming} upcoming appointment${stats.upcoming !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link to="/ai-assistant"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:scale-105"
            style={{ background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)' }}>
            <SparklesIcon className="w-4 h-4" /> AI Assistant
          </Link>
        </div>

        {/* Mini stat pills */}
        {!loading && (
          <div className="relative flex gap-3 mt-6 flex-wrap">
            {[
              { label:`${stats.upcoming} upcoming`, color:'#38bdf8' },
              { label:`${stats.pending} pending`,   color:'#fbbf24' },
              { label:`${stats.rxActive} active Rx`, color:'#34d399' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.15)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Stat cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map(({ key, label, icon: Icon, cls, link }) => (
          <Link key={key} to={link} className="card-hover p-5 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 ${cls} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <ArrowTrendingUpIcon className="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors" />
            </div>
            <p className="text-3xl font-heading font-bold text-slate-900 dark:text-white">
              {loading ? <span className="skeleton inline-block w-8 h-7 rounded" /> : stats[key] ?? 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Upcoming appointments ───────────────────── */}
        <div className="card lg:col-span-3">
          <div className="section-header">
            <div>
              <h2 className="font-heading font-bold text-slate-900 dark:text-white text-base">Upcoming Appointments</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Your scheduled visits</p>
            </div>
            <Link to="/appointments" className="flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              View all <ArrowRightIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-gray-800">
            {loading ? (
              [...Array(3)].map((_,i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-4">
                  <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-36 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                  <div className="skeleton h-6 w-16 rounded-lg" />
                </div>
              ))
            ) : upcomingApts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CalendarDaysIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming appointments</p>
                {user?.role === 'patient' && (
                  <Link to="/doctors" className="btn-primary mt-3 inline-flex text-xs">
                    Browse Doctors
                  </Link>
                )}
              </div>
            ) : upcomingApts.map((apt, i) => {
              const person = user?.role === 'patient' ? apt.doctor : apt.patient;
              const name = user?.role === 'patient' ? `Dr. ${person?.name}` : person?.name;

              return (
                <div key={apt._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm" style={{ background: getGradient(i) }}>
                      {person?.avatar
                        ? <img src={person.avatar} alt={name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                        : <img src={getDiceBearUrl(person?.name, i)} alt={name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {dateLabel(apt.date)} · {apt.startTime}
                      </span>
                      {apt.type === 'video' && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400">Video</span>
                      )}
                    </div>
                  </div>

                  <span className={`badge ${STATUS_BADGE[apt.status] || 'badge-pending'} flex-shrink-0`}>
                    {apt.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick actions ───────────────────────────── */}
        <div className="card lg:col-span-2 p-5">
          <div className="mb-4">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white text-base">Quick Actions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Frequently used shortcuts</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon, to, gradient, shadow }) => (
              <Link key={label} to={to}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl text-white text-center
                           transition-all duration-200 hover:scale-105 hover:opacity-95"
                style={{ background: gradient, boxShadow: `0 6px 20px ${shadow}` }}>
                <span className="text-2xl leading-none">{icon}</span>
                <span className="text-xs font-semibold leading-tight">{label}</span>
              </Link>
            ))}
          </div>

          {/* Recent prescriptions mini list */}
          {prescriptions.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recent Prescriptions</p>
                <Link to="/prescriptions" className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {prescriptions.slice(0,2).map(rx => (
                  <div key={rx._id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background:'linear-gradient(135deg,#f8faff,#f0f7ff)', border:'1px solid #dbeafe' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}>
                      <DocumentTextIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{rx.diagnosis}</p>
                      <p className="text-[10px] text-slate-500">{rx.medicines?.length} medicine{rx.medicines?.length!==1?'s':''}</p>
                    </div>
                    {rx.isActive && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Health activity bar chart ───────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-heading font-bold text-slate-900 dark:text-white text-base">Health Activity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Appointment history — last 6 months</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-primary-500" /> Appointments
          </div>
        </div>

        {/* Simple visual bar chart */}
        <div className="flex items-end gap-3 h-28">
          {['Jan','Feb','Mar','Apr','May','Jun'].map((month, i) => {
            const heights = [40, 65, 45, 80, 55, 90];
            const pct = heights[i];
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-xl transition-all duration-700 hover:opacity-80 cursor-pointer"
                  style={{
                    height: `${pct}%`,
                    background: i === 5
                      ? 'linear-gradient(180deg,#0ea5e9,#0284c7)'
                      : 'linear-gradient(180deg,#bae6fd,#e0f2fe)',
                  }} />
                <span className="text-[10px] font-medium text-slate-400">{month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
