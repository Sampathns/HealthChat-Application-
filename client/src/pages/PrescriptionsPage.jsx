import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon, PlusIcon, BeakerIcon, CalendarDaysIcon,
  UserIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { prescriptionsAPI, appointmentsAPI, usersAPI } from '../services/api';
import useAuthStore from '../context/authStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function CreatePrescriptionModal({ onClose, onSuccess }) {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({
    patientId: '', diagnosis: '', advice: '', followUpDate: '',
    medicines: [{ name: '', dosage: '', frequency: '', duration: '', timing: 'after-meal', instructions: '' }],
    labTests: [],
  });
  const [labInput, setLabInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Get unique patients from appointments
        const { data } = await appointmentsAPI.getAppointments({ status: 'completed', limit: 100 });
        const unique = [];
        const seen = new Set();
        (data.appointments || []).forEach(apt => {
          if (apt.patient && !seen.has(apt.patient._id)) {
            seen.add(apt.patient._id);
            unique.push(apt.patient);
          }
        });
        setPatients(unique);
      } catch (e) {}
    };
    fetchPatients();
  }, []);

  const addMedicine = () => setForm(f => ({
    ...f,
    medicines: [...f.medicines, { name: '', dosage: '', frequency: '', duration: '', timing: 'after-meal', instructions: '' }],
  }));

  const updateMedicine = (i, field, value) => setForm(f => ({
    ...f,
    medicines: f.medicines.map((m, idx) => idx === i ? { ...m, [field]: value } : m),
  }));

  const removeMedicine = (i) => setForm(f => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) }));

  const addLabTest = () => {
    if (labInput.trim()) {
      setForm(f => ({ ...f, labTests: [...f.labTests, labInput.trim()] }));
      setLabInput('');
    }
  };

  const handleSubmit = async () => {
    if (!form.patientId || !form.diagnosis || form.medicines.some(m => !m.name || !m.dosage)) {
      return toast.error('Please fill all required fields');
    }
    setLoading(true);
    try {
      await prescriptionsAPI.createPrescription(form);
      toast.success('Prescription created successfully');
      onSuccess();
      onClose();
    } catch (e) { toast.error('Failed to create prescription'); }
    finally { setLoading(false); }
  };

  const timingOptions = ['before-meal', 'after-meal', 'with-meal', 'anytime'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-2xl p-6 shadow-2xl my-4 animate-slide-up" onClick={e => e.stopPropagation()}>
        <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-5">Create Prescription</h2>

        <div className="space-y-4">
          {/* Patient */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Patient *</label>
            <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} className="input">
              <option value="">Select patient</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Diagnosis *</label>
            <input type="text" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              className="input" placeholder="e.g. Hypertension, Type 2 Diabetes" />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Medicines *</label>
              <button onClick={addMedicine} className="btn-secondary py-1 px-2 text-xs">
                <PlusIcon className="w-3.5 h-3.5" /> Add Medicine
              </button>
            </div>
            <div className="space-y-3">
              {form.medicines.map((med, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={med.name} onChange={e => updateMedicine(i, 'name', e.target.value)}
                      className="input" placeholder="Medicine name *" />
                    <input type="text" value={med.dosage} onChange={e => updateMedicine(i, 'dosage', e.target.value)}
                      className="input" placeholder="Dosage (e.g. 500mg) *" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={med.frequency} onChange={e => updateMedicine(i, 'frequency', e.target.value)}
                      className="input" placeholder="Frequency *" />
                    <input type="text" value={med.duration} onChange={e => updateMedicine(i, 'duration', e.target.value)}
                      className="input" placeholder="Duration *" />
                    <select value={med.timing} onChange={e => updateMedicine(i, 'timing', e.target.value)} className="input text-xs">
                      {timingOptions.map(t => <option key={t} value={t}>{t.replace('-', ' ')}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={med.instructions} onChange={e => updateMedicine(i, 'instructions', e.target.value)}
                      className="input flex-1" placeholder="Special instructions (optional)" />
                    {form.medicines.length > 1 && (
                      <button onClick={() => removeMedicine(i)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab Tests */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Lab Tests</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={labInput} onChange={e => setLabInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLabTest()}
                className="input flex-1" placeholder="e.g. CBC, Blood Sugar" />
              <button onClick={addLabTest} className="btn-secondary flex-shrink-0">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.labTests.map((t, i) => (
                <span key={i} className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
                  {t}
                  <button onClick={() => setForm(f => ({ ...f, labTests: f.labTests.filter((_, idx) => idx !== i) }))}>×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Advice & Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Advice</label>
              <textarea value={form.advice} onChange={e => setForm(f => ({ ...f, advice: e.target.value }))}
                rows={3} className="input resize-none" placeholder="General advice..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Follow-up Date</label>
              <input type="date" value={form.followUpDate} onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                className="input" min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Prescription'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PrescriptionCard({ rx }) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuthStore();

  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <DocumentTextIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-slate-900 dark:text-white">{rx.diagnosis}</p>
              {rx.isActive && <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {user.role === 'patient' ? `Dr. ${rx.doctor?.name} · ${rx.doctor?.specialization}` : rx.patient?.name}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CalendarDaysIcon className="w-3.5 h-3.5" />
                {format(new Date(rx.createdAt), 'MMM d, yyyy')}
              </span>
              <span className="text-xs text-slate-400">{rx.medicines?.length} medicine{rx.medicines?.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUpIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDownIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-gray-700 p-4 space-y-4 animate-fade-in">
          {/* Medicines */}
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Medicines</h4>
            <div className="space-y-2">
              {rx.medicines?.map((med, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BeakerIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{med.name} <span className="font-normal text-slate-500">· {med.dosage}</span></p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {med.frequency} · {med.duration} · {med.timing?.replace('-', ' ')}
                    </p>
                    {med.instructions && <p className="text-xs text-slate-400 italic mt-0.5">{med.instructions}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lab Tests */}
          {rx.labTests?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Lab Tests</h4>
              <div className="flex flex-wrap gap-2">
                {rx.labTests.map((t, i) => (
                  <span key={i} className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Advice */}
          {rx.advice && (
            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">Advice</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">{rx.advice}</p>
            </div>
          )}

          {/* Follow-up */}
          {rx.followUpDate && (
            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
              <ClockIcon className="w-4 h-4" />
              <span>Follow-up: {format(new Date(rx.followUpDate), 'MMMM d, yyyy')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PrescriptionsPage() {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await prescriptionsAPI.getPrescriptions();
      setPrescriptions(data.prescriptions || []);
    } catch (e) { toast.error('Failed to load prescriptions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Prescriptions</h1>
        {user.role === 'doctor' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Create Prescription
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card p-12 text-center">
          <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600 dark:text-slate-400">No prescriptions yet</p>
          <p className="text-sm text-slate-400 mt-1">
            {user.role === 'doctor' ? 'Create prescriptions for your patients' : 'Your prescriptions will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => <PrescriptionCard key={rx._id} rx={rx} />)}
        </div>
      )}

      {showCreate && (
        <CreatePrescriptionModal onClose={() => setShowCreate(false)} onSuccess={load} />
      )}
    </div>
  );
}
