import { useState, useEffect } from 'react';
import { AlertCircle, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../lib/LanguageContext';

export function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState({
    totalLabours: 0,
    currentPayroll: 0,
    pendingDues: 0,
    attendancePercent: '0%',
    sitesSummary: [] as any[],
    pendingLabours: [] as any[],
    activities: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  // current month for dashboard
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonth = prevMonthDate.toISOString().slice(0, 7);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active labours and sites
      const currentYear = today.getFullYear();
      const currentMonthInt = today.getMonth() + 1;
      
      const { data: labours } = await supabase.from('labour').select('*, site(name)').eq('is_archived', false);
      const { data: sites } = await supabase.from('site').select('*');
      
      // 2. Fetch payments, deductions, attendance for calculating dues
      const { data: payments } = await supabase.from('payment').select('*');
      const { data: deductions } = await supabase.from('deduction').select('*');
      const { data: attendance } = await supabase.from('attendance').select('*');
      const { data: monthly_settlement } = await supabase.from('monthly_settlement').select('*');

      // Process Stats
      let currentPayroll = 0;
      let totalPendingDues = 0;
      
      const siteMap: Record<number, any> = {};
      sites?.forEach(s => {
        siteMap[s.id] = { id: s.id, name: s.name, labourCount: 0, monthlyPayroll: 0, pendingDue: 0 };
      });

      const processedLabours = (labours || []).map(labour => {
        const labAtt = attendance?.filter(a => a.labour_id === labour.id) || [];
        const labPay = payments?.filter(p => p.labour_id === labour.id) || [];
        const labDed = deductions?.filter(d => d.labour_id === labour.id) || [];
        const labEntries = monthly_settlement?.filter(m => m.labour_id === labour.id) || [];

        // Total gross
        const manualGross = labAtt.reduce((sum, a) => sum + (Number(a.attendance_days) * Number(labour.daily_rate)), 0);
        const monthlyGross = labEntries.reduce((sum, m) => sum + (Number(m.attendance_days || 0) * Number(m.daily_rate || labour.daily_rate)), 0);
        
        // Total payments
        const manualPaid = labPay.reduce((sum, p) => sum + Number(p.amount), 0);
        const monthlyPaid = labEntries.reduce((sum, m) => sum + Number(m.total_payments || 0), 0);
        
        // Total deductions
        const manualDed = labDed.reduce((sum, d) => sum + Number(d.amount), 0);
        const monthlyDed = labEntries.reduce((sum, m) => sum + Number(m.total_deductions || 0), 0);
        
        const totalGross = manualGross + monthlyGross;
        const totalPaid = manualPaid + monthlyPaid;
        const totalDeducted = manualDed + monthlyDed;
        
        const netSalary = totalGross - totalDeducted;
        const currentDue = netSalary - totalPaid;

        // Current month payroll just based on attendance in this month (estimate)
        const currMonthManualAtt = labAtt.find(a => a.year === currentYear && a.month === currentMonthInt);
        const currMonthEntry = labEntries.find(m => m.month === currentMonthInt && m.year === currentYear);
        const currDays = (currMonthManualAtt ? Number(currMonthManualAtt.attendance_days || 0) : 0) + (currMonthEntry ? Number(currMonthEntry.attendance_days || 0) : 0);
        const currPayroll = currDays * Number(labour.daily_rate);

        currentPayroll += currPayroll;
        totalPendingDues += currentDue;

        if (labour.site_id && siteMap[labour.site_id]) {
           siteMap[labour.site_id].labourCount += 1;
           siteMap[labour.site_id].monthlyPayroll += currPayroll;
           siteMap[labour.site_id].pendingDue += currentDue;
        }

        return {
          id: labour.id,
          name: labour.name,
          site: labour.site?.name || 'Unassigned',
          currentDue
        };
      });

      const pendingDuesList = processedLabours.filter(l => l.currentDue > 0).sort((a, b) => b.currentDue - a.currentDue).slice(0, 10);
      const sitesSummary = Object.values(siteMap).filter(s => s.labourCount > 0);
      
      // Calculate Attendance % (Rough estimate: active labours / total days in month)
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      let totalPossibleDays = (labours?.length || 0) * daysInMonth;
      let totalActualDays = processedLabours.reduce((acc, l) => {
        const att = attendance?.find(a => a.labour_id === l.id && a.year === currentYear && a.month === currentMonthInt);
        const ent = monthly_settlement?.find(m => m.labour_id === l.id && m.month === currentMonthInt && m.year === currentYear);
        return acc + (att ? Number(att.attendance_days || 0) : 0) + (ent ? Number(ent.attendance_days || 0) : 0);
      }, 0);
      const attPercent = totalPossibleDays > 0 ? Math.round((totalActualDays / totalPossibleDays) * 100) : 0;

      // Construct a feed from latest payments and deductions
      const allActivities = [
        ...(payments || []).map(p => ({
          id: `p-${p.id}`,
          title: `Payment to Labour #${p.labour_id}`,
          description: `₹${p.amount} paid via ${p.mode} (${p.notes || ''})`,
          date: p.payment_date,
          time: new Date(p.created_at || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        })),
        ...(deductions || []).map(d => ({
          id: `d-${d.id}`,
          title: `Deduction for Labour #${d.labour_id}`,
          description: `₹${d.amount} deducted for ${d.notes}`,
          date: d.payment_date,
          time: new Date(d.created_at || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);

      setData({
        totalLabours: labours?.length || 0,
        currentPayroll,
        pendingDues: totalPendingDues,
        attendancePercent: `${attPercent}%`,
        sitesSummary,
        pendingLabours: pendingDuesList,
        activities: allActivities
      });

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full pb-32 px-4 pt-4 max-w-7xl mx-auto space-y-6 flex flex-col h-full">
      {/* Top Section */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4 shrink-0 mt-4">
        <h2 className="text-xl font-bold text-on-surface mb-4 tracking-tight flex items-center justify-between">
          <span>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} {t('Dashboard')}</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/50">Active Period</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-container-low/50 border border-outline-variant/50 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-secondary">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">{t('Current Payroll')}</span>
            <span className="text-xl font-extrabold text-on-surface tracking-tight mt-1">₹{data.currentPayroll.toLocaleString()}</span>
          </div>
          <div className="bg-error/5 border border-error/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-error">
            <span className="text-[10px] font-bold text-error uppercase tracking-wide">{t('Pending Due')}</span>
            <span className="text-xl font-bold text-error mt-1">₹{data.pendingDues.toLocaleString()}</span>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-primary">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">{t('Total Labour')}</span>
            <span className="text-xl font-bold text-on-surface mt-1">{data.totalLabours}</span>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-success">
            <span className="text-[10px] font-bold text-success uppercase tracking-wide">Attendance Ratio</span>
            <span className="text-xl font-bold text-success mt-1">{data.attendancePercent}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-8 flex flex-col gap-6 h-full p-1">
          {/* Site Summary Table */}
          <section className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant flex flex-col min-h-[50%] max-h-[50%] shrink-0">
            <div className="p-4 border-b border-outline-variant/50 flex-shrink-0">
              <h3 className="text-sm font-bold text-on-surface flex items-center justify-between">
                <span>{t('Sites')} Summary</span>
                <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">{data.sitesSummary.length} {t('Sites')}</span>
              </h3>
            </div>
            <div className="overflow-y-auto">
               <div className="overflow-x-auto">
                 {data.sitesSummary.length > 0 ? (
                 <table className="w-full text-left border-collapse sm:min-w-[500px]">
                    <thead className="bg-surface-container-low/50 border-b border-outline-variant text-[10px] uppercase sticky top-0 z-10">
                      <tr>
                        <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30">{t('Site Name')}</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-center border-r border-outline-variant/30">{t('Total Labour')}</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-right border-r border-outline-variant/30">{t('Payroll')}</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-right">{t('Pending Due')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60 text-sm">
                      {data.sitesSummary.map(site => (
                        <tr key={site.id} className="hover:bg-surface-container-low transition-colors cursor-pointer">
                          <td className="p-3 font-bold text-on-surface border-r border-outline-variant/30">{site.name}</td>
                          <td className="p-3 text-center border-r border-outline-variant/30">{site.labourCount}</td>
                          <td className="p-3 text-right font-medium border-r border-outline-variant/30">₹{site.monthlyPayroll.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-error">₹{site.pendingDue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
                 ) : (
                    <div className="text-center p-8 text-on-surface-variant text-sm font-medium">No sites or labours active</div>
                 )}
               </div>
            </div>
          </section>

          {/* Payroll Due Alert Panel */}
          <section className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant flex flex-col flex-1 shrink-0 min-h-0">
            <div className="p-4 border-b border-error/20 flex-shrink-0 bg-error/5">
              <h3 className="text-sm font-bold text-error flex items-center gap-1.5 uppercase tracking-wide">
                <AlertCircle className="w-4 h-4" /> High Priority: {t('Pending Due')} 
              </h3>
            </div>
             <div className="overflow-y-auto">
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  {data.pendingLabours.length > 0 ? (
                  <table className="w-full text-left border-collapse sm:min-w-[400px]">
                      <tbody className="divide-y divide-error/10 text-sm">
                        {data.pendingLabours.map(w => (
                          <tr key={w.id} className="hover:bg-error/5 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-on-surface">{w.name}</span>
                              <span className="text-[10px] text-on-surface-variant ml-2 block sm:inline font-medium">{w.site}</span>
                            </td>
                            <td className="p-3 text-right font-extrabold text-error">₹{w.currentDue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                  ) : (
                     <div className="text-center p-8 text-on-surface-variant text-sm font-medium">No pending dues across active labours</div>
                  )}
                </div>
             </div>
          </section>
        </div>

        {/* Recent Activity */}
        <aside className="lg:col-span-4 h-full p-1 pb-4">
           <section className="bg-surface-bright border border-outline-variant rounded-lg shadow-sm flex flex-col h-[calc(100vh-250px)] max-h-full">
            <div className="p-4 border-b border-outline-variant flex-shrink-0">
               <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                 <History className="text-on-surface-variant w-4 h-4" /> Ledger Feed
               </h3>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {data.activities.length > 0 ? (
                data.activities.map(activity => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-secondary flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-on-surface tracking-tight">{activity.title}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-0.5">{activity.description}</p>
                      <p className="text-[9px] text-outline mt-1.5 font-bold uppercase tracking-wider">{activity.date ? new Date(activity.date).toLocaleDateString('en-GB') : ''} {activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="text-center p-4 text-on-surface-variant text-xs">No recent ledger activities.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
