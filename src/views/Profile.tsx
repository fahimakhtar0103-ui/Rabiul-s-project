import React, { useState, useEffect } from 'react';
import { Download, IndianRupee, FileText, Calendar, Plus, Save, Phone, Home, FileSpreadsheet, Edit } from 'lucide-react';
import { LabourProfileData } from '../types';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useLanguage } from '../lib/LanguageContext';

interface ProfileProps {
  worker: any; // We receive basic worker from navigate
  onNavigate: (view: string, ctx?: any) => void;
}

export function Profile({ worker, onNavigate }: Readonly<ProfileProps>) {
  const { t } = useLanguage();
  const [data, setData] = useState<LabourProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'deductions' | 'history'>('overview');
  
  // Date tracking for active month filtering
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7)); // YYYY-MM
  
  // Forms state
  const [attendanceForm, setAttendanceForm] = useState({ id: null as string | null, attendance_days: '' });
  const [paymentForm, setPaymentForm] = useState({ id: null as string | null, date: today.toISOString().slice(0, 10), amount: '', mode: 'Cash', notes: '' });
  const [deductionForm, setDeductionForm] = useState({ id: null as string | null, month: selectedMonthStr, year: selectedYearStr, ration_amount: '', pocket_money_amount: '', other_deduction_amount: '', notes: '' });

  useEffect(() => {
    if (worker?.id) fetchProfile();
  }, [worker]);

  const fetchProfile = async () => {
    try {
      const labourRes = await supabase.from('labour').select('*, site(*)').eq('id', worker.id).single();
      const attendanceRes = await supabase.from('attendance').select('*').eq('labour_id', worker.id).order('year', { ascending: false }).order('month', { ascending: false });
      const paymentRes = await supabase.from('payment').select('*').eq('labour_id', worker.id).order('payment_date', { ascending: false });
      const deductionRes = await supabase.from('deduction').select('*').eq('labour_id', worker.id).order('payment_date', { ascending: false });
      
      let monthly_settlementRes: any = { data: [] };
      try {
        monthly_settlementRes = await supabase.from('monthly_settlement').select('*').eq('labour_id', worker.id);
      } catch (err) {
        // Table might not exist yet if Settlement tab wasn't visited
      }

      if (labourRes.data) {
        const labourWithSite = {
          ...labourRes.data,
          site_name: labourRes.data.site ? labourRes.data.site.name : null
        };
        setData({
          labour: labourWithSite,
          attendance: attendanceRes.data || [],
          payments: paymentRes.data || [],
          deductions: deductionRes.data || [],
          monthly_settlement: monthly_settlementRes.data || []
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!worker) return <div className="p-4 text-center mt-10">No worker selected</div>;
  if (!data) return <div className="p-4 text-center mt-10">Loading profile data...</div>;

  const { labour, attendance, payments, deductions, monthly_settlement = [] } = data;

  // Process data based on selectedMonth
  const selectedYearStr = selectedMonth.split('-')[0];
  const selectedMonthStr = selectedMonth.split('-')[1];
  const currentMonthDateStr = `${selectedYearStr}-${selectedMonthStr}-01`;

  // Fetch individual table data for THIS month
  const currentAttendance = attendance.find(a => a.year.toString() === selectedYearStr && a.month.toString().padStart(2, '0') === selectedMonthStr);
  const currentDaysManual = currentAttendance ? Number(currentAttendance.attendance_days) : 0;
  
  const currentPayments = payments.filter(p => p.payment_date.startsWith(selectedMonth));
  const currentDeductions = deductions.filter(d => d.year.toString() === selectedYearStr && d.month.toString().padStart(2, '0') === selectedMonthStr);

  // Fetch compiled Monthly Entry for THIS month (from Settlement section)
  const currentMonthlyEntry = monthly_settlement.find(m => m.month === selectedMonth);

  // Combine manual inputs with bulk monthly entry stats
  const currentDays = currentDaysManual + (currentMonthlyEntry?.attendance_days || 0);

  const totalPaidThisMonth = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0) + (currentMonthlyEntry?.total_payments || 0);
  const totalDeductedThisMonth = currentDeductions.reduce((sum, d) => sum + Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0), 0) + (currentMonthlyEntry?.total_deductions || 0);
  const grossSalaryThisMonth = currentDays * Number(labour.daily_rate);

  // Calculate PREVIOUS due (up to the end of last month)
  // Everything before selectedMonth
  const previousAttendance = attendance.filter(a => {
    const aDate = `${a.year}-${a.month.toString().padStart(2, '0')}-01`;
    return aDate < currentMonthDateStr;
  });
  const previousPayments = payments.filter(p => p.payment_date < currentMonthDateStr);
  const previousDeductions = deductions.filter(d => {
    const dDate = `${d.year}-${d.month.toString().padStart(2, '0')}-01`;
    return dDate < currentMonthDateStr;
  });
  const previousMonthlyEntries = monthly_settlement.filter(m => `${m.month}-01` < currentMonthDateStr);

  const prevGross = previousAttendance.reduce((sum, a) => sum + (Number(a.attendance_days) * Number(labour.daily_rate)), 0) 
    + previousMonthlyEntries.reduce((sum, m) => sum + (Number(m.attendance_days || 0) * Number(m.daily_rate || labour.daily_rate)), 0);
  const prevPaid = previousPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    + previousMonthlyEntries.reduce((sum, m) => sum + Number(m.total_payments || 0), 0);
  const prevDeducted = previousDeductions.reduce((sum, d) => sum + Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0), 0)
    + previousMonthlyEntries.reduce((sum, m) => sum + Number(m.total_deductions || 0), 0);

  const previousDue = prevGross - prevPaid - prevDeducted;
  const currentDue = previousDue + grossSalaryThisMonth - totalPaidThisMonth - totalDeductedThisMonth;

  // Compile history ledger
  const getEntryDate = (createdAt: any, yearStr: string, monthStr: string) => {
    if (createdAt && typeof createdAt === 'string' && createdAt.includes('T')) {
      return createdAt.split('T')[0];
    }
    const y = parseInt(yearStr);
    const m = parseInt(monthStr);
    const today = new Date();
    if (today.getFullYear() === y && today.getMonth() + 1 === m) {
      return today.toISOString().split('T')[0];
    }
    const lastDay = new Date(y, m, 0).getDate();
    return `${y}-${m.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  };

  const getDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const historyItems = [
    ...attendance.map(a => ({ date: getEntryDate(a.created_at, a.year.toString(), a.month.toString()), type: 'Salary (Manual Att.)', amount: Number(a.attendance_days) * Number(labour.daily_rate), debit: 0, credit: Number(a.attendance_days) * Number(labour.daily_rate) })),
    ...payments.map(p => ({ date: p.payment_date, type: `Payment (${p.mode})`, amount: Number(p.amount), debit: Number(p.amount), credit: 0 })),
    ...deductions.map(d => {
      const dTotal = Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0);
      return { date: getEntryDate(null, d.year.toString(), d.month.toString()), type: `Deduction (${d.notes || 'Monthly'})`, amount: dTotal, debit: dTotal, credit: 0 };
    }),
    // Include bulk monthly entries
    ...monthly_settlement.map(m => {
       const [yearStr, monthStr] = m.month.split('-');
       const mCredit = Number(m.attendance_days || 0) * Number(m.daily_rate || labour.daily_rate);
       const mDebit = Number(m.total_payments || 0) + Number(m.total_deductions || 0);
       return { date: getEntryDate(m.created_at, yearStr, monthStr), type: `Settlement Record (${m.month})`, amount: Math.abs(mCredit - mDebit), debit: mDebit, credit: mCredit };
    }).filter(m => m.debit > 0 || m.credit > 0)
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const calculatedHistory = historyItems.map(item => {
    runningBalance += item.credit - item.debit;
    return { ...item, balance: runningBalance };
  }).reverse();

  // Handlers
  const submitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upsert: First check if it exists
      const existing = await supabase.from('attendance').select('id').eq('labour_id', labour.id).eq('year', parseInt(selectedYearStr)).eq('month', selectedMonthStr).single();
      
      let error;
      if (existing.data) {
        const res = await supabase.from('attendance').update({ attendance_days: parseFloat(attendanceForm.attendance_days) }).eq('id', existing.data.id);
        error = res.error;
      } else {
        const res = await supabase.from('attendance').insert([{ 
          labour_id: labour.id, 
          year: parseInt(selectedYearStr), 
          month: selectedMonthStr, 
          attendance_days: parseFloat(attendanceForm.attendance_days) 
        }]);
        error = res.error;
      }

      if (!error) {
        setAttendanceForm({ id: null, attendance_days: '' });
        fetchProfile();
      } else { alert(error.message); }
    } catch (err) { console.error(err); }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        labour_id: labour.id,
        payment_date: paymentForm.date,
        amount: parseFloat(paymentForm.amount),
        mode: paymentForm.mode,
        notes: paymentForm.notes
      };
      
      const { error } = paymentForm.id 
        ? await supabase.from('payment').update(payload).eq('id', paymentForm.id)
        : await supabase.from('payment').insert([payload]);
      
      if (!error) {
        setPaymentForm({ id: null, date: today.toISOString().slice(0, 10), amount: '', mode: 'Cash', notes: '' });
        fetchProfile();
      } else { alert(error.message); }
    } catch (err) { console.error(err); }
  };

  const submitDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upsert based on month and year
      const existing = await supabase.from('deduction').select('id').eq('labour_id', labour.id).eq('year', parseInt(selectedYearStr)).eq('month', parseInt(selectedMonthStr)).single();

      const payload = {
        labour_id: labour.id,
        year: parseInt(selectedYearStr),
        month: parseInt(selectedMonthStr),
        ration_amount: parseFloat(deductionForm.ration_amount) || 0,
        pocket_money_amount: parseFloat(deductionForm.pocket_money_amount) || 0,
        other_deduction_amount: parseFloat(deductionForm.other_deduction_amount) || 0,
        notes: deductionForm.notes
      };

      let error;
      if (existing.data) {
        const res = await supabase.from('deduction').update(payload).eq('id', existing.data.id);
        error = res.error;
      } else {
        const res = await supabase.from('deduction').insert([payload]);
        error = res.error;
      }
      
      if (!error) {
        setDeductionForm({ id: null, month: selectedMonthStr, year: selectedYearStr, ration_amount: '', pocket_money_amount: '', other_deduction_amount: '', notes: '' });
        fetchProfile();
      } else { alert(error.message); }
    } catch (err) { console.error(err); }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.setTextColor(26, 54, 93);
      doc.text(`Ledger (Passbook) - ${labour.name}`, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      
      const head = [['Date', 'Description', 'Debit', 'Credit', 'Balance']];
      
      const body = calculatedHistory.map(h => [
        getDisplayDate(h.date),
        h.type,
        h.debit,
        h.credit,
        h.balance
      ]);

      autoTable(doc, {
        startY: 40,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [20, 155, 142] },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 249, 250] }
      });

      doc.save(`ledger_${labour.name.replace(' ', '_')}.pdf`);
    } catch (err) {
      console.error("PDF Export Error", err);
    }
  };

  const exportExcel = () => {
    const data = calculatedHistory.map(h => ({
      Date: getDisplayDate(h.date),
      Description: h.type,
      Debit: h.debit,
      Credit: h.credit,
      Balance: h.balance
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    XLSX.writeFile(workbook, `ledger_${labour.name.replace(' ', '_')}.xlsx`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-24 space-y-4">
      {/* Header Profile Card */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 flex flex-col gap-4 relative overflow-hidden print-no-break">
        <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-xs font-bold text-white shadow-sm ${labour.status === 'Active' ? 'bg-success' : 'bg-error'}`}>
          {labour.status}
        </div>
        
        <div className="flex gap-4 items-start">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-primary/20 shrink-0 uppercase">
            {labour.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">{labour.name}</h2>
            <div className="text-xs text-on-surface-variant font-medium flex gap-2 items-center mt-1 uppercase tracking-wider">
              <span className="bg-surface-container px-2 py-0.5 rounded border border-outline-variant/50">{labour.id_number || 'NO ID'}</span>
              <span>•</span>
              <span>{labour.site_name || 'Unassigned'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-outline-variant/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Phone className="w-3.5 h-3.5 text-primary" />
            +91 {labour.mobile || "N/A"}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
            <Home className="w-3.5 h-3.5 text-primary" />
            Rate: ₹{labour.daily_rate}/day
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:flex bg-surface-container-low rounded-lg p-1 border border-outline-variant print:hidden gap-1">
        {[
          { id: 'overview', label: 'Dashboard' },
          { id: 'payments', label: 'Payments' },
          { id: 'deductions', label: 'Total Deductions' },
          { id: 'history', label: 'Payroll' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`w-full sm:flex-1 text-center text-[10px] sm:text-xs font-bold py-2 px-1 sm:px-3 rounded-md uppercase tracking-wide ${activeTab === tab.id ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-bright transition-colors'}`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant overflow-hidden print-no-break">
          <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Financial Overview
            </h3>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="text-xs font-bold bg-surface-bright border border-outline-variant rounded p-1 outline-none print:hidden"
            />
          </div>
          
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
             <div className="bg-surface-container-low/50 rounded-md p-3 border border-outline-variant/30 print:border-gray-300">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Previous Due</span>
              <h2 className="text-xl font-bold text-on-surface mt-0.5">₹{previousDue.toLocaleString()}</h2>
            </div>
             <div className="bg-surface-container-low/50 rounded-md p-3 border border-outline-variant/30 print:border-gray-300">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Days Present</span>
              <h2 className="text-xl font-bold text-on-surface mt-0.5">{currentDays} <span className="text-xs text-on-surface-variant">days</span></h2>
            </div>
             <div className="bg-surface-container-low/50 rounded-md p-3 border border-outline-variant/30 print:border-gray-300">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">Gross Salary (This M)</span>
              <h2 className="text-xl font-bold text-primary mt-0.5">₹{grossSalaryThisMonth.toLocaleString()}</h2>
            </div>
             <div className="bg-error/5 rounded-md p-3 border border-error/20 print:border-gray-300">
              <span className="text-[10px] font-bold text-error uppercase tracking-wider block mb-1">Deductions (This M)</span>
              <h2 className="text-xl font-bold text-error mt-0.5">₹{totalDeductedThisMonth.toLocaleString()}</h2>
            </div>
             <div className="bg-success/5 rounded-md p-3 border border-success/20 print:border-gray-300">
              <span className="text-[10px] font-bold text-success uppercase tracking-wider block mb-1">Paid (This M)</span>
              <h2 className="text-xl font-bold text-success mt-0.5">₹{totalPaidThisMonth.toLocaleString()}</h2>
            </div>

            <div className="col-span-2 md:col-span-3 bg-primary/5 rounded-md p-4 border border-primary/20 flex justify-between items-center print:border-gray-400 print:bg-gray-50">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-1">Net Closing Balance</span>
                <p className="text-[10px] text-on-surface-variant font-medium">(Prev Due + Salary - Deductions - Paid)</p>
              </div>
              <div className="text-right">
                <h2 className={`text-3xl font-extrabold tracking-tight ${currentDue > 0 ? 'text-primary' : 'text-success'}`}>
                  ₹{currentDue.toLocaleString()}
                </h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <form className="bg-surface-bright rounded-lg border border-outline-variant p-4 flex flex-col gap-3" onSubmit={submitAttendance}>
             <h3 className="text-sm font-bold border-b border-outline-variant pb-2">Record Manual Attendance</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Selected Month</label>
                 <input type="month" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low font-bold cursor-not-allowed text-on-surface-variant" value={selectedMonth} disabled/>
                 <p className="text-[10px] text-on-surface-variant mt-1.5 font-medium leading-snug">To change the month, use the selector in the Overview tab.</p>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Days Present</label>
                 <input type="number" step="0.5" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={attendanceForm.attendance_days} onChange={e => setAttendanceForm({...attendanceForm, attendance_days: e.target.value})} required/>
               </div>
             </div>
             <button type="submit" className="bg-primary text-white py-2 rounded-md justify-center flex items-center font-bold text-sm gap-2 mt-2">
               <FileText className="w-4 h-4"/> Record Attendance
             </button>
          </form>
          <div className="mt-6 space-y-3">
             <h3 className="text-sm font-bold text-on-surface">Recorded Manual Attendance</h3>
             {attendance.map(a => (
               <div key={a.id} className="bg-surface-bright p-3 rounded-lg border border-outline-variant flex justify-between items-center shadow-sm">
                 <div>
                    <p className="text-xs font-bold text-on-surface">{a.year}-{a.month.toString().padStart(2, '0')}</p>
                 </div>
                 <div className="flex items-center gap-4 text-right">
                    <p className="text-sm font-extrabold text-primary">{Number(a.attendance_days).toFixed(1)} Days</p>
                 </div>
               </div>
             ))}
             {attendance.length === 0 && (
               <div className="p-4 text-center text-on-surface-variant text-xs border border-outline-variant border-dashed rounded-lg bg-surface-bright">
                 No manual attendance recorded.
               </div>
             )}
          </div>
        </div>
      )}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <form className="bg-surface-bright rounded-lg border border-outline-variant p-4 flex flex-col gap-3" onSubmit={submitPayment}>
             <h3 className="text-sm font-bold border-b border-outline-variant pb-2">Record Payment</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Date</label>
                 <input type="date" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} required/>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Amount (₹)</label>
                 <input type="number" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} required/>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Mode</label>
                 <select className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={paymentForm.mode} onChange={e => setPaymentForm({...paymentForm, mode: e.target.value})}>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                 </select>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Notes</label>
                 <input type="text" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={paymentForm.notes} onChange={e => setPaymentForm({...paymentForm, notes: e.target.value})}/>
               </div>
             </div>
             <button type="submit" className="bg-success text-white py-2 rounded-md justify-center flex items-center font-bold text-sm gap-2">
               <IndianRupee className="w-4 h-4"/> {paymentForm.id ? 'Update Payment' : 'Add Payment'}
             </button>
          </form>
          <div className="mt-6 space-y-3">
             <h3 className="text-sm font-bold text-on-surface">Payment History</h3>
             {payments.map(p => (
               <div key={p.id} className="bg-surface-bright p-3 rounded-lg border border-outline-variant flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                 <div>
                    <p className="text-xs font-bold text-on-surface">{getDisplayDate(p.payment_date)}</p>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      <span className="font-bold text-on-surface">{p.mode}</span>
                      {p.notes && ` • ${p.notes}`}
                    </p>
                 </div>
                 <div className="flex items-center gap-4 text-right">
                    <p className="text-sm font-extrabold text-success">₹{Number(p.amount).toLocaleString()}</p>
                    <button 
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setPaymentForm({ id: p.id, date: p.payment_date, amount: p.amount.toString(), mode: p.mode || 'Cash', notes: p.notes || '' });
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-success hover:bg-success/10 rounded-md transition-colors"
                      title="Edit Payment"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                 </div>
               </div>
             ))}
             {payments.length === 0 && (
               <div className="p-4 text-center text-on-surface-variant text-xs border border-outline-variant border-dashed rounded-lg bg-surface-bright">
                 No past payments recorded.
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'deductions' && (
        <div className="space-y-4">
          <form className="bg-surface-bright rounded-lg border border-outline-variant p-4 flex flex-col gap-3" onSubmit={submitDeduction}>
             <h3 className="text-sm font-bold border-b border-outline-variant pb-2">Record Deduction</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Selected Month</label>
                 <input type="month" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low font-bold cursor-not-allowed text-on-surface-variant" value={selectedMonth} disabled/>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Ration (₹)</label>
                 <input type="number" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={deductionForm.ration_amount} onChange={e => setDeductionForm({...deductionForm, ration_amount: e.target.value})}/>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Pocket Money (₹)</label>
                 <input type="number" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={deductionForm.pocket_money_amount} onChange={e => setDeductionForm({...deductionForm, pocket_money_amount: e.target.value})}/>
               </div>
               <div>
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Other (₹)</label>
                 <input type="number" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={deductionForm.other_deduction_amount} onChange={e => setDeductionForm({...deductionForm, other_deduction_amount: e.target.value})}/>
               </div>
               <div className="lg:col-span-4">
                 <label className="text-xs font-bold mb-1 block text-on-surface-variant">Notes</label>
                 <input type="text" className="w-full border border-outline-variant rounded p-2 text-sm bg-surface-container-low focus:border-primary outline-none" value={deductionForm.notes} onChange={e => setDeductionForm({...deductionForm, notes: e.target.value})}/>
               </div>
             </div>
             <button type="submit" className="bg-error text-white py-2 rounded-md justify-center flex items-center font-bold text-sm gap-2">
               <Save className="w-4 h-4"/> {deductionForm.id ? 'Update Deduction' : 'Add Deduction'}
             </button>
          </form>
          <div className="mt-6 space-y-3">
             <h3 className="text-sm font-bold text-on-surface">Deduction History</h3>
             {deductions.map(d => {
               const dTotal = Number(d.ration_amount || 0) + Number(d.pocket_money_amount || 0) + Number(d.other_deduction_amount || 0);
               return (
               <div key={d.id} className="bg-surface-bright p-3 rounded-lg border border-outline-variant flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                 <div>
                    <p className="text-xs font-bold text-on-surface">{d.year}-{d.month.toString().padStart(2, '0')}</p>
                    <p className="text-[11px] text-on-surface-variant font-medium mt-0.5">{d.notes}</p>
                 </div>
                 <div className="flex items-center gap-4 text-right">
                    <p className="text-sm font-extrabold text-error">₹{dTotal.toLocaleString()}</p>
                    <button 
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setDeductionForm({ id: d.id, month: d.month.toString().padStart(2, '0'), year: d.year.toString(), ration_amount: d.ration_amount.toString(), pocket_money_amount: d.pocket_money_amount.toString(), other_deduction_amount: d.other_deduction_amount.toString(), notes: d.notes || '' });
                        setSelectedMonth(`${d.year}-${d.month.toString().padStart(2, '0')}`);
                      }}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-md transition-colors"
                      title="Edit Deduction"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                 </div>
               </div>
             )})}
             {deductions.length === 0 && (
               <div className="p-4 text-center text-on-surface-variant text-xs border border-outline-variant border-dashed rounded-lg bg-surface-bright">
                 No past deductions recorded.
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant overflow-hidden">
          <div className="bg-surface-container-low px-4 py-3 border-b border-outline-variant flex justify-between items-center print:bg-white print:border-black">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-on-surface-variant" /> Ledger (Passbook)
            </h3>
            <div className="flex gap-2 print:hidden">
              <button onClick={exportExcel} className="flex items-center gap-1.5 text-success text-xs font-bold py-1.5 px-3 bg-success/10 rounded-md hover:bg-success/20 transition-colors uppercase tracking-wider">
                <FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL
              </button>
              <button onClick={exportPDF} className="flex items-center gap-1.5 text-primary text-xs font-bold py-1.5 px-3 bg-primary/10 rounded-md hover:bg-primary/20 transition-colors uppercase tracking-wider">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs min-w-[500px]">
              <thead className="bg-surface-container-low/50 border-b-2 border-outline-variant text-[10px] uppercase print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30 w-24 print:border-gray-400">Date</th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30 print:border-gray-400">Description</th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30 text-right w-24 print:border-gray-400">Debit (Dr)<br/><span className="lowercase text-[9px] font-normal">(Payment)</span></th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30 text-right w-24 print:border-gray-400">Credit (Cr)<br/><span className="lowercase text-[9px] font-normal">(Salary)</span></th>
                  <th className="p-3 font-bold text-primary bg-primary/5 text-right w-28 print:bg-gray-100 print:text-black">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-medium text-xs print:divide-gray-400">
                {calculatedHistory.map((txn, idx) => (
                   <tr key={idx} className="hover:bg-surface-container-low transition-colors print:border-b print:border-gray-300">
                    <td className="p-3 border-r border-outline-variant/30 whitespace-nowrap text-on-surface-variant print:border-gray-300">{getDisplayDate(txn.date)}</td>
                    <td className="p-3 border-r border-outline-variant/30 print:border-gray-300">{txn.type}</td>
                    <td className="p-3 border-r border-outline-variant/30 text-right text-error font-bold print:border-gray-300 print:text-black">
                      {txn.debit > 0 ? `₹${txn.debit.toLocaleString()}` : ''}
                    </td>
                    <td className="p-3 border-r border-outline-variant/30 text-right text-success font-bold print:border-gray-300 print:text-black">
                      {txn.credit > 0 ? `₹${txn.credit.toLocaleString()}` : ''}
                    </td>
                    <td className="p-3 text-right bg-primary/5 font-bold print:bg-gray-50 print:text-black">
                      <span className={txn.balance > 0 ? 'text-primary print:text-black' : 'text-success print:text-black'}>
                        ₹{txn.balance.toLocaleString()} {txn.balance > 0 ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                ))}
                {calculatedHistory.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-on-surface-variant text-xs">No records found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
