import React, { useState, useRef } from 'react';
import {
  UserCircleIcon, CameraIcon, ShieldCheckIcon,
  BellIcon, KeyIcon, HeartIcon,
} from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const SPECIALIZATIONS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics',
  'Psychiatry', 'Oncology', 'General Medicine', 'Surgery', 'Gynecology',
  'Ophthalmology', 'ENT', 'Urology', 'Endocrinology', 'Nephrology',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    dateOfBirth: user?.dateOfBirth?.split('T')[0] || '',
    gender: user?.gender || '',
    address: user?.address || {},
    // Doctor fields
    specialization: user?.specialization || '',
    experience: user?.experience || '',
    consultationFee: user?.consultationFee || '',
    availableSlots: user?.availableSlots || [],
    // Patient fields
    bloodGroup: user?.bloodGroup || '',
    allergies: user?.allergies || [],
    medicalConditions: user?.medicalConditions || [],
    emergencyContact: user?.emergencyContact || {},
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const fileRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        }
      });
      const { data } = await authAPI.updateProfile(fd);
      updateUser(data.user);
      toast.success('Profile updated successfully');
    } catch (e) { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await authAPI.updateProfile(fd);
      updateUser(data.user);
      toast.success('Avatar updated');
    } catch (e) { toast.error('Failed to upload avatar'); }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return toast.error('Passwords do not match');
    if (passwordForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPwd(true);
    try {
      await authAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setSavingPwd(false); }
  };

  const toggleSlot = (day) => {
    setForm(f => {
      const exists = f.availableSlots.find(s => s.day === day);
      if (exists) return { ...f, availableSlots: f.availableSlots.filter(s => s.day !== day) };
      return { ...f, availableSlots: [...f.availableSlots, { day, startTime: '09:00', endTime: '17:00' }] };
    });
  };

  const updateSlotTime = (day, field, value) => {
    setForm(f => ({
      ...f,
      availableSlots: f.availableSlots.map(s => s.day === day ? { ...s, [field]: value } : s),
    }));
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: UserCircleIcon },
    { id: 'medical', label: user?.role === 'doctor' ? 'Practice Info' : 'Medical Info', icon: HeartIcon },
    { id: 'security', label: 'Security', icon: KeyIcon },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5 animate-fade-in">
      <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>

      {/* Avatar */}
      <div className="card p-5 flex items-center gap-5">
        <div className="relative">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=0284c7&color=fff&size=80`}
            className="w-20 h-20 rounded-2xl object-cover" alt={user?.name} />
          <button onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors">
            <CameraIcon className="w-3.5 h-3.5" />
          </button>
          <input type="file" ref={fileRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
        </div>
        <div>
          <p className="font-heading font-bold text-lg text-slate-900 dark:text-white">{user?.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge capitalize ${
              user?.role === 'doctor' ? 'bg-green-100 text-green-700' :
              user?.role === 'admin' ? 'bg-purple-100 text-purple-700' :
              'bg-blue-100 text-blue-700'
            }`}>{user?.role}</span>
            {user?.isVerified && (
              <span className="flex items-center gap-1 badge bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                <ShieldCheckIcon className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id ? 'bg-white dark:bg-gray-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Personal Info ─────────────────────────────────────────────────── */}
      {tab === 'personal' && (
        <div className="card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input" placeholder="+1 234 567 8900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="input">
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Address</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Street" value={form.address?.street || ''}
                onChange={e => setForm(f => ({ ...f, address: { ...f.address, street: e.target.value } }))} className="input" />
              <input type="text" placeholder="City" value={form.address?.city || ''}
                onChange={e => setForm(f => ({ ...f, address: { ...f.address, city: e.target.value } }))} className="input" />
              <input type="text" placeholder="State" value={form.address?.state || ''}
                onChange={e => setForm(f => ({ ...f, address: { ...f.address, state: e.target.value } }))} className="input" />
              <input type="text" placeholder="Country" value={form.address?.country || ''}
                onChange={e => setForm(f => ({ ...f, address: { ...f.address, country: e.target.value } }))} className="input" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Medical / Practice Info ─────────────────────────────────────────── */}
      {tab === 'medical' && (
        <div className="card p-5 space-y-4">
          {user?.role === 'doctor' ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Specialization</label>
                  <select value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} className="input">
                    <option value="">Select specialization</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Years of Experience</label>
                  <input type="number" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} className="input" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Consultation Fee ($)</label>
                  <input type="number" value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} className="input" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Available Days & Hours</label>
                <div className="space-y-2">
                  {DAYS.map(day => {
                    const slot = form.availableSlots.find(s => s.day === day);
                    return (
                      <div key={day} className="flex items-center gap-3">
                        <button onClick={() => toggleSlot(day)}
                          className={`w-14 text-xs font-medium py-1.5 rounded-lg border transition-all ${
                            slot ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-gray-600 text-slate-500'
                          }`}>{day}</button>
                        {slot && (
                          <div className="flex items-center gap-2">
                            <input type="time" value={slot.startTime}
                              onChange={e => updateSlotTime(day, 'startTime', e.target.value)}
                              className="input py-1 text-xs w-28" />
                            <span className="text-xs text-slate-400">to</span>
                            <input type="time" value={slot.endTime}
                              onChange={e => updateSlotTime(day, 'endTime', e.target.value)}
                              className="input py-1 text-xs w-28" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Blood Group</label>
                  <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="input">
                    <option value="">Unknown</option>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Allergies</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={allergyInput} onChange={e => setAllergyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && allergyInput.trim()) { setForm(f => ({ ...f, allergies: [...f.allergies, allergyInput.trim()] })); setAllergyInput(''); }}}
                    className="input flex-1" placeholder="e.g. Penicillin" />
                  <button onClick={() => { if (allergyInput.trim()) { setForm(f => ({ ...f, allergies: [...f.allergies, allergyInput.trim()] })); setAllergyInput(''); }}} className="btn-secondary">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.allergies.map((a, i) => (
                    <span key={i} className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
                      {a} <button onClick={() => setForm(f => ({ ...f, allergies: f.allergies.filter((_, idx) => idx !== i) }))}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Medical Conditions</label>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={conditionInput} onChange={e => setConditionInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && conditionInput.trim()) { setForm(f => ({ ...f, medicalConditions: [...f.medicalConditions, conditionInput.trim()] })); setConditionInput(''); }}}
                    className="input flex-1" placeholder="e.g. Hypertension" />
                  <button onClick={() => { if (conditionInput.trim()) { setForm(f => ({ ...f, medicalConditions: [...f.medicalConditions, conditionInput.trim()] })); setConditionInput(''); }}} className="btn-secondary">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.medicalConditions.map((c, i) => (
                    <span key={i} className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 gap-1">
                      {c} <button onClick={() => setForm(f => ({ ...f, medicalConditions: f.medicalConditions.filter((_, idx) => idx !== i) }))}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Emergency Contact</label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="Name" value={form.emergencyContact?.name || ''}
                    onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, name: e.target.value } }))} className="input" />
                  <input type="tel" placeholder="Phone" value={form.emergencyContact?.phone || ''}
                    onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, phone: e.target.value } }))} className="input" />
                  <input type="text" placeholder="Relation" value={form.emergencyContact?.relation || ''}
                    onChange={e => setForm(f => ({ ...f, emergencyContact: { ...f.emergencyContact, relation: e.target.value } }))} className="input" />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Security ─────────────────────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white mb-4">Change Password</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
                <input type="password" value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                <input type="password" value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="input" placeholder="Min. 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
                <input type="password" value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="input" placeholder="Repeat new password" />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handlePasswordChange} disabled={savingPwd || !passwordForm.currentPassword || !passwordForm.newPassword}
              className="btn-primary">
              {savingPwd ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Password'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
