import { useState } from 'react';
import { Banknote, QrCode, Landmark, Delete, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentProps {
  onSuccess: () => void;
  worker?: any;
}

export function Payment({ onSuccess, worker }: Readonly<PaymentProps>) {
  const [amount, setAmount] = useState<string>('0');
  const [mode, setMode] = useState<'Cash' | 'UPI' | 'Bank'>('Cash');
  const [entryType, setEntryType] = useState<'Advance' | 'Payment'>('Advance');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const updateDisplay = () => amount === "" ? "0" : amount;

  const pressKey = (key: string) => {
    if (key === 'back') {
      setAmount(prev => {
        const next = prev.slice(0, -1);
        return next === "" ? "0" : next;
      });
    } else {
      setAmount(prev => {
        if (prev === "0") {
          return key === "." ? "0." : key;
        }
        if (key === "." && prev.includes(".")) return prev;
        if (prev.length > 8) return prev;
        return prev + key;
      });
    }
  };

  const addAmount = (val: number) => {
    setAmount(prev => {
      const num = parseFloat(prev) || 0;
      return (num + val).toString();
    });
  };

  const handleConfirm = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!worker) {
      alert("No worker selected.");
      return;
    }

    setLoading(true);
    try {
      if (entryType === 'Advance') {
        const { error } = await supabase.from('deduction').insert([{
          labourId: worker.id,
          point_date: date,
          amount: num,
          reason: notes || 'Advance'
        }]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment').insert([{
          labourId: worker.id,
          point_date: date,
          amount: num,
          mode,
          notes
        }]);
        if (error) throw error;
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const outstanding = worker?.previousDue || 0;

  return (
    <div className="flex-grow flex flex-col p-4 gap-4 max-w-md mx-auto w-full pb-24 h-full">
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 flex flex-col h-full">
      {/* Entry Type Toggle */}
      <div className="flex bg-surface-container-low border border-outline-variant/50 p-1 rounded-md mb-4">
        <button
          onClick={() => setEntryType('Advance')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
            entryType === 'Advance' ? 'bg-surface-bright text-primary shadow-sm border border-outline-variant/50' : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Advance Entry
        </button>
        <button
           onClick={() => setEntryType('Payment')}
           className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
             entryType === 'Payment' ? 'bg-surface-bright text-primary shadow-sm border border-outline-variant/50' : 'text-on-surface-variant hover:bg-surface-container'
           }`}
        >
          Regular Payment
        </button>
      </div>

       {/* Labour Info (if present) */}
      {worker && (
        <div className="flex justify-between items-center text-sm border-b border-outline-variant/60 pb-3 mb-4">
          <span className="font-bold text-on-surface tracking-tight text-lg">{worker.name}</span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full">{worker.role || worker.type}</span>
        </div>
      )}

      {/* Outstanding Due */}
      <div className="bg-error/5 border border-error/20 rounded-lg p-3 text-center mb-4">
        <p className="text-[10px] font-bold text-error uppercase tracking-wider">Previous Outstanding</p>
        <p className="text-xl font-extrabold text-error tracking-tight mt-0.5">₹{outstanding.toLocaleString('en-IN')}</p>
      </div>

      {/* Amount Display */}
      <div className="flex flex-col items-center py-6 bg-surface-container-low border border-outline-variant/50 rounded-lg mb-4 shadow-inner">
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Enter Amount</label>
        <div className="flex items-center justify-center gap-1 w-full overflow-hidden px-4">
          <span className="text-3xl font-extrabold text-primary">₹</span>
          <input 
            type="text" 
            value={updateDisplay()} 
            readOnly 
            className="bg-transparent border-none text-center text-5xl font-extrabold focus:ring-0 text-on-surface w-auto max-w-[80%] outline-none tracking-tighter"
          />
        </div>
      </div>

      {/* Date & Remarks */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5 ">Date</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Remarks</label>
          <input 
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Quick Amounts */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[500, 1000, 2000, 5000].map(val => (
          <button 
            key={val}
            onClick={() => addAmount(val)}
            className="py-2.5 bg-surface-container border border-outline-variant rounded-md text-xs font-bold text-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-95"
          >
            + {val}
          </button>
        ))}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['Cash', 'UPI', 'Bank'] as const).map(m => {
          const isSelected = mode === m;
          return (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-1.5 p-3 rounded-md transition-all border ${
                isSelected 
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                  : 'bg-surface-bright border-outline-variant text-on-surface-variant font-semibold hover:bg-surface-container-low'
              }`}
            >
              {m === 'Cash' && <Banknote className="w-4 h-4" />}
              {m === 'UPI' && <QrCode className="w-4 h-4" />}
              {m === 'Bank' && <Landmark className="w-4 h-4" />}
              <span className="text-xs uppercase tracking-wide">{m}</span>
            </button>
          )
        })}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 flex-grow mt-auto mb-20">
        {['1','2','3','4','5','6','7','8','9','.' ,'0'].map(key => (
          <button 
            key={key}
            onClick={() => pressKey(key)}
            className="bg-surface-container-low border border-outline-variant/50 rounded-md text-2xl font-bold flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-[0.98] transition-all py-3"
          >
            {key}
          </button>
        ))}
        <button 
          onClick={() => pressKey('back')}
          className="bg-error/5 border border-error/20 rounded-md flex items-center justify-center text-error hover:bg-error/10 active:scale-[0.98] transition-all py-3"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

       {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-bright border-t border-outline-variant z-[60] shadow-[0_-4px_10px_rgba(0,0,0,0.03)] pb-safe">
        <div className="max-w-md mx-auto flex gap-3">
          <button 
             onClick={() => onSuccess()}
             className="px-6 py-4 bg-surface-container-low text-on-surface-variant text-sm font-bold uppercase tracking-widest rounded-md shadow-sm active:scale-[0.99] transition-transform border border-outline-variant/50"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-4 bg-primary text-white text-sm uppercase tracking-widest font-bold rounded-md shadow-md active:scale-[0.99] hover:bg-primary-container hover:text-on-primary-container transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirm Entry'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
