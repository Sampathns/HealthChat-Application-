import React, { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';
import {
  MagnifyingGlassIcon, StarIcon, CalendarDaysIcon,
  CheckBadgeIcon, ClockIcon, CurrencyDollarIcon, FunnelIcon, UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { usersAPI, appointmentsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['All','Cardiology','Neurology','Orthopedics','Dermatology','Pediatrics','Psychiatry','Oncology','General Medicine','Surgery','Gynecology','Ophthalmology','ENT'];

const AVATAR_GRADIENTS = [
  ['#0ea5e9','#0284c7'],['#8b5cf6','#7c3aed'],['#10b981','#059669'],
  ['#f59e0b','#d97706'],['#f43f5e','#e11d48'],['#14b8a6','#0d9488'],
];

const SPEC_STYLES = {
  Cardiology:         'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400',
  Neurology:          'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Orthopedics:        'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  Dermatology:        'bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
  Pediatrics:         'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Psychiatry:         'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
  Oncology:           'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  'General Medicine':'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400',
  Surgery:           'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  Gynecology:        'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
  Ophthalmology:     'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400',
  ENT:               'bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-400',
};

/* DiceBear avatar URL — gives consistent realistic-looking portraits */
const getAvatarUrl = (name, index) => {
  const seed = encodeURIComponent((name || 'Doctor').replace(/Dr\.?\s*/i,'').trim());
  const styles = ['lorelei','notionists','personas','avataaars'];
  const style = styles[index % styles.length];
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

const getGradient = (i) => {
  const [f,t] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg,${f},${t})`;
};

const Stars = ({ rating=0 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i =>
      i <= Math.floor(rating)
        ? <StarSolid key={i} className="w-3.5 h-3.5 text-amber-400" />
        : <StarIcon key={i} className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
    )}
    {rating > 0 && <span className="text-xs text-slate-500 dark:text-slate-400 ml-1 font-medium">{rating.toFixed(1)}</span>}
  </div>
);

function BookingModal({ doctor, index, onClose, onSuccess, onOpenPayment }) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState('in-person');
  const [slotsLoading, setSlotsLoading] = useState(false);

  const fetchSlots = async (d) => {
    setSlotsLoading(true);
    try { const { data } = await appointmentsAPI.getAvailableSlots(doctor._id, d); setSlots(data.slots || []); }
    catch { setSlots([]); } finally { setSlotsLoading(false); }
  };

  // 💡 මෙතනදී කෙලින්ම API කෝල් කරන්නේ නැතුව පේමන්ට් මොඩල් එකට දත්ත ටික යවනවා
  const handleProceedToPayment = () => {
    if (!date || !selectedSlot || !reason.trim()) return toast.error('Please fill all fields');
    
    // බුකින් විස්තර ටික අපේ ප්‍රධාන පේජ් එකට පාස් කරනවා පේමන්ට් එකෙන් පස්සේ බුක් කරන්න
    onOpenPayment({
      doctorId: doctor._id,
      date,
      startTime: selectedSlot,
      reason,
      type
    });
    onClose(); // බුකින් window එක වහනවා
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="card w-full max-w-lg shadow-2xl my-4 animate-slide-up overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0" style={{ background: getGradient(index) }}>
              <img src={getAvatarUrl(doctor.name, index)} alt={doctor.name} className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; }} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-white">Dr. {doctor.name}</h2>
              <p className={`text-xs font-semibold px-2 py-0.5 rounded-lg inline-block mt-1 ${SPEC_STYLES[doctor.specialization] || 'bg-slate-100 text-slate-600'}`}>{doctor.specialization}</p>
              {doctor.consultationFee > 0 && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fee: <span className="font-bold text-emerald-600 dark:text-emerald-400">${doctor.consultationFee}</span></p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['in-person','video'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${type===t ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-gray-600 text-slate-500 hover:border-primary-300'}`}>
                {t === 'video' ? '🎥 Video call' : '🏥 In-person'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select date</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(''); fetchSlots(e.target.value); }}
              min={new Date().toISOString().split('T')[0]} className="input" />
          </div>

          {date && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Available time slots</label>
              {slotsLoading
                ? <div className="flex flex-wrap gap-2">{[...Array(8)].map((_,i) => <div key={i} className="skeleton h-9 w-16 rounded-xl" />)}</div>
                : slots.length === 0
                  ? <p className="text-sm text-slate-500 p-4 bg-slate-50 dark:bg-gray-700 rounded-xl text-center">No slots available. Try another date.</p>
                  : <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                      {slots.map(slot => (
                        <button key={slot} onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${selectedSlot===slot ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-400 hover:border-primary-300'}`}>
                          {slot}
                        </button>
                      ))}
                    </div>
              }
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reason for visit</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="input resize-none" placeholder="Describe your symptoms or concern…" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleProceedToPayment} disabled={!date || !selectedSlot || !reason.trim()} className="btn-primary flex-1 justify-center">
            <CalendarDaysIcon className="w-4 h-4" /> Proceed to Pay
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('All');
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingIndex, setBookingIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  
  // 👇 Fake Payment එකට අවශ්‍ය අලුත් States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const { isUserOnline } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.search = search;
        if (specialization !== 'All') params.specialization = specialization;
        const { data } = await usersAPI.getDoctors(params);
        setDoctors(data.doctors || []);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, specialization]);

  // 💡 බුකින් මොඩල් එකෙන් දත්ත අරන් පේමන්ට් එක පෙන්වන function එක
// 💡 මේ function එක හොයලා මෙහෙම වෙනස් කරන්න
const handleOpenPayment = (bookingData) => {
  setPendingBookingData({
    ...bookingData,
    consultationFee: bookingDoctor?.consultationFee // 👈 ඩොක්ටර්ගේ ගාණ මෙතනින් ඇතුළත් කරනවා
  });
  setIsPaymentOpen(true);
};
  // 💡 පේමන්ට් එක සක්සස් වුණාම ඇත්තටම ඩේටාබේස් එකට බුකින් එක යවන තැන
  const handlePaymentSuccess = async () => {
    setIsPaymentOpen(false);
    setBookingLoading(true);
    const loadToast = toast.loading('Saving your appointment...');
    
    try {
      await appointmentsAPI.bookAppointment({
        ...pendingBookingData,
        paymentStatus: 'Paid' // Backend එකට paid කියලා යවනවා
      });
      toast.dismiss(loadToast);
      toast.success('Appointment booked successfully! 🎉');
      setBookingDoctor(null);
    } catch (e) {
      toast.dismiss(loadToast);
      toast.error(e.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const DoctorCard = ({ doc, idx }) => {
    const online = isUserOnline(doc._id);
    const specStyle = SPEC_STYLES[doc.specialization] || 'bg-slate-100 text-slate-700';
    const gradient = getGradient(idx);
    const avatarUrl = getAvatarUrl(doc.name, idx);

    return (
      <div className="doctor-card animate-fade-in">
        {/* Avatar with DiceBear image */}
        <div className="relative mt-2">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg" style={{ background: gradient }}>
            <img src={avatarUrl} alt={`Dr. ${doc.name}`} className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; }} />
          </div>
          {online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-800 online-pulse" />
          )}
          {doc.isVerified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md" style={{ background: gradient }}>
              <CheckBadgeIcon className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Name & spec */}
        <div className="w-full space-y-1">
          <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white">Dr. {doc.name}</h3>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${specStyle}`}>
            {doc.specialization || 'General'}
          </div>
        </div>

        {/* Stars */}
        <Stars rating={doc.rating} />

        {/* Stats */}
        <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400 px-1 border-t border-slate-100 dark:border-gray-700 pt-2">
          {doc.experience > 0 && (
            <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />{doc.experience} yrs</span>
          )}
          {doc.consultationFee > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />${doc.consultationFee}
            </span>
          )}
          <span className={`flex items-center gap-1 font-medium ${online ? 'text-emerald-500' : 'text-slate-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-500 online-pulse' : 'bg-slate-300'}`} />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 w-full">
          <button onClick={() => navigate(`/chat/${doc._id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
            Message
          </button>
          <button onClick={() => { setBookingDoctor(doc); setBookingIndex(idx); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
            style={{ background: gradient }}>
            <CalendarDaysIcon className="w-3.5 h-3.5" /> Book
          </button>
        </div>
      </div>
    );
  };

  const DoctorRow = ({ doc, idx }) => {
    const online = isUserOnline(doc._id);
    const specStyle = SPEC_STYLES[doc.specialization] || 'bg-slate-100 text-slate-700';
    const gradient = getGradient(idx);
    return (
      <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-all animate-fade-in">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-md" style={{ background: gradient }}>
            <img src={getAvatarUrl(doc.name, idx)} alt={`Dr. ${doc.name}`} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
          </div>
          {online && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white dark:border-gray-800" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-slate-900 dark:text-white">Dr. {doc.name}</p>
            {doc.isVerified && <span className="badge badge-verified text-[10px] py-0"><CheckBadgeIcon className="w-3 h-3" /> Verified</span>}
          </div>
          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold ${specStyle}`}>{doc.specialization}</span>
          <div className="flex items-center gap-3 mt-1.5">
            <Stars rating={doc.rating} />
            {doc.experience > 0 && <span className="text-xs text-slate-500">{doc.experience} yrs exp</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {doc.consultationFee > 0 && (
            <div className="text-center">
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">${doc.consultationFee}</p>
              <p className="text-[10px] text-slate-400">per visit</p>
            </div>
          )}
          <button onClick={() => navigate(`/chat/${doc._id}`)} className="btn-secondary py-1.5 px-3 text-xs">Chat</button>
          <button onClick={() => { setBookingDoctor(doc); setBookingIndex(idx); }} className="btn-primary py-1.5 px-3 text-xs">Book</button>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white">Find a Doctor</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {loading ? 'Searching…' : `${doctors.length} specialist${doctors.length !== 1 ? 's' : ''} available`}
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-gray-800 rounded-xl">
          {[
            ['grid','M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z'],
            ['list','M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z']
          ].map(([mode, path]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`p-2 rounded-lg transition-all ${viewMode===mode ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-box flex-1">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors by name or specialty…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select value={specialization} onChange={e => setSpecialization(e.target.value)} className="input py-2.5 sm:w-44 text-sm">
            {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Specialty chips */}
      <div className="flex gap-2 flex-wrap">
        {['All','Cardiology','Neurology','Orthopedics','Dermatology','Pediatrics','General Medicine'].map(s => (
          <button key={s} onClick={() => setSpecialization(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              specialization === s
                ? 'bg-primary-600 text-white shadow-sm'
                : `${SPEC_STYLES[s] || 'bg-slate-100 text-slate-600'} hover:opacity-80`
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {[...Array(6)].map((_,i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-20 w-20 rounded-2xl mx-auto mb-3" />
              <div className="skeleton h-4 w-32 mx-auto mb-2" />
              <div className="skeleton h-3 w-24 mx-auto mb-3" />
              <div className="skeleton h-8 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="card p-16 text-center">
          <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">No doctors found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc, i) => <DoctorCard key={doc._id} doc={doc} idx={i} />)}
        </div>
      ) : (
        <div className="space-y-3">
          {doctors.map((doc, i) => <DoctorRow key={doc._id} doc={doc} idx={i} />)}
        </div>
      )}

      {/* 🏥 Booking Modal */}
      {bookingDoctor && (
        <BookingModal 
          doctor={bookingDoctor} 
          index={bookingIndex} 
          onClose={() => setBookingDoctor(null)} 
          onSuccess={() => setBookingDoctor(null)} 
          onOpenPayment={handleOpenPayment} // 👈 මෙතනින් Payment එක open කරන්න link කළා
        />
      )}

    
    {/* 💳 Fake Card Payment Modal */}
<PaymentModal 
  isOpen={isPaymentOpen} 
  onClose={() => setIsPaymentOpen(false)} 
  onPaymentSuccess={handlePaymentSuccess} 
  // 💡 කලින් bookingDoctor?.consultationFee තිබුණ තැනට pendingBookingData හරහා එන මුදල දෙන්න
  amount={pendingBookingData?.consultationFee || bookingDoctor?.consultationFee || 15} 
/>
    </div>
  );
}