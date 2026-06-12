import { useState, useEffect } from 'react';
import { Search, Save, Download, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

export function Settlement() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{saving: boolean, message: string, type: 'success' | 'error' | null}>({ saving: false, message: '', type: null });

  useEffect(() => {
    fetchSettlement();
  }, [selectedMonth]);

  const fetchSettlement = async () => {
    setLoading(true);
    setDbError(false);
    setSaveStatus({ saving: false, message: '', type: null });
    
    try {
      const laboursRes = await supabase.from('labour').select('*, site(*)').eq('is_archived', false).order('id', { ascending: false });
      if (laboursRes.error) {
        console.error("Labour fetch error:", laboursRes.error);
        alert("Error fetching labours: " + laboursRes.error.message);
        throw laboursRes.error;
      }
      
      const labours = laboursRes.data || [];
      
      const entriesRes = await supabase.from('monthly_entries').select('*').eq('month', selectedMonth);
      
      if (entriesRes.error) {
        if (entriesRes.error.code === '42P01' || entriesRes.error.code === 'PGRST205') {
          // Table doesn't exist
          setDbError(true);
          setLoading(false);
          return;
        }
        throw entriesRes.error;
      }
      
      const entries = entriesRes.data || [];

      const settlementData = labours.map((labour: any) => {
        const entry = entries.find(e => e.labourId === labour.id) || {};
        
        return {
          id: labour.id,
          name: labour.name,
          displayId: labour.idNumber || 'NO ID',
          site: labour.site ? labour.site.name : 'Unassigned',
          dailyRate: entry.daily_rate !== undefined ? Number(entry.daily_rate) : Number(labour.dailyRate),
          attendance_days: entry.attendance_days || 0,
          ration: entry.ration || 0,
          pocket_money: entry.pocket_money || 0,
          other_deduction: entry.other_deduction || 0,
          payments_made: entry.payments_made || 0,
          _entryId: entry.id || null
        };
      });

      setWorkers(settlementData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (workerId: string | number, field: string, value: number) => {
    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, [field]: value } : w));
  };

  const exportExcel = () => {
    try {
      const data = workers.map((w: any) => {
        const grossSalary = w.dailyRate * (w.attendance_days || 0);
        const totalDeductions = (w.ration || 0) + (w.pocket_money || 0) + (w.other_deduction || 0);
        const netSalary = grossSalary - totalDeductions;
        const closingDue = netSalary - (w.payments_made || 0);
        
        return {
          'ID': w.displayId,
          'Name': w.name,
          'Site': w.site,
          'Daily Rate': w.dailyRate,
          'Att. Days': w.attendance_days || 0,
          'Gross Salary': grossSalary,
          'Ration': w.ration || 0,
          'Pocket Money': w.pocket_money || 0,
          'Other Deductions': w.other_deduction || 0,
          'Net Salary': netSalary,
          'Payments Made': w.payments_made || 0,
          'Closing Due': closingDue
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Settlement");
      XLSX.writeFile(workbook, `monthly_settlement_${selectedMonth}.xlsx`);
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const handleSave = async () => {
    if (dbError) return;
    setSaveStatus({ saving: true, message: 'Saving entries...', type: null });
    
    try {
      for (const w of workers) {
        const grossSalary = Number(w.dailyRate) * Number(w.attendance_days);
        const totalDeductions = Number(w.ration) + Number(w.pocket_money) + Number(w.other_deduction);
        const netSalary = grossSalary - totalDeductions;
        
        const payload = {
          labourId: w.id,
          month: selectedMonth,
          attendance_days: w.attendance_days,
          daily_rate: w.dailyRate,
          ration: w.ration,
          pocket_money: w.pocket_money,
          other_deduction: w.other_deduction,
          gross_salary: grossSalary,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          payments_made: w.payments_made
        };

        if (w._entryId) {
          await supabase.from('monthly_entries').update(payload).eq('id', w._entryId);
        } else {
          // If all default 0, skip insert to save space unless explicitly populated? 
          // We can just insert it
          const { data } = await supabase.from('monthly_entries').insert([payload]).select().single();
          if (data) w._entryId = data.id;
        }
      }

      setSaveStatus({ saving: false, message: 'Settlement saved successfully.', type: 'success' });
      // Clear success message after 3 seconds
      setTimeout(() => setSaveStatus({ saving: false, message: '', type: null }), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus({ saving: false, message: 'Database error while saving.', type: 'error' });
    }
  };

  const filteredWorkers = workers.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.displayId.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="pb-24 px-4 pt-4 w-full mx-auto space-y-4">
      {dbError && (
        <div className="bg-error/10 border border-error/50 rounded-lg p-4 text-sm text-error mb-4">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertTriangle className="w-5 h-5" /> Action Required: Database Table Missing
          </div>
          <p className="mb-2">The <strong>monthly_entries</strong> table does not exist. Please run the following SQL command in your Supabase Dashboard SQL editor:</p>
          <pre className="bg-surface-bright border border-error/20 p-3 rounded text-xs overflow-x-auto selection:bg-error/20">
{`CREATE TABLE monthly_entries (
  id SERIAL PRIMARY KEY,
  "labourId" INTEGER REFERENCES labour(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  attendance_days NUMERIC(10, 2) DEFAULT 0,
  daily_rate NUMERIC(10, 2) DEFAULT 0,
  ration NUMERIC(10, 2) DEFAULT 0,
  pocket_money NUMERIC(10, 2) DEFAULT 0,
  other_deduction NUMERIC(10, 2) DEFAULT 0,
  gross_salary NUMERIC(10, 2) DEFAULT 0,
  total_deductions NUMERIC(10, 2) DEFAULT 0,
  net_salary NUMERIC(10, 2) DEFAULT 0,
  payments_made NUMERIC(10, 2) DEFAULT 0,
  UNIQUE("labourId", month)
);`}
          </pre>
          <button onClick={fetchSettlement} className="mt-3 bg-error text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-error/90">
            I have created the table. Retry.
          </button>
        </div>
      )}

      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface tracking-tight">Monthly Settlement</h2>
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                className="text-xs font-bold bg-surface-container border border-outline-variant rounded p-1 outline-none"
              />
              <span className="text-xs text-on-surface-variant font-medium">• Bulk record operations</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {saveStatus.message && (
              <span className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded ${saveStatus.type === 'success' ? 'bg-success/10 text-success' : saveStatus.type === 'error' ? 'bg-error/10 text-error' : 'text-on-surface-variant'}`}>
                 {saveStatus.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
                 {saveStatus.message}
              </span>
            )}
            <button onClick={exportExcel} className="flex-1 md:flex-none justify-center bg-surface-container hover:bg-surface-container-high text-on-surface px-4 py-2 border border-outline-variant/50 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs" disabled={dbError || saveStatus.saving}>
              <FileSpreadsheet className="w-4 h-4 text-success" /> Export Excel
            </button>
            <button onClick={handleSave} className="flex-1 md:flex-none justify-center bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs border border-transparent disabled:opacity-50" disabled={dbError || saveStatus.saving || loading}>
              <Save className="w-4 h-4" /> {saveStatus.saving ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search labour by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-medium transition-all" 
          />
        </div>
      </div>

      {!dbError && (
        <>
          {/* Desktop Spreadsheet View */}
          <div className="hidden xl:flex bg-surface-bright border border-outline-variant rounded-lg shadow-sm overflow-hidden flex-col w-full relative">
            <div className="overflow-x-auto custom-scrollbar relative w-full touch-pan-x">
              {loading ? (
                 <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Loading data...</div>
              ) : (
                 <table className="text-left border-collapse w-full min-w-[1100px]">
                   <thead className="bg-surface-container-low border-b-2 border-outline-variant text-[10px] uppercase">
                    <tr>
                      <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 sticky left-0 bg-surface-container-low z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[160px]">Labour Details</th>
                      <th className="p-3 font-semibold text-primary border-r border-outline-variant/50 text-center w-28 bg-primary/5">Att. Days</th>
                      <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 text-right w-24">Daily Rate</th>
                      <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 text-right w-24 bg-surface-container-low/50">Gross Salary</th>
                      <th className="p-3 font-semibold text-error border-r border-outline-variant/50 text-center w-56 bg-error/5">
                        Deductions<br/><span className="lowercase text-[9px] font-medium tracking-normal">(Ration, Pocket, Other)</span>
                      </th>
                      <th className="p-3 font-semibold border-r border-outline-variant/50 text-right w-24">Net Salary</th>
                      <th className="p-3 font-semibold text-success border-r border-outline-variant/50 text-center w-32 bg-success/5">Payments</th>
                      <th className="p-3 font-bold text-inverse-surface bg-inverse-surface/5 text-right w-28">Closing Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant font-medium text-sm">
                    {filteredWorkers.map((w) => {
                      const grossSalary = w.dailyRate * (w.attendance_days || 0);
                      const totalDeductions = (w.ration || 0) + (w.pocket_money || 0) + (w.other_deduction || 0);
                      const netSalary = grossSalary - totalDeductions;
                      const closingDue = netSalary - (w.payments_made || 0);
                      
                      return (
                        <tr key={w.id} className="hover:bg-surface-container-low transition-colors group">
                          <td className="p-3 border-r border-outline-variant/50 sticky left-0 bg-surface-bright group-hover:bg-surface-container-low z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                            <p className="text-sm font-bold text-on-surface truncate whitespace-nowrap">{w.name}</p>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate mt-0.5 whitespace-nowrap">{w.displayId} • {w.site}</p>
                          </td>
                          
                          <td className="p-2 border-r border-outline-variant/50 text-center align-middle bg-primary/5">
                             <input 
                                type="number" 
                                value={w.attendance_days === 0 && !w._touched ? '' : w.attendance_days}
                                onFocus={() => handleUpdate(w.id, '_touched', 1)}
                                onChange={(e) => handleUpdate(w.id, 'attendance_days', parseFloat(e.target.value) || 0)}
                                className="w-14 text-center border p-1 text-sm font-bold bg-surface-bright border-primary/30 rounded focus:border-primary focus:ring-1 focus:ring-primary shadow-inner outline-none transition-all text-primary"
                                step="0.5" min="0" max="31"
                              />
                          </td>
                          
                          <td className="p-3 border-r border-outline-variant/50 text-right align-middle">
                            <input 
                                type="number" 
                                value={w.dailyRate}
                                onChange={(e) => handleUpdate(w.id, 'dailyRate', parseFloat(e.target.value) || 0)}
                                className="w-16 text-right border p-1 border-outline-variant/30 text-xs font-bold bg-surface-bright rounded focus:border-on-surface focus:ring-1 focus:ring-on-surface shadow-inner outline-none transition-all"
                              />
                          </td>
  
                          <td className="p-3 border-r border-outline-variant/50 text-right font-bold text-on-surface bg-surface-container-low/50 whitespace-nowrap">
                            ₹{grossSalary.toLocaleString()}
                          </td>
                          
                          <td className="p-2 border-r border-outline-variant/50 text-center align-middle bg-error/5">
                              <div className="flex gap-1 justify-center">
                                <div className="flex flex-col items-center">
                                   <input 
                                      title="Ration"
                                      type="number" value={w.ration || ''} onChange={(e) => handleUpdate(w.id, 'ration', parseFloat(e.target.value) || 0)}
                                      className="w-[50px] text-center border border-error/30 p-1 text-xs font-bold bg-surface-bright rounded text-error focus:border-error focus:ring-1 focus:ring-error shadow-inner outline-none transition-all"
                                      placeholder="0"
                                    />
                                    <span className="text-[8px] text-error font-medium uppercase mt-0.5">Ration</span>
                                </div>
                                
                                <div className="flex flex-col items-center">
                                    <input 
                                      title="Pocket Money"
                                      type="number" value={w.pocket_money || ''} onChange={(e) => handleUpdate(w.id, 'pocket_money', parseFloat(e.target.value) || 0)}
                                      className="w-[50px] text-center border border-error/30 p-1 text-xs font-bold bg-surface-bright rounded text-error focus:border-error focus:ring-1 focus:ring-error shadow-inner outline-none transition-all"
                                      placeholder="0"
                                    />
                                    <span className="text-[8px] text-error font-medium uppercase mt-0.5">Pocket</span>
                                </div>
  
                                 <div className="flex flex-col items-center">
                                    <input 
                                      title="Other Deductions"
                                      type="number" value={w.other_deduction || ''} onChange={(e) => handleUpdate(w.id, 'other_deduction', parseFloat(e.target.value) || 0)}
                                      className="w-[50px] text-center border border-error/30 p-1 text-xs font-bold bg-surface-bright rounded text-error focus:border-error focus:ring-1 focus:ring-error shadow-inner outline-none transition-all"
                                      placeholder="0"
                                    />
                                    <span className="text-[8px] text-error font-medium uppercase mt-0.5">Other</span>
                                 </div>
                              </div>
                          </td>
  
                          <td className="p-3 border-r border-outline-variant/50 text-right font-bold text-on-surface whitespace-nowrap">
                            ₹{netSalary.toLocaleString()}
                          </td>
  
                          <td className="p-2 border-r border-outline-variant/50 text-center align-middle bg-success/5">
                              <input 
                                title="Payments Made (Advances + Final)"
                                type="number" value={w.payments_made || ''} onChange={(e) => handleUpdate(w.id, 'payments_made', parseFloat(e.target.value) || 0)}
                                className="w-[60px] text-center border border-success/30 p-1 text-sm font-bold bg-surface-bright rounded text-success focus:border-success focus:ring-1 focus:ring-success shadow-inner outline-none mx-auto block transition-all"
                                placeholder="0"
                              />
                          </td>
  
                          <td className="p-3 border-l-2 border-outline-variant/50 text-right bg-inverse-surface/5 whitespace-nowrap">
                            <div className={`text-base font-extrabold ${closingDue > 0 ? 'text-primary' : closingDue < 0 ? 'text-error' : 'text-success'}`}>
                              ₹{closingDue.toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="flex xl:hidden flex-col gap-4">
             {loading ? (
                <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Loading data...</div>
             ) : (
                filteredWorkers.map(w => {
                  const grossSalary = w.dailyRate * (w.attendance_days || 0);
                  const totalDeductions = (w.ration || 0) + (w.pocket_money || 0) + (w.other_deduction || 0);
                  const netSalary = grossSalary - totalDeductions;
                  const closingDue = netSalary - (w.payments_made || 0);
              
                  return (
                    <div key={w.id} className="bg-surface-bright border border-outline-variant rounded-xl p-4 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                      <div className="flex justify-between items-start border-b border-outline-variant/50 pb-3">
                        <div className="max-w-[60%]">
                          <p className="text-base font-bold text-on-surface truncate">{w.name}</p>
                          <p className="text-xs text-on-surface-variant font-medium mt-1 truncate">{w.displayId} • {w.site}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Closing Due</p>
                          <div className={`text-lg font-black ${closingDue > 0 ? 'text-primary' : closingDue < 0 ? 'text-error' : 'text-success'}`}>
                            ₹{closingDue.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-primary/5 p-2.5 rounded-lg border border-primary/10">
                          <label className="block text-[10px] text-primary uppercase font-bold mb-1.5">Att. Days</label>
                          <input 
                            type="number" 
                            value={w.attendance_days === 0 && !w._touched ? '' : w.attendance_days}
                            onFocus={() => handleUpdate(w.id, '_touched', 1)}
                            onChange={(e) => handleUpdate(w.id, 'attendance_days', parseFloat(e.target.value) || 0)}
                            className="w-full bg-surface-bright border border-primary/20 p-2 rounded-md text-sm font-bold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                            step="0.5" min="0" max="31"
                          />
                        </div>
                        <div className="bg-surface-container-low p-2.5 rounded-lg border border-outline-variant/50">
                          <label className="block text-[10px] text-on-surface-variant uppercase font-bold mb-1.5">Daily Rate</label>
                          <input 
                            type="number" 
                            value={w.dailyRate}
                            onChange={(e) => handleUpdate(w.id, 'dailyRate', parseFloat(e.target.value) || 0)}
                            className="w-full bg-surface-bright border border-outline-variant/30 p-2 rounded-md text-sm font-bold outline-none focus:border-on-surface focus:ring-1 focus:ring-on-surface shadow-sm"
                          />
                        </div>
                      </div>
              
                      <div className="bg-error/5 p-3 rounded-lg border border-error/10">
                         <label className="block text-[10px] text-error uppercase font-bold mb-2">Deductions</label>
                         <div className="grid grid-cols-3 gap-2">
                           <div>
                             <input type="number" placeholder="0" value={w.ration || ''} onChange={(e) => handleUpdate(w.id, 'ration', parseFloat(e.target.value) || 0)} className="w-full text-center bg-surface-bright border border-error/20 p-2 rounded-md text-xs font-bold text-error outline-none focus:border-error focus:ring-1 focus:ring-error shadow-sm" />
                             <span className="block text-[9px] text-error font-medium uppercase mt-1.5 text-center">Ration</span>
                           </div>
                           <div>
                             <input type="number" placeholder="0" value={w.pocket_money || ''} onChange={(e) => handleUpdate(w.id, 'pocket_money', parseFloat(e.target.value) || 0)} className="w-full text-center bg-surface-bright border border-error/20 p-2 rounded-md text-xs font-bold text-error outline-none focus:border-error focus:ring-1 focus:ring-error shadow-sm" />
                             <span className="block text-[9px] text-error font-medium uppercase mt-1.5 text-center">Pocket</span>
                           </div>
                           <div>
                             <input type="number" placeholder="0" value={w.other_deduction || ''} onChange={(e) => handleUpdate(w.id, 'other_deduction', parseFloat(e.target.value) || 0)} className="w-full text-center bg-surface-bright border border-error/20 p-2 rounded-md text-xs font-bold text-error outline-none focus:border-error focus:ring-1 focus:ring-error shadow-sm" />
                             <span className="block text-[9px] text-error font-medium uppercase mt-1.5 text-center">Other</span>
                           </div>
                         </div>
                      </div>
              
                      <div className="flex gap-3 items-end">
                         <div className="bg-success/5 p-2.5 rounded-lg border border-success/10 flex-1">
                           <label className="block text-[10px] text-success uppercase font-bold mb-1.5">Payments Made</label>
                           <input type="number" placeholder="0" value={w.payments_made || ''} onChange={(e) => handleUpdate(w.id, 'payments_made', parseFloat(e.target.value) || 0)} className="w-full bg-surface-bright border border-success/20 p-2 rounded-md text-sm font-bold text-success outline-none focus:border-success focus:ring-1 focus:ring-success shadow-sm" />
                         </div>
                         
                         <div className="text-right p-2 border-l border-outline-variant/30 pl-3">
                           <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Net Salary</p>
                           <p className="text-lg font-black text-on-surface leading-none">₹{netSalary.toLocaleString()}</p>
                           <p className="text-[10px] text-on-surface-variant mt-1">Gross: ₹{grossSalary.toLocaleString()}</p>
                         </div>
                      </div>
              
                    </div>
                  );
                })
             )}
          </div>
        </>
      )}
    </div>
  );
}
