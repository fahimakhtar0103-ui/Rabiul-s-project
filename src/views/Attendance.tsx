import { Search, Save } from 'lucide-react';
import { WORKERS } from '../data';

export function Attendance() {
  return (
    <div className="pb-24 px-4 pt-4 max-w-5xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-2 border-b border-outline-variant pb-3">
        <div>
          <h2 className="text-xl font-bold text-on-surface uppercase tracking-wide">Monthly Attendance</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded uppercase tracking-wider">March 2024</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-primary hover:bg-primary-container text-on-primary px-4 py-1.5 rounded font-bold flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 text-xs uppercase tracking-wider shrink-0">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-2 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Search labour..." 
            className="w-full pl-8 pr-3 py-1.5 border border-outline-variant rounded bg-surface-container-lowest focus:ring-1 focus:ring-primary focus:border-primary outline-none text-xs font-medium" 
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead className="bg-surface-container-lowest border-b-2 border-outline-variant text-[10px] uppercase">
              <tr>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30">Labour Name</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-center w-36">Attendance Days</th>
                <th className="p-3 font-bold text-on-surface-variant border-r border-outline-variant/30 text-right w-24">Daily Rate</th>
                <th className="p-3 font-bold text-on-surface-variant text-right bg-primary/5 text-primary w-32">Salary Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {WORKERS.map((worker) => (
                <tr key={worker.id} className="hover:bg-primary/5 transition-colors group">
                  <td className="p-3 border-r border-outline-variant/30">
                    <p className="text-xs font-bold text-on-surface">{worker.name}</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider mt-0.5">{worker.displayId} • {worker.type}</p>
                  </td>
                  <td className="p-3 border-r border-outline-variant/30 text-center">
                    <input 
                      type="number" 
                      defaultValue={worker.presentDays}
                      className="w-20 text-center border border-outline-variant rounded p-1 text-sm font-bold bg-surface-container-lowest focus:border-primary focus:ring-1 outline-none"
                      step="0.5"
                      min="0"
                      max="31"
                    />
                  </td>
                  <td className="p-3 border-r border-outline-variant/30 text-right text-sm font-medium">
                    ₹{worker.dailyRate}
                  </td>
                  <td className="p-3 text-right text-sm font-bold text-secondary bg-primary/5">
                    ₹{(worker.presentDays * worker.dailyRate).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
