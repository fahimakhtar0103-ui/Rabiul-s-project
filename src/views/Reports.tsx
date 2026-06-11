import { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, Users, Coins, Building2, Calendar, FileSpreadsheet, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Reports() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7)); // YYYY-MM
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = selectedMonth.split('-')[1];

      // Get basic stats
      const laboursRes = await supabase.from('labour').select('id', { count: 'exact' }).eq('is_archived', false);
      const totalLabours = laboursRes.count || 0;

      const activeLaboursRes = await supabase.from('attendance').select('labourId', { count: 'exact', head: true }).eq('year', year).eq('month', month).gt('days', 0);
      const activeLabours = activeLaboursRes.count || 0;

      const paymentsRes = await supabase.from('payment').select('amount').like('point_date', `${selectedMonth}%`);
      const totalPayments = (paymentsRes.data || []).reduce((sum, p) => sum + Number(p.amount), 0);

      const deductionsRes = await supabase.from('deduction').select('amount').like('point_date', `${selectedMonth}%`);
      const totalDeductions = (deductionsRes.data || []).reduce((sum, d) => sum + Number(d.amount), 0);

      const sitesRes = await supabase.from('site').select('*');
      const activeLaboursDataRes = await supabase.from('labour').select('id, siteId').eq('is_archived', false);
      
      const siteSummaries = (sitesRes.data || []).map(site => {
        const count = (activeLaboursDataRes.data || []).filter(l => l.siteId === site.id).length;
        return {
          id: site.id,
          name: site.name,
          labourCount: count
        };
      });

      setData({
        totalLabours,
        activeLabours,
        totalPayments,
        totalDeductions,
        siteSummaries
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const year = parseInt(selectedMonth.split('-')[0]);
      const month = selectedMonth.split('-')[1];
      const currentMonthDateStr = `${year}-${month}-01`;

      const laboursRes = await supabase.from('labour').select('*, site(*)').eq('is_archived', false).order('id', { ascending: false });
      const attendanceRes = await supabase.from('attendance').select('*');
      const paymentRes = await supabase.from('payment').select('*');
      const deductionRes = await supabase.from('deduction').select('*');

      const labours = laboursRes.data || [];
      const workers = labours.map((labour: any) => {
        // Current month
        const currentAttendance = (attendanceRes.data || []).find(a => a.labourId === labour.id && a.year === year && a.month.toString().padStart(2, '0') === month);
        const currentDays = currentAttendance ? Number(currentAttendance.days) : 0;
        
        const currentPayments = (paymentRes.data || []).filter(p => p.labourId === labour.id && p.point_date.toString().startsWith(selectedMonth));
        const currentDeductions = (deductionRes.data || []).filter(d => d.labourId === labour.id && d.point_date.toString().startsWith(selectedMonth));

        const paymentsMade = currentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        
        let ration = 0, pocketMoney = 0, otherDeductions = 0;
        currentDeductions.forEach(d => {
          const reason = (d.reason || '').toLowerCase();
          if (reason.includes('ration')) ration += Number(d.amount);
          else if (reason.includes('pocket')) pocketMoney += Number(d.amount);
          else otherDeductions += Number(d.amount);
        });

        // Previous due
        const prevAttendance = (attendanceRes.data || []).filter(a => {
          const aDate = `${a.year}-${a.month.toString().padStart(2, '0')}-01`;
          return aDate < currentMonthDateStr;
        });
        const prevPayments = (paymentRes.data || []).filter(p => p.point_date.toString() < currentMonthDateStr && p.labourId === labour.id);
        const prevDeductions = (deductionRes.data || []).filter(d => d.point_date.toString() < currentMonthDateStr && d.labourId === labour.id);

        const myPrevAttendance = prevAttendance.filter(a => a.labourId === labour.id);
        const prevGross = myPrevAttendance.reduce((sum, a) => sum + (Number(a.days) * Number(labour.dailyRate)), 0);
        const prevPaid = prevPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const prevDeducted = prevDeductions.reduce((sum, d) => sum + Number(d.amount), 0);

        const previousDue = prevGross - prevPaid - prevDeducted;

        return {
          id: labour.id,
          name: labour.name,
          displayId: labour.idNumber || 'NO ID',
          site: labour.site ? labour.site.name : 'Unassigned',
          dailyRate: Number(labour.dailyRate),
          previousDue,
          presentDays: currentDays,
          ration,
          pocketMoney,
          otherDeductions,
          paymentsMade
        };
      });

      const headers = ['ID', 'Name', 'Site', 'Daily Rate', 'Prev Due', 'Att. Days', 'Gross Salary', 'Ration', 'Pocket Money', 'Other Deductions', 'Net Salary', 'Payments Made', 'Closing Due'];
      
      const rows = workers.map((w: any) => {
        const grossSalary = w.dailyRate * (w.presentDays || 0);
        const totalDeductions = (w.ration || 0) + (w.pocketMoney || 0) + (w.otherDeductions || 0);
        const netSalary = grossSalary - totalDeductions;
        const netPayable = (w.previousDue || 0) + netSalary - (w.paymentsMade || 0);
        
        return [
          w.displayId,
          w.name,
          w.site,
          w.dailyRate,
          w.previousDue,
          w.presentDays || 0,
          grossSalary,
          w.ration || 0,
          w.pocketMoney || 0,
          w.otherDeductions || 0,
          netSalary,
          w.paymentsMade || 0,
          netPayable
        ].join(',');
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `monthly_report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error("Export error", err);
    }
  };

  return (
    <div className="pb-32 px-4 pt-4 w-full mx-auto space-y-6 print:pb-0 print:space-y-4">
      {/* Header section */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-none print:shadow-none print:p-0">
        <div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight print:text-2xl">Executive Reports</h2>
          <p className="text-xs text-on-surface-variant font-medium mt-1 print:text-black">
            Financial & Operational Summary - <span className="font-bold print:inline">{selectedMonth}</span>
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 print:hidden">
           <div className="flex items-center gap-2">
             <Calendar className="w-4 h-4 text-on-surface-variant" />
             <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)} 
                className="text-sm font-bold bg-surface-container border border-outline-variant rounded p-1.5 focus:border-primary outline-none"
              />
           </div>
           
           <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
             <button onClick={exportCSV} className="flex-1 md:flex-none justify-center bg-surface-container hover:bg-surface-container-high text-on-surface px-3 py-1.5 border border-outline-variant/50 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs">
               <FileSpreadsheet className="w-4 h-4 text-success" /> Excel
             </button>
             <button onClick={() => window.print()} className="flex-1 md:flex-none justify-center bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md font-semibold flex items-center gap-2 shadow-sm transition-all text-xs border border-transparent">
               <Download className="w-4 h-4" /> PDF
             </button>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Loading report data...</div>
      ) : data ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-bright border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block">Total Registered Labours</span>
                 <Users className="w-4 h-4 text-primary opacity-70" />
              </div>
              <h3 className="text-2xl font-black text-on-surface">{data.totalLabours}</h3>
            </div>
            
            <div className="bg-surface-bright border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide block">Active This Month</span>
                 <Users className="w-4 h-4 text-secondary opacity-70" />
              </div>
              <h3 className="text-2xl font-black text-on-surface">{data.activeLabours} <span className="text-xs text-on-surface-variant font-medium lowercase">({Math.round((data.activeLabours/data.totalLabours)*100 || 0)}%)</span></h3>
            </div>

            <div className="bg-success/5 border border-success/20 rounded-lg p-4 shadow-sm flex flex-col justify-between">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold text-success uppercase tracking-wide block">Total Payments</span>
                 <Coins className="w-4 h-4 text-success opacity-70" />
              </div>
              <h3 className="text-2xl font-black text-success">₹{(data.totalPayments || 0).toLocaleString()}</h3>
            </div>

             <div className="bg-error/5 border border-error/20 rounded-lg p-4 shadow-sm flex flex-col justify-between">
               <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] font-bold text-error uppercase tracking-wide block">Total Deductions</span>
                 <TrendingDown className="w-4 h-4 text-error opacity-70" />
              </div>
              <h3 className="text-2xl font-black text-error">₹{(data.totalDeductions || 0).toLocaleString()}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Site Summary Panel */}
            <div className="bg-surface-bright rounded-lg border border-outline-variant shadow-sm overflow-hidden flex flex-col">
               <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                 <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                   <Building2 className="w-4 h-4 text-on-surface-variant" /> Operation Sites
                 </h3>
               </div>
               
               <div className="p-4 space-y-4 flex-grow">
                 {data.siteSummaries && data.siteSummaries.length > 0 ? (
                   data.siteSummaries.map((site: any) => (
                      <div key={site.id} className="flex items-center justify-between p-3 border border-outline-variant/50 rounded-lg bg-surface-container-low/30">
                        <div>
                           <p className="text-sm font-bold text-on-surface">{site.name}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-primary">{site.labourCount} Labours</p>
                        </div>
                      </div>
                   ))
                 ) : (
                   <p className="text-xs text-on-surface-variant text-center my-8">No active sites found.</p>
                 )}
               </div>
            </div>

             {/* Charts Panel Placeholder for now, can display visual indicators */}
             <div className="bg-surface-bright rounded-lg border border-outline-variant shadow-sm overflow-hidden flex flex-col">
               <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
                 <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                   <BarChart3 className="w-4 h-4 text-on-surface-variant" /> Financial Flow
                 </h3>
               </div>
               
               <div className="p-4 flex-grow flex items-center justify-center flex-col gap-6">
                 <div className="w-48 h-48 rounded-full border-[16px] border-surface-container flex items-center justify-center relative overflow-hidden" style={{
                    borderTopColor: '#34d399', // success
                    borderRightColor: '#f87171', // error
                    borderBottomColor: '#f87171', 
                    borderLeftColor: '#34d399',
                    transform: 'rotate(-45deg)'
                 }}>
                   <div style={{transform: 'rotate(45deg)'}} className="text-center">
                     <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wide">Net Flow</p>
                   </div>
                 </div>
                 
                 <div className="flex gap-6 text-sm font-bold">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-success"></div>
                       <span>Payments</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-error"></div>
                       <span>Deductions</span>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-8 text-center text-sm font-medium text-on-surface-variant">Failed to load data.</div>
      )}
    </div>
  );
}
