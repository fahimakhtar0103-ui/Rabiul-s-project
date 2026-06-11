import { useState, useEffect } from 'react';
import { Search, Save, Download, FileSpreadsheet, Lock } from 'lucide-react';

export function Settlement() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettlement();
  }, [selectedMonth]);

  const fetchSettlement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settlement?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) setWorkers(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (workerId: string | number, field: string, value: number) => {
    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, [field]: value } : w));
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settlement/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, workers })
      });
      const data = await res.json();
      if (data.success) {
        alert("Settlement data saved successfully for " + selectedMonth);
        fetchSettlement();
      } else {
        alert("Error saving: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const filteredWorkers = workers.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || w.displayId.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="pb-24 px-4 pt-4 w-full mx-auto space-y-4">
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-on-surface tracking-tight">Monthly Labour Settlement</h2>
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
            <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center bg-surface-container hover:bg-surface-container-high text-on-surface px-4 py-2 border border-outline-variant/50 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs">
              <FileSpreadsheet className="w-4 h-4 text-success" /> Export Excel
            </button>
            <button onClick={handleSave} className="flex-1 md:flex-none justify-center bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs border border-transparent">
              <Save className="w-4 h-4" /> Save All
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

      <div className="bg-surface-bright border border-outline-variant rounded-lg shadow-sm overflow-hidden flex flex-col w-full relative">
        <div className="overflow-x-auto no-scrollbar relative w-full touch-pan-x">
          {loading ? (
             <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Loading data...</div>
          ) : (
             <table className="text-left border-collapse w-full min-w-[1100px]">
               <thead className="bg-surface-container-low border-b-2 border-outline-variant text-[10px] uppercase">
                <tr>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 sticky left-0 bg-surface-container-low z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[160px]">Labour Details</th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 text-right w-24">Prev Due</th>
                  <th className="p-3 font-semibold text-primary border-r border-outline-variant/50 text-center w-28 bg-primary/5">Att. Days</th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 text-right w-24">Daily Rate</th>
                  <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/50 text-right w-24 bg-surface-container-low/50">Gross Salary</th>
                  <th className="p-3 font-semibold text-error border-r border-outline-variant/50 text-center w-56 bg-error/5">
                    Deductions<br/><span className="lowercase text-[9px] font-medium tracking-normal">(Ration, Pocket, Other)</span>
                  </th>
                  <th className="p-3 font-semibold border-r border-outline-variant/50 text-right w-24">Net Salary</th>
                  <th className="p-3 font-semibold text-success border-r border-outline-variant/50 text-center w-32 bg-success/5">Payments Made</th>
                  <th className="p-3 font-bold text-inverse-surface bg-inverse-surface/5 text-right w-28">
                    Net Payable<br/><span className="lowercase text-[9px] font-medium tracking-normal">(Closing Due)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant font-medium text-sm">
                {filteredWorkers.map((w) => {
                  const grossSalary = w.dailyRate * (w.presentDays || 0);
                  const totalDeductions = (w.ration || 0) + (w.pocketMoney || 0) + (w.otherDeductions || 0);
                  const netSalary = grossSalary - totalDeductions;
                  const netPayable = (w.previousDue || 0) + netSalary - (w.paymentsMade || 0);
                  
                  return (
                    <tr key={w.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-3 border-r border-outline-variant/50 sticky left-0 bg-surface-bright group-hover:bg-surface-container-low z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <p className="text-sm font-bold text-on-surface truncate whitespace-nowrap">{w.name}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate mt-0.5 whitespace-nowrap">{w.displayId} • {w.site}</p>
                      </td>
                      
                      <td className="p-3 border-r border-outline-variant/50 text-right text-on-surface-variant whitespace-nowrap">
                        ₹{(w.previousDue || 0).toLocaleString()}
                      </td>
                      
                      <td className="p-2 border-r border-outline-variant/50 text-center align-middle bg-primary/5">
                         <input 
                            type="number" 
                            name="val1"
                            value={w.presentDays === 0 && !w._touched ? '' : w.presentDays}
                            onFocus={() => handleUpdate(w.id, '_touched', 1)}
                            onChange={(e) => handleUpdate(w.id, 'presentDays', parseFloat(e.target.value) || 0)}
                            className="w-14 text-center border p-1 text-sm font-bold bg-surface-bright border-primary/30 rounded focus:border-primary focus:ring-1 focus:ring-primary shadow-inner outline-none transition-all text-primary"
                            step="0.5" min="0" max="31"
                          />
                      </td>
                      
                      <td className="p-3 border-r border-outline-variant/50 text-right text-on-surface-variant whitespace-nowrap">
                        ₹{w.dailyRate}
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
                                  type="number" value={w.pocketMoney || ''} onChange={(e) => handleUpdate(w.id, 'pocketMoney', parseFloat(e.target.value) || 0)}
                                  className="w-[50px] text-center border border-error/30 p-1 text-xs font-bold bg-surface-bright rounded text-error focus:border-error focus:ring-1 focus:ring-error shadow-inner outline-none transition-all"
                                  placeholder="0"
                                />
                                <span className="text-[8px] text-error font-medium uppercase mt-0.5">Pocket</span>
                            </div>

                             <div className="flex flex-col items-center">
                                <input 
                                  title="Other Deductions"
                                  type="number" value={w.otherDeductions || ''} onChange={(e) => handleUpdate(w.id, 'otherDeductions', parseFloat(e.target.value) || 0)}
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
                            type="number" value={w.paymentsMade || ''} onChange={(e) => handleUpdate(w.id, 'paymentsMade', parseFloat(e.target.value) || 0)}
                            className="w-[60px] text-center border border-success/30 p-1 text-sm font-bold bg-surface-bright rounded text-success focus:border-success focus:ring-1 focus:ring-success shadow-inner outline-none mx-auto block transition-all"
                            placeholder="0"
                          />
                      </td>

                      <td className="p-3 border-l-2 border-outline-variant/50 text-right bg-inverse-surface/5 whitespace-nowrap">
                        <div className={`text-base font-extrabold ${netPayable > 0 ? 'text-primary' : 'text-success'}`}>
                          ₹{netPayable.toLocaleString()}
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
    </div>
  );
}
