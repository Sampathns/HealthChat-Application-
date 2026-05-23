import React, { useState } from 'react';

const PaymentModal = ({ isOpen, onClose, onPaymentSuccess, amount }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // 💳 කාඩ් නම්බර් එක 4න් 4ට ලස්සනට හිස්තැන් තියන්න (Formatting)
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(value);
  };

  // 📅 Expiry date එකට auto slash (/) එක දාන්න
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
    }
    setExpiry(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, '').length !== 16 || cvv.length !== 3) {
      alert("Please enter valid card details! (Card: 16 digits, CVV: 3 digits)");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onPaymentSuccess();
    }, 2500); // තත්පර 2.5ක premium loading delay එකක්
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 p-6 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden font-sans">
        
        {/* Background Neon Glows */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Title */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold bg-gradient-to-r stream-text from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Secure Checkout
          </h3>
          <p className="text-xs text-slate-400 mt-1">Modern Encryption Guaranteed</p>
        </div>

        {/* 💳 VIRTUAL CREDIT CARD (UX HIGH POINT) */}
        <div className="w-full h-44 rounded-2xl bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 p-5 relative shadow-xl border border-slate-700/50 mb-6 overflow-hidden flex flex-col justify-between">
          {/* Card Tech Design */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full translate-x-10 -translate-y-10 pointer-events-none"></div>
          
          <div className="flex justify-between items-start">
            {/* Chip */}
            <div className="w-10 h-8 rounded-md bg-gradient-to-br from-amber-400 to-yellow-600 opacity-80 shadow-inner"></div>
            {/* Visa/Master fake logo */}
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-full bg-rose-500/80 backdrop-blur-sm"></div>
              <div className="w-6 h-6 rounded-full bg-amber-500/80 -ml-3 backdrop-blur-sm"></div>
            </div>
          </div>

          {/* Card Number Display */}
          <div className="text-xl tracking-widest font-mono my-3 text-slate-200">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>

          {/* Card Holder & Expiry */}
          <div className="flex justify-between items-end font-mono">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Card Holder</p>
              <p className="text-xs text-slate-300 truncate max-w-[180px]">{name.toUpperCase() || 'YOUR NAME'}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-slate-500">Expires</p>
              <p className="text-xs text-slate-300">{expiry || 'MM/YY'}</p>
            </div>
          </div>
        </div>

        {/* AMOUNT DISPLAY */}
        <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center mb-5">
          <span className="text-xs text-slate-400">Total Consultation Fee</span>
          <span className="text-lg font-extrabold text-emerald-400">${amount}</span>
        </div>

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cardholder Name</label>
            <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required 
              className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Card Number</label>
            <input type="text" placeholder="4242 4242 4242 4242" maxLength="19" value={cardNumber} onChange={handleCardNumberChange} required 
              className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Expiration</label>
              <input type="text" placeholder="MM/YY" maxLength="5" value={expiry} onChange={handleExpiryChange} required 
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">CVV</label>
              <input type="password" placeholder="•••" maxLength="3" value={cvv} onChange={(e) => setCvv(e.target.value)} required 
                className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none font-mono transition-colors" />
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-2 space-y-2">
            <button type="submit" disabled={loading} 
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-purple-900/30 flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authorizing...</span>
                </>
              ) : (
                `Pay $${amount}`
              )}
            </button>
            
            <button type="button" onClick={onClose} disabled={loading} 
              className="w-full bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 py-2.5 rounded-xl text-xs font-medium transition-colors">
              Cancel Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;