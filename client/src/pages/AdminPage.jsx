import React, { useState, useEffect } from 'react';
import {
  UsersIcon, UserGroupIcon, CalendarDaysIcon, ShieldCheckIcon,
  ChartBarIcon, CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon,
  ArrowTrendingUpIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { adminAPI } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b'];

// 🛡️ Safety Helper Function to prevent "Invalid time value" RangeError
const safeFormat = (dateVal, formatStr = 'MMM d, yyyy', fallback = 'N/A') => {
  if (!dateVal) return fallback;
  const date = new Date(dateVal);
  return isValid(date) ? format(date, formatStr) : fallback;
};

const StatCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <ArrowTrendingUpIcon className="w-4 h-4 text-slate-300" />
    </div>
    <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white">{value ?? '—'}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-green-500 mt-1">{sub}</p>}
  </div>
);

export default function AdminPage() {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [analyticsRes, usersRes, apptRes] = await Promise.all([
          adminAPI.getAnalytics(),
          adminAPI.getUsers(),
          adminAPI.getAppointments(),
        ]);
        setAnalytics(analyticsRes.data.analytics);
        setUsers(usersRes.data.users || []);
        setAppointments(apptRes.data.appointments || []);
      } catch (e) { toast.error('Failed to load admin data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleToggleUser = async (id) => {
    setActionLoading(id);
    try {
      const { data } = await adminAPI.toggleUser(id);
      setUsers(prev => prev.map(u => u._id === id ? data.user : u));
      toast.success('User status updated');
    } catch (e) { toast.error('Failed to update user'); }
    finally { setActionLoading(null); }
  };

  const handleVerifyDoctor = async (id) => {
    setActionLoading(id + 'verify');
    try {
      const { data } = await adminAPI.verifyDoctor(id);
      setUsers(prev => prev.map(u => u._id === id ? data.user : u));
      toast.success('Doctor verified');
    } catch (e) { toast.error('Failed to verify doctor'); }
    finally { setActionLoading(null); }
  };

  const chartData = (analytics?.monthlyData || []).map(d => ({
    month: MONTH_NAMES[(d._id?.month || 1) - 1],
    appointments: d.count,
  }));

  const pieData = analytics ? [
    { name: 'Patients', value: analytics.totalPatients || 0 },
    { name: 'Doctors', value: analytics.totalDoctors || 0 },
  ] : [];

  const apptStatusData = [
    { name: 'Pending', value: analytics?.pendingAppointments || 0 },
    { name: 'Completed', value: analytics?.completedAppointments || 0 },
  ];

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
  ];

  const roleColors = {
    patient: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    doctor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const statusColors = {
    pending: 'status-pending', approved: 'status-approved',
    cancelled: 'status-cancelled', completed: 'status-completed',
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
          <ShieldCheckIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">System management & analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={analytics?.totalUsers} icon={UsersIcon} color="bg-blue-500" />
                <StatCard label="Doctors" value={analytics?.totalDoctors} icon={UserGroupIcon} color="bg-green-500" />
                <StatCard label="Patients" value={analytics?.totalPatients} icon={UsersIcon} color="bg-purple-500" />
                <StatCard label="Total Appointments" value={analytics?.totalAppointments} icon={CalendarDaysIcon} color="bg-orange-500" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Pending Appts" value={analytics?.pendingAppointments} icon={ClockIcon} color="bg-yellow-500" />
                <StatCard label="Completed Appts" value={analytics?.completedAppointments} icon={CheckCircleIcon} color="bg-teal-500" />
              </div>

              {/* Charts */}
              <div className="grid lg:grid-cols-3 gap-5">
                {/* Monthly appointments chart */}
                <div className="card p-5 lg:col-span-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">Monthly Appointments</h3>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="appointments" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No appointment data yet</div>
                  )}
                </div>

                {/* User breakdown pie */}
                <div className="card p-5">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">User Breakdown</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        dataKey="value" paddingAngle={4}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        {d.name}: <strong>{d.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent users */}
              <div className="card">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-700">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Recent Users</h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-gray-700">
                  {(analytics?.recentUsers || []).map(u => (
                    <div key={u._id} className="px-5 py-3 flex items-center gap-3">
                      <img
                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=0284c7&color=fff&size=32`}
                        className="w-8 h-8 rounded-xl object-cover" alt={u.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`badge capitalize ${roleColors[u.role]}`}>{u.role}</span>
                      {/* FIX 1: safeFormat Helper function */}
                      <span className="text-xs text-slate-400">{safeFormat(u.createdAt, 'MMM d')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS TAB ─────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search users..." value={search}
                    onChange={e => setSearch(e.target.value)} className="input pl-9" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input sm:w-36">
                  <option value="all">All Roles</option>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Role</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Joined</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                      {filteredUsers.map(u => (
                        <tr key={u._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=0284c7&color=fff&size=32`}
                                className="w-8 h-8 rounded-lg object-cover flex-shrink-0" alt={u.name} />
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-xs">{u.name}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge capitalize ${roleColors[u.role]}`}>{u.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                            {/* FIX 2: safeFormat Helper function */}
                            {safeFormat(u.createdAt, 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleUser(u._id)}
                                disabled={actionLoading === u._id}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                  u.isActive
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                                }`}>
                                {actionLoading === u._id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              {u.role === 'doctor' && !u.isVerified && (
                                <button
                                  onClick={() => handleVerifyDoctor(u._id)}
                                  disabled={actionLoading === u._id + 'verify'}
                                  className="text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors">
                                  {actionLoading === u._id + 'verify' ? '...' : 'Verify'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500">No users found</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── APPOINTMENTS TAB ──────────────────────────────────────────────── */}
          {tab === 'appointments' && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Patient</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Doctor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Date & Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {appointments.map(apt => (
                      <tr key={apt._id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={apt.patient?.avatar || `https://ui-avatars.com/api/?name=${apt.patient?.name}&background=0284c7&color=fff&size=28`}
                              className="w-7 h-7 rounded-lg" alt="" />
                            <span className="text-xs font-medium text-slate-800 dark:text-white">{apt.patient?.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-800 dark:text-white">Dr. {apt.doctor?.name}</p>
                          <p className="text-[11px] text-slate-400">{apt.doctor?.specialization}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          {/* FIX 3: safeFormat Helper function */}
                          {safeFormat(apt.date, 'MMM d, yyyy')} · {apt.startTime || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-400 capitalize">{apt.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={statusColors[apt.status] || 'badge'}>{apt.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {appointments.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">No appointments found</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
