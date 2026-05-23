import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
  VideoCameraIcon, MapPinIcon, ArrowRightIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { appointmentsAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import toast from 'react-hot-toast';

const AVATAR_GRADIENTS = [
  ['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#10b981','#059669'],
  ['#f59e0b','#d97706'],['#f43f5e','#e11d48'],['#14b8a6','#0d9488'],
];
const getGradient = (name='') => {
  const i = (name.charCodeAt(0)||0) % AVATAR_GRADIENTS.length;
  const [f,t] = AVATAR_GRADIENTS[i];
  return `linear-gradient(135deg,${f},${t})`;
};
const getDiceBearUrl = (name='') => {
  const seed = encodeURIComponent(name.replace(/Dr\.?\s*/i,'').trim());
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede`;
};

const STATUS_CONFIG = {
  pending:   { cls:'badge-pending',   label:'Pending',   dot:'bg-amber-400' },
  approved:  { cls:'badge-approved',  label:'Approved',  dot:'bg-emerald-400' },
  cancelled: { cls:'badge-cancelled', label:'Cancelled', dot:'bg-red-400' },
  completed: { cls:'badge-completed', label:'Completed', dot:'bg-blue-400' },
  'no-show': { cls:'badge bg-slate-100 text-slate-600', label:'No Show', dot:'bg-slate-400' },
};

const dateLabel = (d) => {
  const dt = new Date(d);
  if (isToday(dt)) return { text:'Today', cls:'text-emerald-600 dark:text-emerald-400 font-bold' };
  if (isTomorrow(dt)) return { text:'Tomorrow', cls:'text-sky-600 dark:text-sky-400 font-bold' };
  return { text:format(dt,'MMM d, yyyy'), cls:'text-slate-600 dark:text-slate-400' };
};

const FILTERS = ['all','pending','approved','completed','cancelled'];

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await appointmentsAPI.getAppointments(params);
      setAppointments(data.appointments || []);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(id + status);
    try {
      await appointmentsAPI.updateStatus(id, { status });
      toast.success(`Appointment ${status} ✓`);
      load();
    } catch { toast.error('Failed to update'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setActionLoading(id + 'cancel');
    try {
      await appointmentsAPI.cancelAppointment(id, { reason: 'Cancelled by patient' });
      toast.success('Appointment cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to cancel'); }
    finally { setActionLoading(null); }
  };

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? appointments.length : appointments.filter(a => a.status === f).length;
    return acc;
  }, {});

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Appointments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Loading…' : `${appointments.length} appointment${appointments.length!==1?'s':''}`}
          </p>
        </div>
        {user.role === 'patient' && (
          <Link to="/doctors" className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Book Appointment
          </Link>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700'
            }`}>
            {f}
            {counts[f] > 0 && (
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filter === f ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-400'
              }`}>{counts[f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_,i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
                <div className="skeleton h-6 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background:'linear-gradient(135deg,#f0f4f8,#e2e8f0)' }}>
            <CalendarDaysIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-heading font-bold text-slate-700 dark:text-slate-300 text-lg">No appointments found</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            {filter !== 'all' ? `No ${filter} appointments` : user.role === 'patient' ? 'Book your first appointment' : 'No requests yet'}
          </p>
          {user.role === 'patient' && (
            <Link to="/doctors" className="btn-primary inline-flex">
              <PlusIcon className="w-4 h-4" /> Find a Doctor
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt, i) => {
            const person = user.role === 'patient' ? apt.doctor : apt.patient;
            const name   = user.role === 'patient' ? `Dr. ${person?.name}` : person?.name;
            const sub    = user.role === 'patient' ? person?.specialization : person?.phone || 'Patient';
            const sc     = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
            const dl     = dateLabel(apt.date);

            return (
              <div key={apt._id} className="card p-4 lg:p-5 hover:shadow-md transition-all animate-fade-in">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md" style={{ background: getGradient(person?.name||'') }}>
                      {person?.avatar
                        ? <img src={person.avatar} alt={name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                        : <img src={getDiceBearUrl(person?.name||'')} alt={name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-heading font-bold text-sm text-slate-900 dark:text-white">{name}</p>
                        {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${sc.cls} flex items-center gap-1.5`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                        <span className={`badge ${apt.type==='video' ? 'badge-video' : 'badge-inperson'}`}>
                          {apt.type==='video' ? '🎥 Video' : '🏥 In-person'}
                        </span>
                      </div>
                    </div>

                    {/* Date/time row */}
                    <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                      <span className={`flex items-center gap-1.5 text-xs ${dl.cls}`}>
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {dl.text}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {apt.startTime}
                      </span>
                      {apt.consultationFee > 0 && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          ${apt.consultationFee}
                        </span>
                      )}
                    </div>

                    {/* Reason */}
                    {apt.reason && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-1 italic">
                        "{apt.reason}"
                      </p>
                    )}

                    {/* Doctor notes */}
                    {apt.doctorNotes && (
                      <div className="mt-3 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                        style={{ background:'linear-gradient(135deg,#f0f9ff,#e0f2fe)', border:'1px solid #bae6fd' }}>
                        <span className="font-semibold text-sky-700 dark:text-sky-400">Note: </span>
                        {apt.doctorNotes}
                      </div>
                    )}

                    {/* Cancellation reason */}
                    {apt.status === 'cancelled' && apt.cancellationReason && (
                      <div className="mt-3 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400"
                        style={{ background:'#fef2f2', border:'1px solid #fecaca' }}>
                        <span className="font-semibold text-red-600">Cancelled: </span>
                        {apt.cancellationReason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {user.role === 'doctor' && apt.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusUpdate(apt._id,'approved')}
                          disabled={actionLoading === apt._id+'approved'}
                          className="btn-success py-1.5 px-3 text-xs">
                          {actionLoading===apt._id+'approved'
                            ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><CheckCircleIcon className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                        <button onClick={() => handleStatusUpdate(apt._id,'cancelled')}
                          disabled={actionLoading === apt._id+'cancelled'}
                          className="btn-danger py-1.5 px-3 text-xs">
                          <XCircleIcon className="w-3.5 h-3.5" /> Decline
                        </button>
                      </>
                    )}
                    {user.role === 'doctor' && apt.status === 'approved' && (
                      <button onClick={() => handleStatusUpdate(apt._id,'completed')}
                        disabled={actionLoading === apt._id+'completed'}
                        className="btn-secondary py-1.5 px-3 text-xs">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}
                    {user.role === 'patient' && ['pending','approved'].includes(apt.status) && (
                      <button onClick={() => handleCancel(apt._id)}
                        disabled={actionLoading === apt._id+'cancel'}
                        className="btn-danger py-1.5 px-3 text-xs">
                        <XCircleIcon className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                    {apt.videoLink && apt.status === 'approved' && (
                      <a href={apt.videoLink} target="_blank" rel="noreferrer" className="btn-success py-1.5 px-3 text-xs">
                        <VideoCameraIcon className="w-3.5 h-3.5" /> Join
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
