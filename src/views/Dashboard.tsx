import { AlertCircle, History } from 'lucide-react';
import { SITES, ACTIVITIES, WORKERS } from '../data';

export function Dashboard() {
  const pendingLabours = WORKERS.map(w => {
    const totalDeductions = w.ration + w.pocketMoney + w.otherDeductions;
    const netSalary = (w.dailyRate * w.presentDays) - totalDeductions;
    const currentDue = w.previousDue + netSalary - w.paymentsMade;
    return { ...w, currentDue };
  }).filter(w => w.currentDue > 0);

  return (
    <div className="pb-32 px-4 pt-4 max-w-7xl mx-auto space-y-6">
      {/* Top Section */}
      <div className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
        <h2 className="text-xl font-bold text-on-surface mb-4 tracking-tight flex items-center justify-between">
          <span>March 2024 Overview</span>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/50">Active Period</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface-container-low/50 border border-outline-variant/50 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-secondary">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Current Payroll</span>
            <span className="text-xl font-extrabold text-on-surface tracking-tight mt-1">₹4,82,500</span>
          </div>
          <div className="bg-error/5 border border-error/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-error">
            <span className="text-[10px] font-bold text-error uppercase tracking-wide">Pending Dues</span>
            <span className="text-xl font-bold text-error mt-1">₹78,250</span>
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-primary">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Total Labour</span>
            <span className="text-xl font-bold text-on-surface mt-1">84</span>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-md p-3 flex flex-col justify-between border-l-4 border-l-success">
            <span className="text-[10px] font-bold text-success uppercase tracking-wide">Attendance %</span>
            <span className="text-xl font-bold text-success mt-1">94%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Site Summary Table */}
          <section className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
            <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center justify-between">
              <span>Site Summary</span>
              <span className="text-[10px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant uppercase tracking-wider">{SITES.length} Sites</span>
            </h3>
            <div className="border border-outline-variant rounded-md overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                 <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead className="bg-surface-container-low/50 border-b border-outline-variant text-[10px] uppercase">
                      <tr>
                        <th className="p-3 font-semibold text-on-surface-variant border-r border-outline-variant/30">Site Name</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-center border-r border-outline-variant/30">Labour</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-right border-r border-outline-variant/30">Payroll</th>
                        <th className="p-3 font-semibold text-on-surface-variant text-right">Pending Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/60 text-sm">
                      {SITES.map(site => (
                        <tr key={site.id} className="hover:bg-surface-container-low transition-colors cursor-pointer">
                          <td className="p-3 font-bold text-on-surface border-r border-outline-variant/30">{site.name}</td>
                          <td className="p-3 text-center border-r border-outline-variant/30">{site.labourCount}</td>
                          <td className="p-3 text-right font-medium border-r border-outline-variant/30">₹{site.monthlyPayroll.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold text-error">₹{site.pendingDue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </section>

          {/* Payroll Due Alert Panel */}
          <section className="bg-surface-bright rounded-lg shadow-sm border border-outline-variant p-4">
            <h3 className="text-sm font-bold text-error mb-3 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="w-4 h-4" /> High Priority: Pending Dues 
            </h3>
             <div className="bg-error/5 border border-error/20 rounded-md overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[400px]">
                      <tbody className="divide-y divide-error/20 text-sm">
                        {pendingLabours.map(w => (
                          <tr key={w.id} className="hover:bg-error/10 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-on-surface">{w.name}</span>
                              <span className="text-[10px] text-on-surface-variant ml-2 block sm:inline font-medium">{w.site}</span>
                            </td>
                            <td className="p-3 text-right font-extrabold text-error">₹{w.currentDue.toLocaleString()}</td>
                            <td className="p-3 text-right w-24">
                              <button className="bg-primary hover:bg-primary-container hover:text-on-primary-container text-white text-xs px-4 py-1.5 font-bold rounded-md active:scale-95 transition-all shadow-sm">Pay</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                </div>
             </div>
          </section>
        </div>

        {/* Recent Activity */}
        <aside className="lg:col-span-4">
           <section className="bg-surface-bright border border-outline-variant rounded-lg shadow-sm p-4 h-full">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant">
               <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                 <History className="text-on-surface-variant w-4 h-4" /> Ledger Feed
               </h3>
            </div>
            <div className="space-y-4">
              {ACTIVITIES.map(activity => (
                <div key={activity.id} className="flex gap-3">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-secondary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-on-surface tracking-tight">{activity.title}</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">{activity.description}</p>
                    <p className="text-[9px] text-outline mt-1.5 font-bold uppercase tracking-wider">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
