import { Search, CheckCircle } from 'lucide-react';
import { WORKERS } from '../data';

export function Payroll() {
  return (
    <div className="pb-24 pt-4 px-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-outline-variant pb-2">
        <h2 className="text-xl font-bold text-on-surface uppercase tracking-wide">Monthly Payroll generation</h2>
        <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider">Oct 2023</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded flex flex-col justify-between border-l-4 border-l-secondary">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Total Payroll</span>
          <p className="text-xl font-extrabold text-on-surface tracking-tight mt-1">₹5,52,500</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded flex flex-col justify-between border-l-4 border-l-error">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Total Deductions</span>
          <p className="text-xl font-bold text-error tracking-tight mt-1">₹1,05,000</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded flex flex-col justify-between border-l-4 border-l-tertiary">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Total Paid</span>
          <p className="text-xl font-bold text-tertiary tracking-tight mt-1">₹3,00,000</p>
        </div>
         <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded flex flex-col justify-between border-l-4 border-l-primary shadow-sm shadow-primary/10">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">Total Pending Due</span>
          <p className="text-xl font-extrabold text-primary tracking-tight mt-1">₹1,47,500</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-surface-container-low p-2 rounded border border-outline-variant">
        <div className="relative w-full max-w-sm">
           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
           <input type="text" placeholder="Filter labour..." className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded bg-surface-container-lowest text-xs focus:ring-1 focus:ring-primary outline-none font-bold" />
        </div>
        <button className="bg-primary text-on-primary px-4 py-1.5 text-[11px] uppercase tracking-wider font-bold rounded flex items-center gap-1.5 active:scale-95 ml-2 whitespace-nowrap">
          <CheckCircle className="w-3.5 h-3.5" /> Finalize Payroll
        </button>
      </div>

      {/* Expanded Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
             <thead className="bg-surface-container-lowest border-b-2 border-outline-variant text-[10px] uppercase">
              <tr>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30">Labour</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-center">Att. Days</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right w-20">Rate</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right w-24">Gross Salary</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right text-error w-24">Deductions</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right text-on-surface-variant w-24">Prev. Due</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right text-tertiary w-24">Payments</th>
                <th className="p-3 font-bold text-right text-primary bg-primary/5 w-28">Closing Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60 text-xs">
               {WORKERS.map((worker) => {
                  const gross = worker.dailyRate * worker.presentDays;
                  const netSalary = gross - worker.totalDeductions;
                  const closingDue = worker.previousDue + netSalary - worker.totalPayments;

                  return (
                    <tr key={worker.id} className="hover:bg-primary/5">
                      <td className="p-3 border-r border-outline-variant/30 font-bold text-on-surface">
                        {worker.name}
                        <div className="text-[9px] text-on-surface-variant font-normal uppercase">{worker.type}</div>
                      </td>
                      <td className="p-3 border-r border-outline-variant/30 text-center font-medium bg-surface-container-low/50">{worker.presentDays}</td>
                      <td className="p-3 border-r border-outline-variant/30 text-right">₹{worker.dailyRate}</td>
                      <td className="p-3 border-r border-outline-variant/30 text-right font-bold text-secondary">₹{gross.toLocaleString()}</td>
                      <td className="p-3 border-r border-outline-variant/30 text-right text-error font-medium">-₹{worker.totalDeductions.toLocaleString()}</td>
                      <td className="p-3 border-r border-outline-variant/30 text-right text-on-surface-variant font-medium">₹{worker.previousDue.toLocaleString()}</td>
                      <td className="p-3 border-r border-outline-variant/30 text-right text-tertiary font-medium">₹{worker.totalPayments.toLocaleString()}</td>
                      <td className="p-3 text-right font-extrabold text-primary bg-primary/5">₹{closingDue.toLocaleString()}</td>
                    </tr>
                  );
               })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
